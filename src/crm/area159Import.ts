import { makeId, type CrmData, type PropertyRecord } from "./kit";

/**
 * Import di un export testuale di Area159 (CSV/TSV con intestazione).
 * La lettura e' tollerante — separatore dedotto, virgolette, BOM — ma la
 * mappatura non indovina: le colonne che non riconosce le elenca, e i campi
 * che mancano finiscono tra le cose da verificare invece di diventare zeri.
 *
 * L'anteprima e' senza effetti: niente id e niente date, solo i dati letti.
 * Identificativi e data di aggiornamento nascono nell'applicazione, cosi' una
 * seconda anteprima dello stesso file produce lo stesso risultato.
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

/**
 * Intestazioni attese nei due export di Area159 (immobili e contatti), scritte
 * come le scrive il gestionale: senza accenti, senza punteggiatura, minuscole.
 * `owner` e' il nome completo; `firstName`/`lastName` coprono gli export che
 * tengono nome e cognome in due colonne. Una colonna che non sta qui non
 * diventa un campo a indovinare: finisce tra le non riconosciute.
 */
const fieldAliases: Record<string, string[]> = {
  // Immobili
  code: [
    "codice",
    "codice immobile",
    "cod immobile",
    "codice scheda",
    "rif",
    "rif immobile",
    "riferimento",
    "riferimento immobile",
    "id immobile",
    "id",
  ],
  title: [
    "titolo",
    "titolo immobile",
    "indirizzo",
    "indirizzo immobile",
    "descrizione",
    "descrizione immobile",
    "ubicazione",
    "immobile",
    "via",
  ],
  zone: ["zona", "quartiere", "zona omogenea", "localita", "frazione", "macrozona"],
  city: ["comune", "citta", "comune immobile", "citta immobile"],
  price: [
    "prezzo",
    "prezzo richiesto",
    "prezzo di richiesta",
    "prezzo richiesta",
    "prezzo vendita",
    "prezzo di vendita",
    "importo",
  ],
  status: ["stato", "stato immobile", "stato scheda", "situazione"],
  // Solo il contratto: «Tipologia» nell'export e' il tipo di immobile, e
  // indovinare su quella colonna sbaglierebbe affitto e vendita.
  kind: ["contratto", "tipo contratto", "tipologia contratto"],
  // Contatti e proprietari
  owner: [
    "proprietario",
    "proprietari",
    "nome e cognome",
    "nome completo",
    "venditore",
    "intestatario",
    "ragione sociale",
    "contatto",
    "cliente",
  ],
  firstName: ["nome", "nome contatto", "nome proprietario", "nome cliente"],
  lastName: ["cognome", "cognome contatto", "cognome proprietario", "cognome cliente"],
  phone: [
    "telefono",
    "telefono proprietario",
    "cellulare",
    "cellulare proprietario",
    "telefono cellulare",
    "recapito",
    "cell",
  ],
  email: ["email", "e mail", "mail", "posta elettronica", "email proprietario", "email contatto"],
  taxCode: [
    "codice fiscale",
    "cf",
    "codice fiscale proprietario",
    "codice fiscale contatto",
    "codice fiscale p iva",
  ],
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

/** Un immobile letto dal file, senza id né data: quelli arrivano applicando. */
export type Area159PropertyDraft = {
  code: string;
  title: string;
  zone: string;
  status: string;
  price: string;
  owner: string;
  kind: PropertyRecord["kind"];
  portals: string;
  phone?: string;
  taxCode?: string;
};

export type Area159ContactDraft = { name: string; phone: string; taxCode: string; email: string };

export type Area159ImportPreview = {
  rows: number;
  created: number;
  updated: number;
  newContacts: Area159ContactDraft[];
  duplicateContacts: number;
  unrecognized: string[];
  missing: string[];
  properties: Area159PropertyDraft[];
};

/** Chiave d'identità di un immobile o di un proprietario, uguale in ogni punto. */
function codeKey(value: string) {
  return value.trim().toLowerCase();
}

function cell(row: string[], columns: Record<string, number>, field: string) {
  const index = columns[field];
  return index === undefined ? "" : (row[index] ?? "").trim();
}

/** Una riga diventa un immobile; senza codice né titolo non è una scheda. */
function propertyDraftFrom(
  row: string[],
  columns: Record<string, number>,
  fallbackIndex: number,
): Area159PropertyDraft | null {
  const code = cell(row, columns, "code");
  const title = cell(row, columns, "title");
  if (!code && !title) {
    return null;
  }
  const city = cell(row, columns, "city");
  const zone = cell(row, columns, "zone");
  const phone = cell(row, columns, "phone");
  const taxCode = cell(row, columns, "taxCode");
  return {
    code: code || `A159-${fallbackIndex}`,
    title: title || [zone, city].filter(Boolean).join(", ") || "Immobile senza titolo",
    zone: zone || city || "Zona da definire",
    status: cell(row, columns, "status") || "In gestione",
    price: cell(row, columns, "price") || "Da valutare",
    owner: cell(row, columns, "owner") || "Proprietario da associare",
    portals: "Bozza",
    kind: /affitt|locazion/i.test(cell(row, columns, "kind")) ? "affitto" : "vendita",
    phone: phone || undefined,
    taxCode: taxCode || undefined,
  };
}

/**
 * Una riga porta al massimo un proprietario: senza nome né codice fiscale,
 * nessuno. Il nome viene dalla colonna unica, oppure da nome e cognome.
 */
function contactDraftFrom(row: string[], columns: Record<string, number>): Area159ContactDraft | null {
  const owner = cell(row, columns, "owner");
  const name =
    owner ||
    [cell(row, columns, "firstName"), cell(row, columns, "lastName")].filter(Boolean).join(" ");
  const taxCode = cell(row, columns, "taxCode");
  if (!name && !taxCode) {
    return null;
  }
  return {
    name: name || "Proprietario senza nome",
    phone: cell(row, columns, "phone"),
    taxCode,
    email: cell(row, columns, "email"),
  };
}

/**
 * Un export di contatti non ha una colonna per il titolo dell'immobile: senza
 * quel riconoscimento le righe non devono diventare schede immobile, anche se
 * il file ha una colonna ID o un indirizzo nel campo del proprietario.
 */
function isContactsOnly(columns: Record<string, number>) {
  return (
    columns.title === undefined &&
    (columns.firstName !== undefined || columns.lastName !== undefined || columns.email !== undefined)
  );
}

/** Anteprima senza effetti: cosa creerebbe, cosa aggiornerebbe, cosa resta da verificare. */
export function previewArea159Import(data: CrmData, text: string): Area159ImportPreview {
  const { headers, rows } = parseDelimited(text);
  const { columns, unrecognized } = mapHeaders(headers);
  const contactsOnly = isContactsOnly(columns);

  const properties = rows
    .map((row, index) => (contactsOnly ? null : propertyDraftFrom(row, columns, index + 1)))
    .filter((draft): draft is Area159PropertyDraft => draft !== null);
  const knownCodes = new Set(data.properties.map((property) => codeKey(property.code)));
  const updated = properties.filter((draft) => knownCodes.has(codeKey(draft.code))).length;

  const knownContacts = new Set(data.contacts.map((contact) => codeKey(contact.taxCode || contact.name)));
  const contacts = rows
    .map((row) => contactDraftFrom(row, columns))
    .filter((draft): draft is Area159ContactDraft => draft !== null);
  const newContacts: Area159ContactDraft[] = [];
  contacts.forEach((contact) => {
    const key = codeKey(contact.taxCode || contact.name);
    if (knownContacts.has(key)) {
      return;
    }
    knownContacts.add(key);
    newContacts.push(contact);
  });

  const missing: string[] = [];
  if (!contactsOnly && columns.price === undefined) {
    missing.push("Prezzo: colonna non riconosciuta, resta «Da valutare»");
  }
  if (!contactsOnly && columns.owner === undefined) {
    missing.push("Proprietario: colonna non riconosciuta, resta «da associare»");
  }
  if (columns.taxCode === undefined) {
    missing.push("Codice fiscale: colonna non riconosciuta, la ricerca per codice non trovera' questi immobili");
  }

  return {
    rows: rows.length,
    created: properties.length - updated,
    updated,
    newContacts,
    duplicateContacts: contacts.length - newContacts.length,
    unrecognized,
    missing,
    properties,
  };
}

/** Copia integrale da conservare prima di applicare: e' ciò che rende l'import annullabile. */
export function importSnapshot(data: CrmData): CrmData {
  return JSON.parse(JSON.stringify(data)) as CrmData;
}

/**
 * Applica l'anteprima. Solo qui nascono id e data di aggiornamento: gli immobili
 * con lo stesso codice si aggiornano (l'id esistente non cambia), gli altri si
 * aggiungono, e i proprietari mai visti entrano in rubrica. Se il file ripete un
 * codice, vince l'ultima riga.
 */
export function applyArea159Import(
  data: CrmData,
  preview: Area159ImportPreview,
  today = new Date(),
): CrmData {
  const updatedAt = today.toISOString().slice(0, 10);
  const incoming: PropertyRecord[] = preview.properties.map((draft) => ({
    ...draft,
    id: makeId("property"),
    updatedAt,
  }));
  const pending = new Map(incoming.map((property) => [codeKey(property.code), property]));

  const properties = data.properties.map((existing) => {
    const draft = pending.get(codeKey(existing.code));
    if (!draft) {
      return existing;
    }
    pending.delete(codeKey(existing.code));
    return { ...existing, ...draft, id: existing.id };
  });

  const contacts = preview.newContacts.map((draft) => ({
    id: makeId("contact"),
    name: draft.name,
    type: "Proprietario",
    status: "Attivo",
    source: "Area159",
    owner: "",
    phone: draft.phone,
    email: draft.email,
    taxCode: draft.taxCode,
    note: "",
    nextStep: "",
    updatedAt,
  }));

  return {
    ...data,
    properties: [...properties, ...Array.from(pending.values())],
    contacts: [...data.contacts, ...contacts],
  };
}
