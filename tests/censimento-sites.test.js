import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("censimento sites embed only the embeddable ones and open Whuis in a tab", async () => {
  const { censimentoSites, findCensimentoSite } = await loadModule("../src/censimento/sites.ts");

  assert.equal(censimentoSites.length, 6);
  const byId = Object.fromEntries(censimentoSites.map((site) => [site.id, site]));

  assert.equal(byId.whuis.mode, "external");
  assert.match(byId.whuis.url, /^https:\/\//);

  for (const id of ["sister", "cercaora", "datagma"]) {
    assert.equal(byId[id].mode, "embed");
    assert.match(byId[id].url, /^https:\/\//);
  }

  assert.equal(byId.cyborg.mode, "interno");
  assert.equal(byId.mappa.mode, "interno");
  assert.equal(byId.mappa.url, "");
  assert.equal(censimentoSites.filter((site) => !site.url).length, 2);

  assert.equal(findCensimentoSite("whuis")?.mode, "external");
  assert.equal(findCensimentoSite("inesistente"), undefined);
});
