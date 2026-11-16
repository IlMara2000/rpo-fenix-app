import { privateStorage } from "../lib/privateStorage";

export type CyborgLocalRecord = Record<string, unknown>;

export type CyborgLocalSession = {
  id: string;
  nome: string;
  creataIl: string;
  aggiornataIl: string;
  recordCount: number;
  nomeRubricaPdf: string;
  pagineRubricaPdf: number;
  snapshot: Record<string, unknown>;
};

type CyborgLocalState = {
  db: CyborgLocalRecord[];
  sessions: CyborgLocalSession[];
  activeSessionId: string;
};

const STORAGE_KEY = "cyborg-cens-local-v1";
const SESSION_EXPORT_FORMAT = "cyborg-cens-session";
const SESSION_EXPORT_VERSION = 1;

function emptyState(): CyborgLocalState {
  return { db: [], sessions: [], activeSessionId: "" };
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readState(): CyborgLocalState {
  try {
    const raw = privateStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<CyborgLocalState>;
    return {
      db: asArray<CyborgLocalRecord>(parsed.db),
      sessions: asArray<CyborgLocalSession>(parsed.sessions).map(normalizeStoredSession),
      activeSessionId: asText(parsed.activeSessionId),
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: CyborgLocalState) {
  try {
    privateStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Nessun proprietario di sessione: il salvataggio locale non è disponibile.
  }
}

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      /* fallback sotto */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sessione-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name: unknown) {
  return String(name || "").replace(/\s+/g, " ").trim();
}

function defaultSnapshot(db: CyborgLocalRecord[]) {
  // Compatibile con i file di sessione dell'estensione: contiene almeno il DB e
  // i campi che l'estensione si aspetta di trovare al caricamento.
  return {
    db: cloneValue(db),
    ultimoIndiceCF: 0,
    ultimoIndiceCRM: 0,
    ultimoImmobileCRMKey: "",
    ultimoIndiceGRFenix: 0,
    ultimoAutoIntestatariRowIndex: null,
    testoRubrica: "",
    nomeRubricaPdf: "",
    pagineRubricaPdf: 0,
    dataRubricaPdf: "",
    ultimoScanCercaOra: null,
    scanCercaOraPerCf: {},
    ultimoScanCercaOraReport: null,
    crmInjectOwnersHistory: {},
    cyborgDbRevision: 0,
  } as Record<string, unknown>;
}

function snapshotFrom(value: unknown, fallbackDb: CyborgLocalRecord[]) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const db = asArray<CyborgLocalRecord>(raw.db).length ? asArray<CyborgLocalRecord>(raw.db) : fallbackDb;
  const base = defaultSnapshot(db);
  // Mantiene anche gli altri campi presenti (sessioni esportate dall'estensione)
  // così il file resta utilizzabile anche lì.
  for (const [key, val] of Object.entries(raw)) {
    if (key === "db") continue;
    base[key] = cloneValue(val);
  }
  base.db = cloneValue(db);
  return base;
}

function sessionMeta(name: string, snapshot: Record<string, unknown>, previous?: Partial<CyborgLocalSession>): CyborgLocalSession {
  const now = new Date().toISOString();
  const db = asArray<CyborgLocalRecord>(snapshot.db);
  return {
    id: previous?.id || makeId(),
    nome: name,
    creataIl: previous?.creataIl || now,
    aggiornataIl: now,
    recordCount: db.length,
    nomeRubricaPdf: asText(snapshot.nomeRubricaPdf),
    pagineRubricaPdf: Number(snapshot.pagineRubricaPdf) || 0,
    snapshot,
  };
}

function normalizeStoredSession(value: unknown): CyborgLocalSession {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const snapshot = snapshotFrom(raw.snapshot, asArray<CyborgLocalRecord>(raw.snapshot && (raw.snapshot as any).db));
  const name = normalizeName(raw.nome) || "Sessione";
  return {
    id: asText(raw.id) || makeId(),
    nome: name,
    creataIl: asText(raw.creataIl) || new Date().toISOString(),
    aggiornataIl: asText(raw.aggiornataIl) || new Date().toISOString(),
    recordCount: asArray(snapshot.db).length,
    nomeRubricaPdf: asText(raw.nomeRubricaPdf) || asText(snapshot.nomeRubricaPdf),
    pagineRubricaPdf: Number(raw.pagineRubricaPdf) || Number(snapshot.pagineRubricaPdf) || 0,
    snapshot,
  };
}

export function loadCyborgLocalDb(): CyborgLocalRecord[] {
  return readState().db;
}

export function saveCyborgLocalDb(db: CyborgLocalRecord[]) {
  const state = readState();
  state.db = cloneValue(asArray<CyborgLocalRecord>(db));
  writeState(state);
}

export function clearCyborgLocalDb() {
  saveCyborgLocalDb([]);
}

export function loadCyborgLocalSessions() {
  return readState().sessions.slice().sort((a, b) => String(b.aggiornataIl).localeCompare(String(a.aggiornataIl)));
}

export function loadCyborgActiveSessionId() {
  return readState().activeSessionId;
}

export function saveCyborgSession(nameInput: string): { session: CyborgLocalSession; overwritten: boolean; error?: string } {
  const name = normalizeName(nameInput);
  if (!name) return { session: null as any, overwritten: false, error: "Dai un nome alla sessione." };
  const state = readState();
  const active = state.sessions.find((s) => s.id === state.activeSessionId);
  const sameName = state.sessions.find((s) => s.nome.toLowerCase() === name.toLowerCase());
  if (sameName && sameName.id !== state.activeSessionId) {
    return { session: sameName, overwritten: false, error: "Esiste già una sessione con questo nome. Caricala prima se vuoi sovrascriverla." };
  }
  const snapshot = defaultSnapshot(state.db);
  const overwriteActive = !!(active && active.nome.toLowerCase() === name.toLowerCase());
  const base = overwriteActive ? active : undefined;
  const session = sessionMeta(name, snapshot, base);
  state.sessions = base ? state.sessions.map((s) => (s.id === base.id ? session : s)) : [session, ...state.sessions];
  state.activeSessionId = session.id;
  writeState(state);
  return { session, overwritten: !!base };
}

export function loadCyborgSession(id: string): CyborgLocalRecord[] | null {
  const state = readState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) return null;
  const db = asArray<CyborgLocalRecord>(session.snapshot?.db);
  state.db = cloneValue(db);
  state.activeSessionId = session.id;
  writeState(state);
  return state.db;
}

