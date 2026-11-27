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
 * Caratteri 0x80-0x9F di Windows-1252: gli unici che non coincidono con Latin-1.
 * Servono a leggere gli export salvati da Windows senza dipendere dal supporto
 * ICU dell'ambiente: la tabella e' esplicita e sempre la stessa.
 */
const windows1252High: Record<number, string> = {
  0x80: "\u20AC",
  0x81: "\u0081",
  0x82: "\u201A",
  0x83: "\u0192",
  0x84: "\u201E",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02C6",
  0x89: "\u2030",
  0x8A: "\u0160",
  0x8B: "\u2039",
  0x8C: "\u0152",
  0x8D: "\u008D",
  0x8E: "\u017D",
  0x8F: "\u008F",
  0x90: "\u0090",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201C",
  0x94: "\u201D",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02DC",
  0x99: "\u2122",
  0x9A: "\u0161",
  0x9B: "\u203A",
  0x9C: "\u0153",
  0x9D: "\u009D",
  0x9E: "\u017E",
  0x9F: "\u0178",
};

function decodeWindows1252(bytes: Uint8Array) {
  let text = "";
  bytes.forEach((byte) => {
    text += windows1252High[byte] ?? String.fromCharCode(byte);
  });
  return text;
}

export type Area159FileText = { text: string; encoding: "utf-8" | "windows-1252" };

/**
 * Legge il file: prima UTF-8 stretto, poi Windows-1252. Un export italiano
 * salvato da Windows non e' UTF-8, e leggerlo come tale trasforma «Dessì» in
 * «DessÃ¬»: un errore che finisce nei nomi e quindi nei codici stabili.
 * La scelta viene restituita, cosi' il pannello puo' dire come ha letto il file.
 */
export function decodeArea159File(bytes: Uint8Array): Area159FileText {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    return { text: decodeWindows1252(bytes), encoding: "windows-1252" };
  }
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
  kind: ["contratto", "tipo contratto", "tipologia contratto"],
  // Ripiego: in molti export la colonna contratto manca e affitto/vendita si
  // legge dalla tipologia (es. «Affitto», «Locazione», «Vendita»).
  typeHint: ["tipologia", "tipo", "tipologia immobile", "tipo immobile"],
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

/**
 * Un immobile letto dal file, senza id né data: quelli arrivano applicando.
 * Prezzo, proprietario e stato restano assenti quando il file non li porta:
 * scriverci un segnaposto qui cancellerebbe il dato buono già in archivio.
 */
export type Area159PropertyDraft = {
  code: string;
  title: string;
  zone: string;
  kind: PropertyRecord["kind"];
  price?: string;
  owner?: string;
  status?: string;
  phone?: string;
  taxCode?: string;
};

export type Area159ContactDraft = { name: string; phone: string; taxCode: string; email: string };

/** Un valore che l'app non sa rappresentare: resta com'è scritto, ma si segnala. */
export type Area159UnmappedValue = { field: "stato" | "contratto"; value: string; rows: number };

