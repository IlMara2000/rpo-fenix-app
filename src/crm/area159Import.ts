import { makeId, type ContactRecord, type CrmData, type PropertyRecord } from "./kit";

/**
 * Import di un export testuale di Area159 (CSV/TSV con intestazione).
 * La lettura e' tollerante — separatore dedotto, virgolette, BOM — ma la
 * mappatura non indovina: le colonne che non riconosce le elenca, e i campi
 * che mancano finiscono tra le cose da verificare invece di diventare zeri.
 */

export type ImportTable = { headers: string[]; rows: string[][] };

function detectSeparator(line: string) {
  const candidates = [";", "\t", ","];
  let best = ";";
  let bestCount = -1;
  candidates.forEach((candidate) => {
    let count = 0;
    let quoted = false;
    for (const char of line) {
      if (char === '"') {
        quoted = !quoted;
      } else if (!quoted && char === candidate) {
        count += 1;
      }
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  });
  return best;
}

export function parseDelimited(text: string): ImportTable {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const separator = detectSeparator(clean.split("\n")[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (quoted) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === separator) {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers = [], ...body] = rows;
  return {
    headers: headers.map((header) => header.trim()),
    rows: body.filter((cells) => cells.some((cell) => cell.trim())),
  };
}

/** Intestazioni che ho visto nei gestionali italiani, per non legarsi a una sola. */
const fieldAliases: Record<string, string[]> = {
  code: ["codice", "codice immobile", "cod", "rif", "riferimento", "id"],
  title: ["titolo", "indirizzo", "descrizione", "immobile", "via", "indirizzo immobile"],
  zone: ["zona", "quartiere", "zona omogenea", "localita"],
  city: ["comune", "citta", "comune immobile"],
  price: ["prezzo", "prezzo richiesto", "prezzo vendita", "prezzo di vendita", "importo"],
  owner: ["proprietario", "proprietari", "venditore", "intestatario"],
  phone: ["telefono", "telefono proprietario", "cellulare", "recapito"],
  taxCode: ["codice fiscale", "cf", "codice fiscale proprietario"],
  status: ["stato", "stato immobile"],
  kind: ["contratto", "tipo contratto", "tipologia contratto", "tipologia", "tipo"],
};

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function mapHeaders(headers: string[]) {
  const columns: Record<string, number> = {};
  const unrecognized: string[] = [];
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const field = Object.keys(fieldAliases).find((key) => fieldAliases[key].includes(normalized));
    if (field && columns[field] === undefined) {
      columns[field] = index;
    } else if (!field) {
      unrecognized.push(header);
    }
  });
  return { columns, unrecognized };
}

export type Area159ImportPreview = {
  rows: number;
  created: number;
  updated: number;
  newContacts: ContactRecord[];
  duplicateContacts: number;
  unrecognized: string[];
  missing: string[];
  properties: PropertyRecord[];
};

function cell(row: string[], columns: Record<string, number>, field: string) {
  const index = columns[field];
  return index === undefined ? "" : (row[index] ?? "").trim();
}

/** Anteprima senza effetti: cosa creerebbe, cosa aggiornerebbe, cosa resta da verificare. */
export function previewArea159Import(data: CrmData, text: string): Area159ImportPreview {
  const { headers, rows } = parseDelimited(text);
  const { columns, unrecognized } = mapHeaders(headers);
  const knownCodes = new Set(data.properties.map((property) => property.code.trim().toLowerCase()));
  const knownContacts = new Set(
    data.contacts.map((contact) => (contact.taxCode || contact.name).trim().toLowerCase()),
  );

  const preview: Area159ImportPreview = {
    rows: rows.length,
    created: 0,
    updated: 0,
    newContacts: [],
    duplicateContacts: 0,
    unrecognized,
    missing: [],
    properties: [],
  };

  rows.forEach((row) => {
    const code = cell(row, columns, "code");
    const title = cell(row, columns, "title");
    if (!code && !title) {
      return;
    }
    const city = cell(row, columns, "city");
    const zone = cell(row, columns, "zone");
    const price = cell(row, columns, "price");
    const owner = cell(row, columns, "owner");
    const taxCode = cell(row, columns, "taxCode");
    const phone = cell(row, columns, "phone");
    const status = cell(row, columns, "status");
    const kind = /affitt|locazion/i.test(cell(row, columns, "kind")) ? "affitto" : "vendita";
    const finalCode = code || `A159-${preview.properties.length + 1}`;

    preview.properties.push({
      id: makeId("property"),
      code: finalCode,
      title: title || [zone, city].filter(Boolean).join(", ") || "Immobile senza titolo",
      zone: zone || city || "Zona da definire",
      status: status || "In gestione",
      price: price || "Da valutare",
      owner: owner || "Proprietario da associare",
      portals: "Bozza",
      kind,
      phone: phone || undefined,
      taxCode: taxCode || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    });

    if (knownCodes.has(finalCode.trim().toLowerCase())) {
      preview.updated += 1;
    } else {
      preview.created += 1;
    }

    if (owner || taxCode) {
      const key = (taxCode || owner).trim().toLowerCase();
      if (knownContacts.has(key)) {
        preview.duplicateContacts += 1;
      } else {
        knownContacts.add(key);
        preview.newContacts.push({
          id: makeId("contact"),
          name: owner || "Proprietario senza nome",
          type: "Proprietario",
          status: "Attivo",
          source: "Area159",
          owner: "",
          phone: phone || "",
          email: "",
          taxCode: taxCode || "",
          note: "",
          nextStep: "",
          updatedAt: new Date().toISOString().slice(0, 10),
        });
      }
    }
  });

  const required: [string, string][] = [
    ["price", "Prezzo: colonna non riconosciuta, resta «Da valutare»"],
    ["owner", "Proprietario: colonna non riconosciuta, resta «da associare»"],
    ["taxCode", "Codice fiscale: colonna non riconosciuta, la ricerca per codice non trovera' questi immobili"],
  ];
  required.forEach(([field, message]) => {
    if (columns[field] === undefined) {
      preview.missing.push(message);
    }
  });

  return preview;
}

/** Applica l'anteprima: gli immobili si aggiornano per codice, i contatti si aggiungono. */
export function applyArea159Import(data: CrmData, preview: Area159ImportPreview): CrmData {
  const byCode = new Map(preview.properties.map((property) => [property.code.trim().toLowerCase(), property]));
  const properties = data.properties.map((property) => {
    const incoming = byCode.get(property.code.trim().toLowerCase());
    if (!incoming) {
      return property;
    }
    byCode.delete(property.code.trim().toLowerCase());
    return { ...property, ...incoming, id: property.id };
  });

  return {
    ...data,
    properties: [...properties, ...Array.from(byCode.values())],
    contacts: [...data.contacts, ...preview.newContacts],
  };
}
