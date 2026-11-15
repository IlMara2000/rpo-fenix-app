import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("ogni pagina ha un percorso pubblico che riporta alla pagina giusta", async () => {
  const { pagePaths, pathForPage, pageForPath } = await loadModule("../src/crm/routes.ts");

  assert.ok(Object.keys(pagePaths).length > 50, "la mappa delle pagine è popolata");

  for (const [pageKey, path] of Object.entries(pagePaths)) {
    assert.equal(pathForPage(pageKey), path);
    // Due pagine possono condividere un percorso: conta che porti a una di loro.
    const resolved = pageForPath(path);
    assert.ok(resolved, `nessuna pagina per ${path}`);
    assert.equal(pagePaths[resolved], path);
  }

  assert.equal(pageForPath("/censimento/nominativi"), "censimento-contatti");
  assert.equal(pageForPath("/censimento/nominativi/"), "censimento-contatti", "slash finale ignorato");
  assert.equal(pageForPath("/Censimento/Nominativi"), "censimento-contatti", "maiuscole ignorate");
  assert.equal(pageForPath("/pagina-inesistente"), null);
  assert.equal(pageForPath("/"), null);
  assert.equal(pathForPage("chiave-inesistente"), "/workspace");
});

test("Vercel serve il gestionale anche sui deep link, senza coprire API e asset", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const rewrites = config.rewrites ?? [];

  assert.equal(rewrites.length, 1, "un solo rewrite, invece di un elenco da tenere aggiornato");
  const [fallback] = rewrites;
  assert.equal(fallback.destination, "/index.html");

  const pattern = new RegExp(`^${fallback.source}$`);
  for (const path of ["/censimento/nominativi", "/impostazioni/aree-geografiche", "/crm", "/login"]) {
    assert.ok(pattern.test(path), `il rewrite deve coprire ${path}`);
  }
  for (const path of ["/api/client-context", "/assets/index.js"]) {
    assert.ok(!pattern.test(path), `il rewrite non deve coprire ${path}`);
  }
});
