import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Il select del form condiviso deve restituire il valore, non l'etichetta:
 * due immobili con lo stesso titolo devono restare due scelte distinte.
 */
async function loadForm() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const result = await build({
    stdin: {
      contents: `
        import { createElement } from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import { StructuredQuickForm } from "./src/crm/components/StructuredQuickForm.tsx";
        globalThis.renderForm = (options) => renderToStaticMarkup(
          createElement(StructuredQuickForm, {
            submitLabel: "Salva",
            sections: [{
              title: "Prova",
              fields: [{ name: "property", label: "Immobile", type: "select", required: true, options }],
            }],
            onSubmit: () => {},
          }),
        );
      `,
      resolveDir: root,
      loader: "tsx",
    },
    // Il modulo compilato gira da data URL: senza un require vero i pacchetti
    // CommonJS (react-dom/server) non riescono a caricare i builtin di Node.
    banner: {
      js: `import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(`${root}/package.json`)});`,
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

await loadForm();

test("il select usa l'id come valore: due immobili con lo stesso titolo restano distinti", () => {
  const html = globalThis.renderForm([
    { value: "property-1", label: "Via Roma 10" },
    { value: "property-2", label: "Via Roma 10" },
  ]);

  assert.match(html, /value="property-1"[^>]*>Via Roma 10</);
  assert.match(html, /value="property-2"[^>]*>Via Roma 10</);
});

test("il select accetta ancora le opzioni come stringhe semplici", () => {
  const html = globalThis.renderForm(["Vendita", "Locazione"]);

  assert.match(html, /value="Vendita"[^>]*>Vendita</);
  assert.match(html, /value="Locazione"[^>]*>Locazione</);
});
