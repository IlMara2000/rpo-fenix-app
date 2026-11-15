import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("censimento sites never replace the workspace: Sister in a tab with Cyborg, the others in separate tabs", async () => {
  const { censimentoSites, findCensimentoSite } = await loadModule("../src/censimento/sites.ts");

  assert.equal(censimentoSites.length, 6);
  const byId = Object.fromEntries(censimentoSites.map((site) => [site.id, site]));

  assert.equal(byId.whuis.mode, "external");
  assert.match(byId.whuis.url, /^https:\/\//);

  for (const id of ["cercaora", "datagma", "whuis"]) {
    assert.equal(byId[id].mode, "external");
    assert.match(byId[id].url, /^https:\/\//);
  }

  // Nessuno strumento si apre dentro l'area di lavoro: il gestionale resta.
  assert.deepEqual(
    censimentoSites.map((site) => site.mode).sort(),
    ["external", "external", "external", "interno", "interno", "tab"],
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
