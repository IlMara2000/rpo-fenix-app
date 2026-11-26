import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function loadMatrix() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const result = await build({
    stdin: {
      contents: `
        import { portalSites, portalOutcome, portalTotals, publishOnEverySite } from "./src/crm/portalMatrix.ts";
        globalThis.portalSites = portalSites;
        globalThis.portalOutcome = portalOutcome;
        globalThis.portalTotals = portalTotals;
        globalThis.publishOnEverySite = publishOnEverySite;
      `,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2020",
    write: false,
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

await loadMatrix();

function property(overrides = {}) {
  return {
    id: "property-1",
    code: "FS-001",
    title: "Via Roma 10",
    portals: "Bozza",
    updatedAt: "2026-11-24",
    ...overrides,
  };
}

test("matrice portali: un invio copre tutti i siti e il conteggio lo dice", () => {
  const published = globalThis.publishOnEverySite(property(), "2026-11-26");
  const fresh = property({ details: published.details, portals: published.portals });

  assert.equal(published.portals, `${globalThis.portalSites.length}/${globalThis.portalSites.length}`);
  assert.deepEqual(
    globalThis.portalSites.map((site) => globalThis.portalOutcome(fresh, site)),
    globalThis.portalSites.map(() => "Pubblicato"),
  );
  assert.deepEqual(globalThis.portalTotals(fresh), {
    published: globalThis.portalSites.length,
    stale: 0,
    total: globalThis.portalSites.length,
  });
});

test("matrice portali: se la scheda cambia dopo l'invio il sito va aggiornato", () => {
  const published = globalThis.publishOnEverySite(property(), "2026-11-20");
  const edited = property({ details: published.details, updatedAt: "2026-11-25" });

  assert.equal(globalThis.portalOutcome(edited, globalThis.portalSites[0]), "Da aggiornare");
  assert.equal(globalThis.portalTotals(edited).stale, globalThis.portalSites.length);
  assert.equal(globalThis.portalTotals(edited).published, 0);
});

test("matrice portali: con timestamp completo conta il giorno, non la lunghezza", () => {
  const published = globalThis.publishOnEverySite(property(), "2026-11-25");
  const sameDay = property({ details: published.details, updatedAt: "2026-11-25T18:42:00.000Z" });
  const nextDay = property({ details: published.details, updatedAt: "2026-11-26T00:01:00.000Z" });

  assert.equal(
    globalThis.portalOutcome(sameDay, globalThis.portalSites[0]),
    "Pubblicato",
    "una modifica nello stesso giorno dell'invio non rende la scheda da aggiornare",
  );
  assert.equal(globalThis.portalOutcome(nextDay, globalThis.portalSites[0]), "Da aggiornare");
  assert.equal(globalThis.portalTotals(sameDay).stale, 0);
});

test("matrice portali: anche l'invio puo' avere un timestamp completo", () => {
  const published = globalThis.publishOnEverySite(property(), "2026-11-25T18:00:00.000Z");
  const edited = property({ details: published.details, updatedAt: "2026-11-26T07:30:00.000Z" });
  const sameDay = property({ details: published.details, updatedAt: "2026-11-25T23:59:00.000Z" });

  assert.equal(globalThis.portalOutcome(sameDay, globalThis.portalSites[1]), "Pubblicato");
  assert.equal(globalThis.portalOutcome(edited, globalThis.portalSites[1]), "Da aggiornare");
});

test("matrice portali: senza invii nessun sito risulta pubblicato", () => {
  const empty = property();

  assert.deepEqual(
    globalThis.portalSites.map((site) => globalThis.portalOutcome(empty, site)),
    globalThis.portalSites.map(() => "—"),
  );
  assert.deepEqual(globalThis.portalTotals(empty), { published: 0, stale: 0, total: globalThis.portalSites.length });
});

test("matrice portali: un invio non cancella gli altri dati della scheda", () => {
  const withDetails = property({ details: { energyClass: "A2", publishWebsite: "Si" } });
  const published = globalThis.publishOnEverySite(withDetails, "2026-11-26");

  assert.equal(published.details.energyClass, "A2");
  assert.equal(published.details.publishWebsite, "Si");
  assert.equal(published.details["portal.immobiliare.state"], "Pubblicato");
});
