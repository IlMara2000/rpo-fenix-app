import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Migrazione e motore dei prossimi passi vivono in due moduli collegati:
 * qui si compilano insieme (esbuild), cosi' il test usa il codice vero.
 */
async function loadOperations() {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../src/crm/operations.ts", import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2020",
    write: false,
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const { migrateOperationsData, buildNextActions, previewOperationsMigration } = await loadOperations();
const TODAY = new Date(2026, 10, 24);

function emptyData() {
  return {
    properties: [],
    requests: [],
    contacts: [],
    activities: [],
    marketingChannels: [],
    censusAreas: [],
    censusStreets: [],
    censusComplexes: [],
    goals: [],
    activityLog: [],
    offices: [],
    mandates: [],
    deals: [],
    leases: [],
    operationsModel: 0,
  };
}

function makeProperty(overrides = {}) {
  return {
    id: "property-1",
    code: "FS-001",
    title: "Via Roma 10",
    zone: "Centro",
    status: "In gestione",
    price: "250000",
    owner: "Mario Rossi",
    portals: "Bozza",
    kind: "vendita",
    details: {},
    updatedAt: "2026-11-24",
    ...overrides,
  };
}

test("migrazione: un archivio vuoto crea solo la sede predefinita", () => {
  const result = migrateOperationsData(emptyData(), TODAY);

  assert.equal(result.changed, true);
  assert.equal(result.data.operationsModel, 1);
  assert.equal(result.data.offices.length, 1);
  assert.equal(result.data.offices[0].id, "office-sede-principale");
  assert.equal(result.report.ownerContacts, 0);
  assert.equal(result.report.mandates, 0);
  assert.equal(result.report.leases, 0);
  assert.equal(result.report.deals, 0);
});

test("migrazione: crea il proprietario, lo collega all'immobile e ricostruisce l'incarico", () => {
  const data = emptyData();
  data.properties = [
    makeProperty({
      details: {
        mandateType: "Esclusiva",
        mandateStartDate: "2026-01-01",
        mandateEndDate: "2027-01-01",
        assignedAgent: "Daniele",
      },
    }),
  ];

  const { data: migrated, report } = migrateOperationsData(data, TODAY);

  assert.equal(report.ownerContacts, 1);
  assert.equal(migrated.contacts.length, 1);
  assert.equal(migrated.contacts[0].name, "Mario Rossi");
  assert.equal(migrated.properties[0].ownerContactId, migrated.contacts[0].id);
  assert.deepEqual(report.linkedProperties, ["FS-001 · Via Roma 10"]);

  assert.equal(migrated.mandates.length, 1);
  const mandate = migrated.mandates[0];
  assert.equal(mandate.propertyId, "property-1");
  assert.equal(mandate.type, "Vendita");
  assert.equal(mandate.exclusivity, "Esclusiva");
  assert.equal(mandate.endDate, "2027-01-01");
  assert.equal(mandate.status, "Attivo");
  assert.equal(mandate.officeId, "office-sede-principale");
});

test("migrazione: senza dati di mandato non inventa un incarico e lo segnala", () => {
  const data = emptyData();
  data.properties = [makeProperty({ status: "Notizia", details: {} })];

  const { data: migrated, report } = migrateOperationsData(data, TODAY);

  assert.equal(migrated.mandates.length, 0);
  assert.ok(report.notes.some((note) => /Nessun incarico ricostruito/.test(note)));
});

test("migrazione: il contratto nasce solo da un immobile gia' affittato", () => {
  const leased = emptyData();
  leased.properties = [
    makeProperty({
      id: "property-2",
      code: "FS-002",
      title: "Via Verdi 5",
      kind: "affitto",
      status: "Affittato",
      price: "900",
      owner: "Luca Verdi",
      details: { monthlyRent: "900", tenantName: "Anna Bianchi", leaseStartDate: "2026-03-01" },
    }),
  ];

  const { data: migrated, report } = migrateOperationsData(leased, TODAY);
  assert.equal(report.leases, 1);
  assert.equal(migrated.leases.length, 1);
  assert.equal(migrated.leases[0].tenantName, "Anna Bianchi");
  assert.equal(migrated.leases[0].rent, "900");
  assert.equal(migrated.leases[0].startDate, "2026-03-01");
  assert.equal(migrated.leases[0].endDate, "2030-03-01");
  assert.equal(migrated.leases[0].status, "Attivo");

  const available = emptyData();
  available.properties = [
    makeProperty({ id: "property-3", kind: "affitto", status: "In gestione", details: { monthlyRent: "800" } }),
  ];
  assert.equal(migrateOperationsData(available, TODAY).data.leases.length, 0);
});

test("migrazione: solo le richieste in trattativa diventano proposte, se l'immobile esiste", () => {
  const data = emptyData();
  data.properties = [makeProperty()];
  data.requests = [
    {
      id: "request-1",
      client: "Giulia Neri",
      target: "Acquisto trilocale",
      area: "Centro",
      match: "80%",
      proposal: "Via Roma 10",
      status: "Trattativa",
      updatedAt: "2026-11-24",
    },
    {
      id: "request-2",
      client: "Cliente senza immobile",
      target: "Acquisto",
      area: "Centro",
      match: "",
      proposal: "Immobile inesistente",
      status: "Trattativa",
      updatedAt: "2026-11-24",
    },
    {
      id: "request-3",
      client: "Cliente nuovo",
      target: "Acquisto",
      area: "Centro",
      match: "",
      proposal: "",
      status: "Nuova",
      updatedAt: "2026-11-24",
    },
  ];

  const { data: migrated, report } = migrateOperationsData(data, TODAY);

  assert.equal(migrated.deals.length, 1);
  assert.equal(migrated.deals[0].clientName, "Giulia Neri");
  assert.equal(migrated.deals[0].propertyId, "property-1");
  assert.equal(migrated.deals[0].stage, "Proposta");
  assert.equal(migrated.deals[0].expiryDate, "2026-12-09");
  assert.ok(report.notes.some((note) => /Immobile inesistente/.test(note)));
});

test("migrazione: l'anteprima non modifica i dati e la seconda esecuzione non duplica", () => {
  const data = emptyData();
  data.properties = [
    makeProperty({
      details: { mandateType: "Non esclusiva", mandateEndDate: "2027-06-30" },
    }),
  ];

  const snapshot = JSON.stringify(data);
  const report = previewOperationsMigration(data, TODAY);
  assert.equal(JSON.stringify(data), snapshot, "l'anteprima deve essere in sola lettura");
  assert.equal(report.mandates, 1);

  const first = migrateOperationsData(data, TODAY);
  const second = migrateOperationsData(first.data, TODAY);

  assert.equal(second.changed, false);
  assert.equal(second.data.mandates.length, 1);
  assert.equal(second.data.contacts.length, 1);
  assert.equal(second.data.properties[0].title, "Via Roma 10");
  assert.equal(second.data.properties[0].owner, "Mario Rossi");
});

test("migrazione: i contatti esistenti non vengono duplicati", () => {
  const data = emptyData();
  data.contacts = [
    {
      id: "contact-existing",
      name: "Mario Rossi",
      type: "Proprietario",
      status: "Attivo",
      source: "Censimento",
      owner: "",
      phone: "3331112222",
      note: "",
      nextStep: "",
      updatedAt: "2026-11-24",
    },
  ];
  data.properties = [makeProperty({ details: { mandateType: "Esclusiva" } })];

  const { data: migrated, report } = migrateOperationsData(data, TODAY);

  assert.equal(migrated.contacts.length, 1);
  assert.equal(report.ownerContacts, 0);
  assert.equal(migrated.properties[0].ownerContactId, "contact-existing");
});

/* ------------------------------------------------------------------ */
/* Motore dei prossimi passi                                           */
/* ------------------------------------------------------------------ */

function actionData() {
  const data = emptyData();
  data.operationsModel = 1;
  data.properties = [
    makeProperty(),
    makeProperty({ id: "property-2", code: "FS-002", title: "Via Verdi 5" }),
  ];
  data.mandates = [
    {
      id: "mandate-1",
      propertyId: "property-1",
      type: "Vendita",
      exclusivity: "Esclusiva",
      askingPrice: "250000",
      minimumPrice: "",
      commission: "",
      startDate: "2026-01-01",
      endDate: "2026-11-29",
      status: "Attivo",
      officeId: "office-sede-principale",
      agent: "",
      notes: "",
      updatedAt: "2026-11-24",
    },
  ];
  data.leases = [
    {
      id: "lease-1",
      propertyId: "property-1",
      tenantName: "Anna Bianchi",
      contractType: "4+4 canone libero",
      rent: "900",
      deposit: "",
      startDate: "2026-11-01",
      endDate: "2030-11-01",
      registrationDate: "",
      taxRegime: "Cedolare secca",
      istatAdjustment: "Si",
      status: "Attivo",
      payments: [{ id: "pay-1", dueDate: "2026-11-20", amount: "900", status: "Da incassare" }],
      agent: "",
      officeId: "office-sede-principale",
      notes: "",
      updatedAt: "2026-11-24",
    },
  ];
  data.deals = [
    {
      id: "deal-1",
      propertyId: "property-1",
      clientName: "Giulia Neri",
      type: "Vendita",
      stage: "Proposta",
      offerAmount: "240000",
      deposit: "",
      proposalDate: "2026-11-10",
      expiryDate: "2026-11-27",
      closingDate: "",
      commission: "",
      agent: "",
      officeId: "office-sede-principale",
      notes: "",
      stageChangedAt: "",
      updatedAt: "2026-11-24",
    },
  ];
  data.requests = [
    {
      id: "request-1",
      client: "Cliente fermo",
      target: "Acquisto",
      area: "Centro",
      match: "",
      proposal: "",
      status: "Qualificata",
      stageChangedAt: "2026-11-04T09:00:00.000Z",
      updatedAt: "2026-11-04",
    },
  ];
  data.contacts = [
    {
      id: "contact-1",
      name: "Mario Rossi",
      type: "Proprietario",
      status: "Da censire",
      source: "",
      owner: "",
      phone: "",
      note: "",
      nextStep: "",
      details: { nextContactDate: "2026-11-20", nextContactReason: "Ricontatto censimento" },
      updatedAt: "2026-11-24",
    },
  ];
  return data;
}

test("prossimi passi: incarico in scadenza, canone e ricontatto hanno la priorita' piu' alta", () => {
  const actions = buildNextActions(actionData(), TODAY);

  const mandate = actions.find((action) => action.kind === "Incarico");
  const rent = actions.find((action) => action.kind === "Affitto");
  // Il ricontatto di un proprietario e' censimento, non un contatto generico.
  const contact = actions.find((action) => action.kind === "Censimento");

  assert.ok(mandate, "manca l'azione incarico");
  assert.equal(mandate.priority, 2);
  assert.equal(mandate.moduleKey, "acquisizione");
  assert.equal(mandate.when, "fra 5 gg");

  assert.ok(rent, "manca l'azione canone");
  assert.equal(rent.priority, 1);
  assert.equal(rent.moduleKey, "locazioni");
  assert.equal(rent.pageKey, "locazioni-incassi");

  assert.ok(contact, "manca l'azione ricontatto");
  assert.equal(contact.priority, 1);
  assert.equal(contact.pageKey, "nominativi-elenco");
});

test("prossimi passi: il motivo decide il tipo di ricontatto, il ruolo fa da fallback", () => {
  const genericOwner = actionData();
  genericOwner.contacts[0].details = {
    nextContactDate: "2026-11-20",
    nextContactReason: "Invio scheda immobile",
  };
  const genericAction = buildNextActions(genericOwner, TODAY).find(
    (action) => action.id === "contact-contact-1",
  );
  assert.ok(genericAction, "manca l'azione di ricontatto generico");
  assert.equal(genericAction.kind, "Contatto", "un motivo commerciale non e' censimento");

  const ownerWithoutReason = actionData();
  ownerWithoutReason.contacts[0].details = { nextContactDate: "2026-11-20" };
  assert.equal(
    buildNextActions(ownerWithoutReason, TODAY).find((action) => action.id === "contact-contact-1").kind,
    "Censimento",
    "senza motivo il proprietario resta nella coda di censimento",
  );

  const clientWithoutReason = actionData();
  clientWithoutReason.contacts[0] = {
    ...clientWithoutReason.contacts[0],
    type: "Acquirente",
    status: "Qualificato",
    details: { nextContactDate: "2026-11-20" },
  };
  assert.equal(
    buildNextActions(clientWithoutReason, TODAY).find((action) => action.id === "contact-contact-1").kind,
    "Contatto",
    "un cliente senza motivo non diventa censimento",
  );
});

test("prossimi passi: copre locazione, trattativa, richiesta ferma e immobili senza incarico", () => {
  const actions = buildNextActions(actionData(), TODAY);

  assert.ok(actions.some((action) => action.kind === "Locazione" && /Registrazione/.test(action.title)));
  assert.ok(actions.some((action) => action.kind === "Trattativa" && action.priority === 2));
  assert.ok(actions.some((action) => action.kind === "Richiesta"));
  assert.ok(
    actions.some(
      (action) => action.kind === "Immobile" && /1 immobili senza incarico attivo/.test(action.title),
    ),
  );
});

test("prossimi passi: ordinati per urgenza e limitati a dodici", () => {
  const actions = buildNextActions(actionData(), TODAY);
  const priorities = actions.map((action) => action.priority);

  assert.deepEqual(priorities, [...priorities].sort((first, second) => first - second));
  assert.ok(actions.length <= 12);

  const crowded = actionData();
  crowded.mandates = Array.from({ length: 20 }, (_, index) => ({
    ...crowded.mandates[0],
    id: `mandate-${index}`,
    endDate: "2026-11-25",
  }));
  assert.equal(buildNextActions(crowded, TODAY).length, 12);
});

test("prossimi passi: un incarico revocato o chiuso non genera azioni", () => {
  const data = actionData();
  data.mandates = [{ ...data.mandates[0], status: "Revocato", endDate: "2026-11-25" }];

  const actions = buildNextActions(data, TODAY);
  assert.equal(actions.some((action) => action.kind === "Incarico"), false);
});
