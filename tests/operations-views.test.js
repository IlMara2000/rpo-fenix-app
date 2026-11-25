import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function loadViews() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const result = await build({
    stdin: {
      contents: `
        import { createElement } from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import { AcquisitionView, DealsView, LeasesView } from "./src/crm/operationsViews.tsx";
        globalThis.renderAcquisition = (data) => renderToStaticMarkup(createElement(AcquisitionView, { pageKey: "acquisizione-nuovo", query: "", data, onCommit: () => {}, onAction: () => {}, onOpenModule: () => {} }));
        globalThis.renderDeals = (data) => renderToStaticMarkup(createElement(DealsView, { pageKey: "trattative-nuova", query: "", data, onCommit: () => {}, onAction: () => {}, onOpenModule: () => {} }));
        globalThis.renderLeases = (data) => renderToStaticMarkup(createElement(LeasesView, { pageKey: "locazioni-nuova", query: "", data, onCommit: () => {}, onAction: () => {}, onOpenModule: () => {} }));
      `,
      resolveDir: root,
      loader: "tsx",
    },
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

await loadViews();

function baseData() {
  return {
    properties: [
      { id: "property-1", code: "FS-001", title: "Via Roma 10", zone: "Centro", status: "In gestione", price: "250000", owner: "Mario Rossi", portals: "Bozza", kind: "vendita", details: { municipality: "Milano", street: "Via Roma", streetNumber: "10" }, updatedAt: "2026-11-24" },
      { id: "property-2", code: "FS-002", title: "Via Roma 10", zone: "Centro", status: "In gestione", price: "300000", owner: "Luca Verdi", portals: "Bozza", kind: "vendita", details: { municipality: "Roma", street: "Via Roma", streetNumber: "10" }, updatedAt: "2026-11-24" },
    ],
    requests: [],
    contacts: [
      { id: "contact-1", name: "Mario Rossi", type: "Acquirente", status: "Attivo", source: "", owner: "", phone: "", note: "", nextStep: "", updatedAt: "2026-11-24" },
      { id: "contact-2", name: "Mario Rossi", type: "Acquirente", status: "Attivo", source: "", owner: "", phone: "", note: "", nextStep: "", updatedAt: "2026-11-24" },
    ],
    activities: [],
    marketingChannels: [],
    censusAreas: [],
    censusStreets: [],
    censusComplexes: [],
    goals: [],
    activityLog: [],
    offices: [
      { id: "office-1", name: "Sede", city: "Milano", address: "Via A 1", phone: "", manager: "", color: "#ff675d", active: "Si", updatedAt: "2026-11-24" },
      { id: "office-2", name: "Sede", city: "Roma", address: "Via B 2", phone: "", manager: "", color: "#ff675d", active: "Si", updatedAt: "2026-11-24" },
    ],
    mandates: [],
    deals: [],
    leases: [],
    operationsModel: 1,
  };
}

test("acquisizione: il select immobile e sede portano gli id", () => {
  const html = globalThis.renderAcquisition(baseData());
  assert.match(html, /value="property-1"/);
  assert.match(html, /value="property-2"/);
  assert.match(html, /value="office-1"/);
  assert.match(html, /value="office-2"/);
});

test("trattative: il select immobile, sede e contatti portano gli id", () => {
  const html = globalThis.renderDeals(baseData());
  assert.match(html, /value="property-1"/);
  assert.match(html, /value="property-2"/);
  assert.match(html, /value="office-1"/);
  assert.match(html, /value="office-2"/);
  assert.match(html, /value="contact-1"/);
  assert.match(html, /value="contact-2"/);
});

function dealRecord(overrides = {}) {
  return {
    id: "deal-1",
    propertyId: "property-1",
    clientName: "Cliente",
    type: "Vendita",
    stage: "Proposta",
    offerAmount: "250000",
    deposit: "",
    proposalDate: "2026-11-01",
    expiryDate: "2026-11-15",
    closingDate: "",
    commission: "3%",
    agent: "",
    officeId: "office-1",
    notes: "",
    stageChangedAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-24",
    ...overrides,
  };
}

test("trattative: di default la tabella mostra solo quelle aperte", () => {
  const data = baseData();
  data.deals = [
    dealRecord({ id: "deal-open", clientName: "Cliente in corso" }),
    dealRecord({ id: "deal-won", clientName: "Cliente con rogito", stage: "Chiusa", closingPrice: "250000" }),
    dealRecord({ id: "deal-lost", clientName: "Cliente perso", stage: "Persa" }),
  ];

  const html = globalThis.renderDeals(data);

  assert.match(html, /Cliente in corso/);
  assert.doesNotMatch(html, /Cliente con rogito/, "le chiuse non stanno tra le aperte");
  assert.doesNotMatch(html, /Cliente perso/, "le perse non stanno tra le aperte");
});

test("trattative: la richiesta collegata si sceglie per id e solo se e' aperta", () => {
  const data = baseData();
  data.requests = [
    { id: "request-1", client: "Giulia Neri", target: "Trilocale", area: "", match: "", proposal: "", status: "Trattativa", updatedAt: "2026-11-24" },
    { id: "request-2", client: "Paolo Bianchi", target: "Bilocale", area: "", match: "", proposal: "", status: "Chiusa", updatedAt: "2026-11-24" },
  ];

  const html = globalThis.renderDeals(data);

  assert.match(html, /name="request"/);
  assert.match(html, /value="request-1"/);
  assert.doesNotMatch(html, /value="request-2"/, "una richiesta chiusa non si propone piu'");
});

test("locazioni: il select immobile e sede portano gli id", () => {
  const html = globalThis.renderLeases(baseData());
  assert.match(html, /value="property-1"/);
  assert.match(html, /value="property-2"/);
  assert.match(html, /value="office-1"/);
  assert.match(html, /value="office-2"/);
});

test("locazioni: l'inquilino e' un contatto scelto per id, cosi' due omonimi restano distinti", () => {
  const html = globalThis.renderLeases(baseData());
  assert.match(html, /name="tenantContact"/);
  assert.match(html, /value="contact-1"/);
  assert.match(html, /value="contact-2"/);
});