export function deleteCyborgSession(id: string): boolean {
  const state = readState();
  const before = state.sessions.length;
  state.sessions = state.sessions.filter((s) => s.id !== id);
  if (state.sessions.length === before) return false;
  if (state.activeSessionId === id) state.activeSessionId = "";
  writeState(state);
  return true;
}

function downloadText(filename: string, content: string, type = "application/json;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sessionFileName(session: { nome: string }) {
  const base = normalizeName(session.nome).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sessione";
  return `${base}.cyborg-cens-session.json`;
}

export function exportCyborgSessionFile(id: string): string | null {
  const state = readState();
  const session = state.sessions.find((s) => s.id === id);
  if (!session) return null;
  const payload = {
    format: SESSION_EXPORT_FORMAT,
    version: SESSION_EXPORT_VERSION,
    esportatoIl: new Date().toISOString(),
    sorgente: "GRFenix",
    sessione: session,
  };
  downloadText(sessionFileName(session), JSON.stringify(payload, null, 2));
  return session.nome;
}

export async function importCyborgSessionFile(
  file: File,
  options?: { replace?: boolean },
): Promise<{ session: CyborgLocalSession; replaced: boolean } | { conflict: string } | { error: string }> {
  let parsed: any;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { error: "Il file non contiene JSON valido." };
  }
  const rawSession =
    parsed?.format === SESSION_EXPORT_FORMAT
      ? parsed.sessione
      : parsed?.sessione?.snapshot
        ? parsed.sessione
        : parsed?.snapshot
          ? parsed
          : null;
  if (!rawSession || !rawSession.snapshot) return { error: "Il file non è un export sessione CYBORG CENS valido." };

  const state = readState();
  const importedName = normalizeName(rawSession.nome) || "Sessione importata";
  const existing = state.sessions.find((s) => s.nome.toLowerCase() === importedName.toLowerCase());
  if (existing && !options?.replace) return { conflict: existing.nome };

  const session = sessionMeta(importedName, snapshotFrom(rawSession.snapshot, []), {
    id: existing?.id || asText(rawSession.id) || undefined,
    creataIl: existing?.creataIl || asText(rawSession.creataIl) || undefined,
  });
  if (existing) {
    state.sessions = state.sessions.map((s) => (s.id === existing.id ? session : s));
  } else {
    if (state.sessions.some((s) => s.id === session.id)) session.id = makeId();
    state.sessions = [session, ...state.sessions];
  }
  writeState(state);
  return { session, replaced: !!existing };
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function groupByProperty(db: CyborgLocalRecord[]) {
  const groups = new Map<string, CyborgLocalRecord[]>();
  db.forEach((record, index) => {
    const f = String(record?.f ?? "").trim().replace(/\s+/g, "").toUpperCase().replace(/^0+(?=\d)/, "");
    const p = String(record?.p ?? "").trim().replace(/\s+/g, "").toUpperCase().replace(/^0+(?=\d)/, "");
    const s = String(record?.s ?? "").trim().replace(/\s+/g, "").toUpperCase().replace(/^0+(?=\d)/, "");
    const key = f || p ? `${f}|${p}|${s}` : `__SENZA_CATASTO__|${index}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  });
  return Array.from(groups.values());
}

export function exportCyborgCsv(db: CyborgLocalRecord[], formatted: boolean) {
  let csv = "";
  if (formatted) {
    csv = "\uFEFFF;PART;SUB;INDIRIZZO E N. CIVICO;CATEG. E CLASSE;CONSIST.;PROPRIETARI E/O COMPROPRIETARI;CODICE FISCALE;TITOLARITÀ;PROVENIENZA;NOTE;LOCATARI E/O COMPROPRIETARI;N TELEFONO LOCATARIO/PROPRIETARIO\n";
    groupByProperty(db).forEach((group) => {
      group.forEach((i, index) => {
        const noteContatti = i.email ? `EMAIL: ${String(i.email)}` : "";
        const row = index === 0
          ? [i.f || "", i.p || "", i.s || "", escapeCsvCell(i.ind || ""), i.cat || "", i.cons || "", escapeCsvCell(i.prop || ""), i.cf || "", i.usu || "", "", escapeCsvCell(noteContatti), "", i.telefono || ""]
          : ["", "", "", '""', "", "", escapeCsvCell(i.prop || ""), i.cf || "", i.usu || "", "", escapeCsvCell(noteContatti), "", i.telefono || ""];
        csv += row.join(";") + "\n";
      });
      csv += ";;;;;;;;;;;;\n";
    });
  } else {
    csv = "\uFEFFTYPE;FOGLIO;PARTICELLA;SUB;INDIRIZZO;CAT;CONSISTENZA;NOMINATIVO;CF;TITOLARITA;TELEFONO;EMAIL\n";
    db.forEach((i) => {
      const row = [i.type || "PROP", i.f || "", i.p || "", i.s || "", escapeCsvCell(i.ind || ""), i.cat || "", i.cons || "", escapeCsvCell(i.prop || ""), i.cf || "", i.usu || "", i.telefono || "", i.email || ""];
      csv += row.join(";") + "\n";
    });
  }
  downloadText(formatted ? "Report_Censimento_Impaginato.csv" : "Report_Censimento_Grezzo.csv", csv, "text/csv;charset=utf-8;");
}

export function cyborgDbStats(db: CyborgLocalRecord[]) {
  const records = asArray<CyborgLocalRecord>(db);
  return {
    total: records.length,
    withName: records.filter((i) => String(i.prop || "").trim() !== "").length,
    withCf: records.filter((i) => String(i.cf || "").trim() !== "").length,
  };
}
