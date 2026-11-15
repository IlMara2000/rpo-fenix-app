import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("censimento sites: every working site opens in the same in-page box", async () => {
  const { censimentoSites, findCensimentoSite } = await loadModule("../src/censimento/sites.ts");

  assert.equal(censimentoSites.length, 6);
  const byId = Object.fromEntries(censimentoSites.map((site) => [site.id, site]));

  assert.equal(byId.whuis.mode, "external");
  assert.match(byId.whuis.url, /^https:\/\//);

  // CercaOra e Datagma girano nel riquadro della pagina.
  for (const id of ["cercaora", "datagma"]) {
    assert.equal(byId[id].mode, "embed");
    assert.match(byId[id].url, /^https:\/\//);
  }

  // CercaOra resta sulla home del sito: le pagine /app/ si aprono bianche in
  // un riquadro, quindi l'accesso si fa da lì con ACCEDI.
  assert.equal(byId.cercaora.url, "https://cercaora.online/");

  assert.deepEqual(
    censimentoSites.map((site) => site.mode).sort(),
    ["embed", "embed", "embed", "external", "interno", "interno"],
  );

  // Sister sta nello stesso riquadro, con la colonna del pannello Cyborg; il
  // portale dell'Agenzia vieta di incorniciarla, e il riquadro lo dice.
  assert.equal(byId.sister.mode, "embed");
  assert.equal(byId.sister.frameBlocked, true);
  assert.equal(byId.sister.sidePanel, "cyborg");
  assert.match(byId.sister.url, /^https:\/\/sister\.agenziaentrate\.gov\.it\//);

  assert.equal(byId.cyborg.mode, "interno");
  assert.equal(byId.mappa.mode, "interno");
  assert.equal(byId.mappa.url, "");
  assert.equal(censimentoSites.filter((site) => !site.url).length, 2);

  assert.equal(findCensimentoSite("whuis")?.mode, "external");
  assert.equal(findCensimentoSite("inesistente"), undefined);
});
