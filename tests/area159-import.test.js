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

test("import Area159: senza colonne chiave l'anteprima lo dice", () => {
  const preview = globalThis.previewArea159Import(emptyData(), "Codice;Indirizzo\nFS-201;Via Verdi 1");

  assert.equal(preview.created, 1);
  assert.ok(preview.missing.some((note) => /Prezzo/.test(note)));
  assert.ok(preview.missing.some((note) => /Proprietario/.test(note)));
  assert.ok(preview.missing.some((note) => /Codice fiscale/.test(note)));
});
