import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("censimento sites: CercaOra and Datagma inside the page, Sister in a tab, Whuis a plain link", async () => {
  const { censimentoSites, findCensimentoSite } = await loadModule("../src/censimento/sites.ts");

  assert.equal(censimentoSites.length, 6);
  const byId = Object.fromEntries(censimentoSites.map((site) => [site.id, site]));

  assert.equal(byId.whuis.mode, "external");
  assert.match(byId.whuis.url, /^https:\/\//);

  // Questi due accettano di girare dentro una pagina: si aprono nel gestionale.
  for (const id of ["cercaora", "datagma"]) {
    assert.equal(byId[id].mode, "embed");
    assert.match(byId[id].url, /^https:\/\//);
  }

  assert.deepEqual(
    censimentoSites.map((site) => site.mode).sort(),
    ["embed", "embed", "external", "interno", "interno", "tab"],
  );

  // Sister richiede l'accesso dell'operatore: scheda vera, pannello Cyborg qui.
  assert.equal(byId.sister.mode, "tab");
  assert.match(byId.sister.url, /^https:\/\/sister\.agenziaentrate\.gov\.it\//);

  assert.equal(byId.cyborg.mode, "interno");
  assert.equal(byId.mappa.mode, "interno");
  assert.equal(byId.mappa.url, "");
  assert.equal(censimentoSites.filter((site) => !site.url).length, 2);

  assert.equal(findCensimentoSite("whuis")?.mode, "external");
  assert.equal(findCensimentoSite("inesistente"), undefined);
});