export type Area159ImportPreview = {
  rows: number;
  created: number;
  updated: number;
  newContacts: Area159ContactDraft[];
  duplicateContacts: number;
  unrecognized: string[];
  missing: string[];
  /** Stati e contratti fuori vocabolario, con quante righe li portano. */
  unmapped: Area159UnmappedValue[];
  /** Codici generati che hanno dovuto evitare un'altra scheda già in archivio. */
  collisions: string[];
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

/** Il vocabolario di stato commerciale che l'app usa nelle schede immobile. */
const propertyStatuses = [
  "Bozza",
  "Notizia",
  "In valutazione",
  "In acquisizione",
  "In gestione",
  "Sospeso",
  "In trattativa",
  "Venduto",
  "Affittato",
  "Archiviato",
] as const;

/**
 * Come Area159 (e chi scrive a mano) chiama gli stessi stati. Le chiavi sono
 * normalizzate: minuscole, senza accenti, senza punteggiatura.
 */
const statusAliases: Record<string, (typeof propertyStatuses)[number]> = {
  bozza: "Bozza",
  notizia: "Notizia",
  "in valutazione": "In valutazione",
  valutazione: "In valutazione",
  "da valutare": "In valutazione",
  "in acquisizione": "In acquisizione",
  acquisizione: "In acquisizione",
  "in gestione": "In gestione",
  gestione: "In gestione",
  attivo: "In gestione",
  attiva: "In gestione",
  disponibile: "In gestione",
  libero: "In gestione",
  sospeso: "Sospeso",
  sospesa: "Sospeso",
  sospesi: "Sospeso",
  "in trattativa": "In trattativa",
  trattativa: "In trattativa",
  "trattativa aperta": "In trattativa",
  "in trattazione": "In trattativa",
  prenotato: "In trattativa",
  riservato: "In trattativa",
  proposta: "In trattativa",
  venduto: "Venduto",
  venduta: "Venduto",
  affittato: "Affittato",
  affittata: "Affittato",
  locato: "Affittato",
  locata: "Affittato",
  archiviato: "Archiviato",
  archiviata: "Archiviato",
};

function normalizeValue(value: string) {
  return normalizeHeader(value).replace(/\s+/g, " ").trim();
}

/** Lo stato tradotto; se il valore non è nel vocabolario resta com'è ed è segnalato. */
function statusOf(row: string[], columns: Record<string, number>): { status?: string; unknown?: string } {
  const raw = cell(row, columns, "status");
  if (!raw) {
    return {};
  }
  const normalized = normalizeValue(raw);
  const exact = propertyStatuses.find((status) => normalizeValue(status) === normalized);
  if (exact) {
    return { status: exact };
  }
  const alias = statusAliases[normalized];
  if (alias) {
    return { status: alias };
  }
  return { status: raw, unknown: raw };
}

/** Contratti che l'app non sa rappresentare: vendita o affitto, ma da segnalare. */
const otherContract = /(asta|permut|nuda propriet|usufrutt|multipropriet|leasing|riscatto)/;

/**
 * Affitto o vendita: decide la colonna contratto; se manca, la tipologia.
 * Il confronto è sull'inizio della parola, così «Locazione commerciale» è
 * affitto e «Compravendita» è vendita; un contratto che l'app non conosce
 * (asta, permuta) resta vendita ma viene segnalato invece di sparire.
 */
function propertyKindOf(
  row: string[],
  columns: Record<string, number>,
): { kind: PropertyRecord["kind"]; unknown?: string } {
  const explicit = cell(row, columns, "kind");
  if (explicit) {
    const value = normalizeValue(explicit);
    if (/^(affitt|locazion|fitto)/.test(value)) {
      return { kind: "affitto" };
    }
    if (/^(vendit|compravendit|cession)/.test(value)) {
      return { kind: "vendita" };
    }
    return { kind: "vendita", unknown: explicit };
  }
  const hint = cell(row, columns, "typeHint");
  const value = normalizeValue(hint);
  if (/^(affitt|locazion|fitto)/.test(value)) {
    return { kind: "affitto" };
  }
  // La tipologia descrive l'immobile (appartamento, villa) e non è un
  // contratto: si segnala solo quando è chiaramente un contratto non gestito.
  if (otherContract.test(value)) {
    return { kind: "vendita", unknown: hint };
  }
  return { kind: "vendita" };
}

type DraftReading = {
  draft: Area159PropertyDraft;
  /** Il comune non è un campo della scheda: serve al codice stabile. */
  city: string;
  unknown: { field: Area159UnmappedValue["field"]; value: string }[];
};

/** Una riga diventa un immobile; senza codice né titolo non è una scheda. */
function propertyDraftFrom(row: string[], columns: Record<string, number>): DraftReading | null {
  const code = cell(row, columns, "code");
  const title = cell(row, columns, "title");
  if (!code && !title) {
    return null;
  }
  const city = cell(row, columns, "city");
  const zone = cell(row, columns, "zone");
  // Nome e cognome separati valgono come proprietario: è la stessa persona che
  // `contactDraftFrom` mette in rubrica, così il legame per id si trova.
  const owner =
    cell(row, columns, "owner") ||
    [cell(row, columns, "firstName"), cell(row, columns, "lastName")].filter(Boolean).join(" ");
  const price = cell(row, columns, "price");
  const phone = cell(row, columns, "phone");
  const taxCode = cell(row, columns, "taxCode");
  const status = statusOf(row, columns);
  const kind = propertyKindOf(row, columns);
  return {
    draft: {
      code,
      title: title || [zone, city].filter(Boolean).join(", ") || "Immobile senza titolo",
      zone: zone || city || "Zona da definire",
      kind: kind.kind,
      ...(price ? { price } : {}),
      ...(owner ? { owner } : {}),
      ...(status.status ? { status: status.status } : {}),
      ...(phone ? { phone } : {}),
      ...(taxCode ? { taxCode } : {}),
    },
    city,
    unknown: [
      ...(status.unknown ? [{ field: "stato" as const, value: status.unknown }] : []),
      ...(kind.unknown ? [{ field: "contratto" as const, value: kind.unknown }] : []),
    ],
  };
}

/**
 * Codice stabile per una riga che non ne ha: deriva da indirizzo, zona e comune,
 * non dalla posizione nel file. Il comune è nel seme perché due «Via Roma 1,
 * Centro» in comuni diversi sono due immobili diversi: senza, il secondo
 * avrebbe preso il codice del primo e l'avrebbe sovrascritto.
 *
 * Se il codice generato è già in archivio su un'altra scheda (titolo o zona
 * diversi) si prende il primo suffisso libero: meglio una scheda in più che una
 * scheda altrui cancellata. Lo stesso export riapplicato ritrova la scheda per
 * identità e quindi lo stesso suffisso, così non nascono doppioni.
 */
function stableCode(
  draft: Area159PropertyDraft,
  city: string,
  context: { archived: Map<string, PropertyRecord>; assigned: Set<string> },
): { code: string; collision: boolean } {
  const seed = `${normalizeHeader(draft.title)}|${normalizeHeader(draft.zone)}|${normalizeHeader(city)}`;
  let hash = 5381;
  for (const char of seed) {
    hash = ((hash * 33) ^ (char.codePointAt(0) ?? 0)) >>> 0;
  }
  const base = `A159-${hash.toString(36).toUpperCase()}`;
  const identity = `${normalizeHeader(draft.title)}|${normalizeHeader(draft.zone)}`;
  let collision = false;

  for (let attempt = 1; attempt <= 999; attempt += 1) {
    const code = attempt === 1 ? base : `${base}-${attempt}`;
    const key = codeKey(code);
    if (context.assigned.has(key)) {
      continue;
    }
    const archived = context.archived.get(key);
    if (archived) {
      const archivedIdentity = `${normalizeHeader(archived.title)}|${normalizeHeader(archived.zone)}`;
      if (archivedIdentity !== identity) {
        collision = true;
        continue;
      }
    }
    context.assigned.add(key);
    return { code, collision };
  }

  const fallback = `${base}-999`;
  context.assigned.add(codeKey(fallback));
  return { code: fallback, collision: true };
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

  const archived = new Map<string, PropertyRecord>();
  data.properties.forEach((property) => archived.set(codeKey(property.code), property));
  const assigned = new Set<string>();
  const collisions: string[] = [];
  const unmappedCounts = new Map<string, Area159UnmappedValue>();
  function countUnmapped(field: Area159UnmappedValue["field"], value: string) {
    const key = `${field}|${codeKey(value)}`;
    const seen = unmappedCounts.get(key);
    if (seen) {
      seen.rows += 1;
      return;
    }
    unmappedCounts.set(key, { field, value, rows: 1 });
  }

  const properties: Area159PropertyDraft[] = [];
  if (!contactsOnly) {
    rows.forEach((row) => {
      const reading = propertyDraftFrom(row, columns);
      if (!reading) {
        return;
      }
      reading.unknown.forEach((item) => countUnmapped(item.field, item.value));
      if (reading.draft.code) {
        // Anche un codice esplicito occupa il suo posto: una riga generata non
        // deve poterne prendere uno uguale.
        assigned.add(codeKey(reading.draft.code));
        properties.push(reading.draft);
        return;
      }
      const generated = stableCode(reading.draft, reading.city, { archived, assigned });
      if (generated.collision) {
        collisions.push(
          `«${reading.draft.title}» ha preso ${generated.code}: il codice naturale era già usato da un'altra scheda`,
        );
      }
      properties.push({ ...reading.draft, code: generated.code });
    });
  }

  const knownCodes = new Set(archived.keys());
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

  const unmapped = [...unmappedCounts.values()].sort(
    (a, b) => a.field.localeCompare(b.field) || a.value.localeCompare(b.value),
  );

  return {
    rows: rows.length,
    created: properties.length - updated,
    updated,
    newContacts,
    duplicateContacts: contacts.length - newContacts.length,
    unrecognized,
    missing,
    unmapped,
    collisions,
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

  // Il proprietario si ritrova per codice fiscale, poi per nome: lo stesso
  // export crea prima i contatti e poi li collega alle schede.
  const contactByTaxCode = new Map<string, string>();
  const contactByName = new Map<string, string>();
  [...data.contacts, ...contacts].forEach((contact) => {
    const taxCode = codeKey(contact.taxCode ?? "");
    if (taxCode) {
      contactByTaxCode.set(taxCode, contact.id);
    }
    contactByName.set(codeKey(contact.name), contact.id);
  });
  function ownerContactIdOf(draft: Area159PropertyDraft) {
    const taxCode = codeKey(draft.taxCode ?? "");
    if (taxCode) {
      const found = contactByTaxCode.get(taxCode);
      if (found) {
        return found;
      }
    }
    return contactByName.get(codeKey(draft.owner ?? ""));
  }

  const pending = new Map(preview.properties.map((draft) => [codeKey(draft.code), draft]));
  const properties = data.properties.map((existing) => {
    const draft = pending.get(codeKey(existing.code));
    if (!draft) {
      return existing;
    }
    pending.delete(codeKey(existing.code));
    const ownerContactId = ownerContactIdOf(draft);
    return {
      ...existing,
      title: draft.title,
      zone: draft.zone,
      kind: draft.kind,
      // Solo i campi che il file porta davvero: un segnaposto non deve
      // cancellare prezzo, proprietario e stato già inseriti a mano.
      ...(draft.price ? { price: draft.price } : {}),
      ...(draft.owner ? { owner: draft.owner } : {}),
      ...(draft.status ? { status: draft.status } : {}),
      ...(draft.phone ? { phone: draft.phone } : {}),
      ...(draft.taxCode ? { taxCode: draft.taxCode } : {}),
      // Il legame scelto a mano vince su quello letto nell'export.
      ...(ownerContactId && !existing.ownerContactId ? { ownerContactId } : {}),
      id: existing.id,
      updatedAt,
    };
  });

  const created: PropertyRecord[] = Array.from(pending.values()).map((draft) => {
    const ownerContactId = ownerContactIdOf(draft);
    return {
      ...draft,
      status: draft.status ?? "In gestione",
      price: draft.price ?? "Da valutare",
      owner: draft.owner ?? "Proprietario da associare",
      portals: "Bozza",
      ...(ownerContactId ? { ownerContactId } : {}),
      id: makeId("property"),
      updatedAt,
    };
  });

  return {
    ...data,
    properties: [...properties, ...created],
    contacts: [...data.contacts, ...contacts],
  };
}
