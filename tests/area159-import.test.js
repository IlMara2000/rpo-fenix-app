import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function loadImport() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const result = await build({
    stdin: {
      contents: `
        import { parseDelimited, mapHeaders, previewArea159Import, applyArea159Import, importSnapshot } from "./src/crm/area159Import.ts";
        globalThis.parseDelimited = parseDelimited;
        globalThis.mapHeaders = mapHeaders;
        globalThis.previewArea159Import = previewArea159Import;
        globalThis.applyArea159Import = applyArea159Import;
        globalThis.importSnapshot = importSnapshot;
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

await loadImport();

function emptyData() {
  return {
    properties: [],
    contacts: [],
    requests: [],
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
    operationsModel: 1,
  };
}

const exportCsv = [
  "\uFEFFCodice;Indirizzo;Comune;Zona;Prezzo;Proprietario;Codice fiscale;Telefono;Stato;Contratto",
  'FS-101;Via Dante 4;Milano;Centro;"620.000";Giulia Ferri;FRRGLI70A41F205X;02 1234567;In gestione;Vendita',
  'FS-102;"Via Roma 10, interno 3";Roma;Prati;342000;Luca Verdi;;333 9988776;In gestione;Affitto',
  'FS-103;Via Solari 8;Milano;Solari;480000;Giulia Ferri;FRRGLI70A41F205X;;Bozza;Vendita',
].join("\r\n");

test("import Area159: legge BOM, punto e virgola e virgolette con la virgola dentro", () => {
  const table = globalThis.parseDelimited(exportCsv);

  assert.equal(table.headers[0], "Codice", "il BOM non resta attaccato alla prima intestazione");
  assert.equal(table.rows.length, 3);
  assert.equal(table.rows[1][1], "Via Roma 10, interno 3", "la virgola dentro le virgolette non separa");
  assert.equal(table.rows[0][4], "620.000", "il prezzo resta com'è scritto nell'export");
});

test("import Area159: le intestazioni italiane trovano i campi, le altre restano fuori", () => {
  const { columns, unrecognized } = globalThis.mapHeaders([
    "Codice",
    "Indirizzo",
    "Comune",
    "Prezzo",
    "Proprietario",
    "Codice fiscale",
    "Foglio",
  ]);

  assert.equal(columns.code, 0);
  assert.equal(columns.title, 1);
  assert.equal(columns.city, 2);
  assert.equal(columns.taxCode, 5);
  assert.deepEqual(unrecognized, ["Foglio"], "le colonne non mappate si dichiarano invece di sparire");
});

test("import Area159: l'anteprima conta nuovi, aggiornati e proprietari una volta sola", () => {
  const data = emptyData();
  const preview = globalThis.previewArea159Import(data, exportCsv);

  assert.equal(preview.rows, 3);
  assert.equal(preview.created, 3);
  assert.equal(preview.updated, 0);
  assert.equal(preview.newContacts.length, 2, "Giulia Ferri compare due volte ma è un solo proprietario");
  assert.equal(preview.duplicateContacts, 1);
  assert.equal(preview.unrecognized.length, 0, "tutte le intestazioni di questo export sono riconosciute");
  assert.equal(preview.properties[1].zone, "Prati");
  assert.equal(preview.properties[1].kind, "affitto", "il tipo contratto diventa affitto");
  assert.equal(preview.properties[2].kind, "vendita");
});

test("import Area159: applicare non muta l'archivio e un secondo import aggiorna per codice", () => {
  const data = emptyData();
  const preview = globalThis.previewArea159Import(data, exportCsv);
  const applied = globalThis.applyArea159Import(data, preview);

  assert.equal(data.properties.length, 0, "l'archivio di partenza resta intatto");
  assert.equal(applied.properties.length, 3);
  assert.equal(applied.contacts.length, 2);

  const again = globalThis.previewArea159Import(applied, exportCsv);
  assert.equal(again.created, 0, "stessi codici: nessun duplicato");
  assert.equal(again.updated, 3);
  assert.equal(again.newContacts.length, 0, "i proprietari non si duplicano");

  const reapplied = globalThis.applyArea159Import(applied, again);
  assert.equal(reapplied.properties.length, 3);
  assert.equal(reapplied.properties[0].id, applied.properties[0].id, "l'id della scheda esistente non cambia");
});

test("import Area159: l'anteprima non inventa id né date", () => {
  const preview = globalThis.previewArea159Import(emptyData(), exportCsv);

  preview.properties.forEach((draft) => {
    assert.equal(draft.id, undefined, "l'immobile in anteprima non ha id");
    assert.equal(draft.updatedAt, undefined, "l'immobile in anteprima non ha data");
  });
  preview.newContacts.forEach((draft) => {
    assert.equal(draft.id, undefined, "il proprietario in anteprima non ha id");
    assert.equal(draft.updatedAt, undefined, "il proprietario in anteprima non ha data");
  });

  const applied = globalThis.applyArea159Import(emptyData(), preview, new Date("2026-11-26T10:00:00.000Z"));
  assert.ok(applied.properties.every((property) => property.updatedAt === "2026-11-26"), "la data nasce applicando");
  assert.ok(applied.properties.every((property) => Boolean(property.id)), "e anche l'id");
});

test("import Area159: la copia presa prima di applicare annulla ogni modifica", () => {
  const data = emptyData();
  data.properties = [
    {
      id: "property-existing",
      code: "FS-100",
      title: "Prima dell'import",
      zone: "Centro",
      status: "In gestione",
      price: "100000",
      owner: "Mario Rossi",
      portals: "Bozza",
      kind: "vendita",
      updatedAt: "2026-11-01",
    },
  ];

  const before = globalThis.importSnapshot(data);
  const applied = globalThis.applyArea159Import(data, globalThis.previewArea159Import(data, exportCsv));

  assert.equal(applied.properties.length, 4, "applicato: l'archivio cresce");
  assert.equal(applied.contacts.length, 2);

  // L'annullamento è il ripristino della copia: deve essere l'archivio di prima.
  assert.deepEqual(before, data);
  assert.equal(before.properties.length, 1);
  assert.equal(before.contacts.length, 0);
  assert.equal(before.properties[0].title, "Prima dell'import");

  // E la copia è indipendente dal risultato: nessun riferimento condiviso.
  applied.properties[0].title = "Cambiato dopo l'import";
  applied.contacts.push({ id: "contact-x" });
  assert.equal(before.properties[0].title, "Prima dell'import");
  assert.equal(before.contacts.length, 0);
});

// Esempi scritti a mano con le intestazioni che l'import si aspetta dai due
// export di Area159: servono a fissare gli alias, non sono dati veri.
const immobiliCsv = [
  "Codice Immobile;Indirizzo Immobile;Comune;Zona;Tipologia;Prezzo Richiesta;Proprietario;Telefono;Email;Codice Fiscale;Stato;Contratto;Mq",
  'A159-1001;Via Garibaldi 12;Mogoro;Centro;Appartamento;185000;Maria Puddu;0783 123456;maria.puddu@example.it;PDDMRA75C45F272B;In gestione;Vendita;95',
  'A159-1002;"Via Roma 3, interno 2";Oristano;San Nicola;Casa indipendente;"249.000";Paolo Frau;333 4455667;;FRAPLA68A01F205K;In gestione;Affitto;140',
].join("\r\n");

const contattiCsv = [
  "ID;Nome;Cognome;Telefono;Email;Codice Fiscale;Tipologia Contatto",
  "C-1;Maria;Puddu;0783 123456;maria.puddu@example.it;PDDMRA75C45F272B;Proprietario",
  "C-2;Paolo;Frau;333 4455667;paolo.frau@example.it;FRAPLA68A01F205K;Proprietario",
  "C-3;Paolo;Frau;333 4455667;paolo.frau@example.it;FRAPLA68A01F205K;Proprietario riparazioni",
].join("\r\n");

test("import Area159: le intestazioni dell'export immobili trovano tutti i campi attesi", () => {
  const { columns, unrecognized } = globalThis.mapHeaders(globalThis.parseDelimited(immobiliCsv).headers);

  assert.equal(columns.code, 0);
  assert.equal(columns.title, 1);
  assert.equal(columns.city, 2);
  assert.equal(columns.zone, 3);
  assert.equal(columns.price, 5);
  assert.equal(columns.owner, 6);
  assert.equal(columns.phone, 7);
  assert.equal(columns.email, 8);
  assert.equal(columns.taxCode, 9);
  assert.equal(columns.status, 10);
  assert.equal(columns.kind, 11);
  assert.equal(columns.typeHint, 4, "la tipologia resta come ripiego, non come contratto");
  assert.deepEqual(unrecognized, ["Mq"], "mq resta fuori invece di indovinare");

  const preview = globalThis.previewArea159Import(emptyData(), immobiliCsv);
  assert.equal(preview.rows, 2);
  assert.equal(preview.created, 2);
  assert.equal(preview.newContacts.length, 2);
  assert.equal(preview.properties[0].zone, "Centro");
  assert.equal(preview.properties[1].title, "Via Roma 3, interno 2");
  assert.equal(preview.properties[1].kind, "affitto");
  assert.deepEqual(preview.missing, []);
});

test("import Area159: l'export contatti riempie la rubrica e non crea immobili", () => {
  const preview = globalThis.previewArea159Import(emptyData(), contattiCsv);

  assert.equal(preview.rows, 3);
  assert.equal(preview.properties.length, 0, "un export contatti non genera schede immobile, nemmeno con la colonna ID");
  assert.equal(preview.created, 0);
  assert.equal(preview.updated, 0);
  assert.equal(
    preview.newContacts.length,
    2,
    "Paolo Frau compare due volte ma è un solo contatto",
  );
  assert.equal(preview.duplicateContacts, 1);
  assert.equal(preview.newContacts[0].name, "Maria Puddu", "nome e cognome si compongono");
  assert.equal(preview.newContacts[0].email, "maria.puddu@example.it");
  assert.equal(preview.newContacts[0].taxCode, "PDDMRA75C45F272B");
  assert.deepEqual(preview.unrecognized, ["Tipologia Contatto"]);

  const applied = globalThis.applyArea159Import(emptyData(), preview, new Date("2026-11-26T10:00:00.000Z"));
  assert.equal(applied.properties.length, 0);
  assert.equal(applied.contacts.length, 2);
  assert.equal(applied.contacts[0].email, "maria.puddu@example.it", "l'email arriva in rubrica");
  assert.equal(applied.contacts[0].source, "Area159");

  const again = globalThis.previewArea159Import(applied, contattiCsv);
  assert.equal(again.newContacts.length, 0, "un secondo import non duplica la rubrica");
  assert.equal(again.duplicateContacts, 3);
});

const senzaContrattoCsv = [
  "Codice Immobile;Indirizzo Immobile;Comune;Tipologia;Prezzo;Proprietario",
  "A159-2001;Via Mannu 5;Mogoro;Affitto;650;Maria Puddu",
  "A159-2002;Via Dessì 9;Mogoro;Locazione commerciale;1200;Maria Puddu",
  "A159-2003;Via Sardegna 2;Oristano;Vendita;210000;Paolo Frau",
  "A159-2004;Via Cagliari 7;Oristano;Appartamento;165000;Paolo Frau",
].join("\r\n");

test("import Area159: senza colonna contratto la tipologia decide affitto e vendita", () => {
  const preview = globalThis.previewArea159Import(emptyData(), senzaContrattoCsv);

  assert.equal(preview.properties[0].kind, "affitto", "«Affitto» nella tipologia basta");
  assert.equal(preview.properties[1].kind, "affitto", "anche «Locazione»");
  assert.equal(preview.properties[2].kind, "vendita");
  assert.equal(preview.properties[3].kind, "vendita", "una tipologia senza contratto resta vendita");
});

test("import Area159: la colonna contratto vince sulla tipologia", () => {
  const doppia = [
    "Codice;Indirizzo;Tipologia;Contratto",
    "A159-3001;Via Roma 1;Affitto;Vendita",
    "A159-3002;Via Roma 2;Vendita;Locazione",
  ].join("\n");
  const preview = globalThis.previewArea159Import(emptyData(), doppia);

  assert.equal(preview.properties[0].kind, "vendita", "il contratto esplicito non si fa sovrascrivere");
  assert.equal(preview.properties[1].kind, "affitto");
});

test("import Area159: gli immobili importati e i contatti dello stesso export non si cercano per email", () => {
  const preview = globalThis.previewArea159Import(emptyData(), immobiliCsv);
  const applied = globalThis.applyArea159Import(emptyData(), preview);
  const contacts = globalThis.previewArea159Import(applied, contattiCsv);

  assert.equal(contacts.newContacts.length, 0, "stessi codici fiscali: i proprietari sono già in rubrica");
  assert.equal(contacts.duplicateContacts, 3);
  assert.equal(contacts.properties.length, 0);
});

test("import Area159: senza colonne chiave l'anteprima lo dice", () => {
  const preview = globalThis.previewArea159Import(emptyData(), "Codice;Indirizzo\nFS-201;Via Verdi 1");

  assert.equal(preview.created, 1);
  assert.ok(preview.missing.some((note) => /Prezzo/.test(note)));
  assert.ok(preview.missing.some((note) => /Proprietario/.test(note)));
  assert.ok(preview.missing.some((note) => /Codice fiscale/.test(note)));
});

// Un export ridotto, senza prezzo, proprietario, stato e portali: è il caso in
// cui i segnaposto non devono toccare quello che l'archivio già contiene.
const senzaPrezzoCsv = ["Codice;Indirizzo;Comune", "FS-501;Via Primo Maggio 3;Cagliari"].join("\n");

test("import Area159: un export senza prezzo, proprietario e portali non cancella i dati in archivio", () => {
  const data = emptyData();
  data.properties = [
    {
      id: "property-501",
      code: "FS-501",
      title: "Via Primo Maggio 3",
      zone: "Cagliari",
      status: "Trattativa aperta",
      price: "249.000",
      owner: "Maria Puddu",
      portals: "Da sincronizzare",
      kind: "vendita",
      updatedAt: "2026-11-01",
    },
  ];

  const preview = globalThis.previewArea159Import(data, senzaPrezzoCsv);
  assert.equal(preview.updated, 1, "la riga aggiorna la scheda esistente");

  const applied = globalThis.applyArea159Import(data, preview);
  assert.equal(applied.properties[0].price, "249.000", "il prezzo scritto a mano resta");
  assert.equal(applied.properties[0].owner, "Maria Puddu", "il proprietario resta");
  assert.equal(applied.properties[0].portals, "Da sincronizzare", "lo stato sui portali resta");
  assert.equal(applied.properties[0].status, "Trattativa aperta", "anche lo stato della scheda resta");
});

test("import Area159: i segnaposto restano solo sulle schede nuove", () => {
  const nuovo = ["Codice;Indirizzo;Comune", "FS-502;Via Nuova 1;Cagliari"].join("\n");
  const applied = globalThis.applyArea159Import(
    emptyData(),
    globalThis.previewArea159Import(emptyData(), nuovo),
  );

  assert.equal(applied.properties[0].price, "Da valutare");
  assert.equal(applied.properties[0].owner, "Proprietario da associare");
  assert.equal(applied.properties[0].portals, "Bozza");
  assert.equal(applied.properties[0].status, "In gestione");
});

test("import Area159: l'immobile importato punta al contatto del proprietario", () => {
  const applied = globalThis.applyArea159Import(
    emptyData(),
    globalThis.previewArea159Import(emptyData(), immobiliCsv),
  );
  const maria = applied.contacts.find((contact) => contact.taxCode === "PDDMRA75C45F272B");
  const paolo = applied.contacts.find((contact) => contact.taxCode === "FRAPLA68A01F205K");

  assert.ok(maria, "Maria Puddu entra in rubrica");
  assert.ok(paolo, "Paolo Frau entra in rubrica");
  assert.equal(applied.properties[0].ownerContactId, maria.id, "il legame usa l'id, non il nome");
  assert.equal(applied.properties[1].ownerContactId, paolo.id);
});

test("import Area159: il proprietario si collega anche se è già in rubrica o senza codice fiscale", () => {
  const data = emptyData();
  data.contacts = [
    {
      id: "contact-maria",
      name: "Maria Puddu",
      type: "Proprietario",
      status: "Attivo",
      source: "Censimento",
      owner: "",
      phone: "",
      note: "",
      nextStep: "",
      updatedAt: "2026-01-01",
    },
  ];
  const csv = ["Codice;Indirizzo;Proprietario", "FS-601;Via Roma 2;Maria Puddu"].join("\n");

  const applied = globalThis.applyArea159Import(data, globalThis.previewArea159Import(data, csv));
  assert.equal(applied.properties[0].ownerContactId, "contact-maria", "si ritrova per nome");
  assert.equal(applied.contacts.length, 1, "e non duplica il contatto già presente");
});

test("import Area159: un legame scelto a mano non viene sostituito dall'export", () => {
  const data = emptyData();
  data.properties = [
    {
      id: "property-1001",
      code: "A159-1001",
      title: "Scheda collegata a mano",
      zone: "Mogoro",
      status: "In gestione",
      price: "185000",
      owner: "Maria Puddu",
      portals: "Bozza",
      kind: "vendita",
      ownerContactId: "contact-scelto-a-mano",
      updatedAt: "2026-01-01",
    },
  ];

  const applied = globalThis.applyArea159Import(
    data,
    globalThis.previewArea159Import(data, immobiliCsv),
  );
  const property = applied.properties.find((item) => item.code === "A159-1001");
  assert.equal(property.ownerContactId, "contact-scelto-a-mano");
});

// Righe senza colonna codice: il codice nasce dal contenuto, non dalla riga.
const senzaCodiceCsv = [
  "Indirizzo;Comune;Zona;Contratto",
  "Via Mannu 5;Mogoro;Centro;Vendita",
  "Via Dessì 9;Mogoro;Periferia;Affitto",
].join("\n");

test("import Area159: le righe senza codice ricevono un codice stabile", () => {
  const first = globalThis.previewArea159Import(emptyData(), senzaCodiceCsv);
  const second = globalThis.previewArea159Import(emptyData(), senzaCodiceCsv);

  assert.deepEqual(
    first.properties.map((item) => item.code),
    second.properties.map((item) => item.code),
    "lo stesso file produce gli stessi codici",
  );
  assert.notEqual(first.properties[0].code, first.properties[1].code, "due immobili diversi non condividono il codice");
  assert.match(first.properties[0].code, /^A159-/);

  const invertito = globalThis.previewArea159Import(
    emptyData(),
    [
      "Indirizzo;Comune;Zona;Contratto",
      "Via Dessì 9;Mogoro;Periferia;Affitto",
      "Via Mannu 5;Mogoro;Centro;Vendita",
    ].join("\n"),
  );
  assert.deepEqual(
    [...invertito.properties.map((item) => item.code)].sort(),
    [...first.properties.map((item) => item.code)].sort(),
    "l'ordine delle righe non cambia il codice",
  );
});

test("import Area159: riapplicare un file senza codici non crea doppioni", () => {
  const applied = globalThis.applyArea159Import(
    emptyData(),
    globalThis.previewArea159Import(emptyData(), senzaCodiceCsv),
  );
  assert.equal(applied.properties.length, 2);

  const again = globalThis.previewArea159Import(applied, senzaCodiceCsv);
  assert.equal(again.created, 0, "nessuna scheda nuova");
  assert.equal(again.updated, 2, "le due schede si aggiornano");

  const reapplied = globalThis.applyArea159Import(applied, again);
  assert.equal(reapplied.properties.length, 2);
  assert.deepEqual(
    reapplied.properties.map((item) => item.id),
    applied.properties.map((item) => item.id),
    "gli id non cambiano"
  );
});
