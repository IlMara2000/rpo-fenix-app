import { useEffect, useMemo, useRef, useState } from "react";
import { censusOperatingContext } from "./censusContext";
import {
  clearCyborgLocalDb,
  cyborgDbStats,
  deleteCyborgSession,
  exportCyborgCsv,
  exportCyborgSessionFile,
  importCyborgSessionFile,
  loadCyborgActiveSessionId,
  loadCyborgLocalDb,
  loadCyborgLocalSessions,
  loadCyborgSession,
  saveCyborgLocalDb,
  saveCyborgSession,
  type CyborgLocalRecord,
  type CyborgLocalSession,
} from "./cyborgLocalStore";
import { cyborgPanelUrl, prepareCyborgImport, type CyborgImport } from "./cyborgImport";

/** Ogni quanto richiedere la presenza dell'estensione: nessun timeout la spegne. */
const PROBE_INTERVAL_MS = 2000;
/** Dopo quanto avvisare che l'estensione non si vede ancora (la ricerca continua). */
const FIRST_HINT_MS = 4000;
/** Dopo quanto segnalare che il pannello è stato trovato ma non ha risposto. */
const PANEL_READY_TIMEOUT_MS = 8000;

type ExtensionHost = "chromium" | "firefox" | "other";

/**
 * Il pannello è un'estensione Chromium (Chrome, Edge, Brave): altrove non esiste
 * alcun collegamento possibile e conviene dirlo invece di lasciare in attesa.
 */
function extensionHost(): ExtensionHost {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/firefox|fxios/i.test(ua)) return "firefox";
  if (/chrome|chromium|edg\//i.test(ua)) return "chromium";
  return "other";
}

function automationHint(): string {
  if (extensionHost() !== "chromium") {
    return "Le automazioni sulle schede esterne (Sister, Area, CercaOra e simili) richiedono l’estensione CYBORG CENS in Chrome, Edge o Brave. Il resto del pannello funziona comunque da qui.";
  }
  const origin = typeof location === "undefined" ? "" : location.origin;
  const embedded = typeof window !== "undefined" && window.top !== window.self;
  const parts = [
    `Estensione non rilevata${origin ? ` su ${origin}` : ""}. Le automazioni sulle schede esterne funzionano solo con CYBORG CENS installata e attiva: continuo a cercarla.`,
  ];
  if (embedded) {
    parts.push("Questa pagina è dentro un riquadro: aprila in una scheda normale del browser, l’estensione non arriva nei riquadri incorporati.");
  } else {
    parts.push("Controlla che l’estensione sia attiva, che questa origine sia ammessa e, se i file sono cambiati, ricaricala dalla pagina Estensioni e poi ricarica questa pagina.");
  }
  return parts.join(" ");
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function textCell(value: unknown) {
  const v = value == null ? "" : String(value);
  return v.length > 80 ? `${v.slice(0, 77)}…` : v;
}

export function CyborgPanel({
  onImport,
  preview,
}: {
  onImport: (batch: CyborgImport) => void;
  preview: (batch: CyborgImport) => {
    addedContacts: number;
    addedProperties: number;
    duplicates: number;
    skipped: number;
  };
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [panelUrl, setPanelUrl] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [automationMessage, setAutomationMessage] = useState("Ricerca dell’estensione per le automazioni…");
  const [batch, setBatch] = useState<CyborgImport | null>(null);
  const [localDb, setLocalDb] = useState<CyborgLocalRecord[]>(() => loadCyborgLocalDb());
  const [sessions, setSessions] = useState<CyborgLocalSession[]>(() => loadCyborgLocalSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => loadCyborgActiveSessionId());
  const [localMessage, setLocalMessage] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [showRows, setShowRows] = useState(100);
  const sessionFileInput = useRef<HTMLInputElement>(null);

  const refreshLocal = () => {
    setLocalDb(loadCyborgLocalDb());
    setSessions(loadCyborgLocalSessions());
    setActiveSessionId(loadCyborgActiveSessionId());
  };

  useEffect(() => {
    const requestId = crypto.randomUUID();
    let hinted = false;
    let announced = false;
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;
      if (event.data?.type !== "GRFENIX_CYBORG_DISCOVERED" || event.data.requestId !== requestId) return;
      const url = cyborgPanelUrl(event.data.panelUrl, location.origin);
      if (!url) {
        setAutomationMessage(
          "L’estensione ha risposto con una pagina non riconosciuta. Ricarica CYBORG CENS aggiornata dalla pagina Estensioni.",
        );
        return;
      }
      hinted = true;
      setPanelUrl((current) => (current === url ? current : url));
      if (!announced && !readyRef.current) {
        announced = true;
        setAutomationMessage("Estensione collegata. Caricamento pannello automazioni…");
      }
    };
    window.addEventListener("message", receive);
    const discover = () => window.postMessage({ type: "GRFENIX_CYBORG_DISCOVER", requestId }, location.origin);
    discover();
    const probe = window.setInterval(discover, PROBE_INTERVAL_MS);
    const hint = window.setTimeout(() => {
      if (!hinted && !readyRef.current) setAutomationMessage(automationHint());
    }, FIRST_HINT_MS);
    return () => {
      window.removeEventListener("message", receive);
      clearInterval(probe);
      clearTimeout(hint);
    };
  }, [attempt]);

  useEffect(() => {
    if (!panelUrl) return;
    const origin = panelUrl.slice(0, panelUrl.indexOf("/popup.html"));
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin) return;
      if (event.data?.type === "GRFENIX_CYBORG_READY") {
        readyRef.current = true;
        setReady(true);
        setAutomationMessage("Estensione collegata: le automazioni sulle schede esterne sono disponibili.");
      }
      if (event.data?.type === "GRFENIX_CYBORG_IMPORT") {
        try {
          const records = event.data.records;
          // Tiene una copia nel gestionale così il DB resta disponibile anche senza estensione.
          saveCyborgLocalDb(Array.isArray(records) ? records : []);
          refreshLocal();
          setBatch(prepareCyborgImport(records));
          setLocalMessage("DB ricevuto dall’estensione e copiato nel gestionale. Controlla il riepilogo prima di salvare.");
        } catch (error) {
          setLocalMessage(error instanceof Error ? error.message : "Importazione non valida.");
        }
      }
    };
    window.addEventListener("message", receive);
    const slow = window.setTimeout(() => {
      if (!readyRef.current)
        setAutomationMessage(
          "Il pannello estensione è stato trovato ma non ha risposto. Ricarica CYBORG CENS dalla pagina Estensioni e, se serve, questa pagina.",
        );
    }, PANEL_READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", receive);
      clearTimeout(slow);
    };
  }, [panelUrl]);

  const stats = useMemo(() => cyborgDbStats(localDb), [localDb]);
  const report = batch ? preview(batch) : null;

  const prepareLocalImport = () => {
    try {
      if (!localDb.length) {
        setLocalMessage("Il database nel gestionale è vuoto. Carica una sessione, importa un file o ricevi il DB dall’estensione.");
        return;
      }
      setBatch(prepareCyborgImport(localDb));
      setLocalMessage("Controlla il riepilogo prima di salvare nel Censimento.");
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : "Impossibile preparare l’importazione.");
    }
  };

  const saveSession = () => {
    const result = saveCyborgSession(sessionName);
    if ("error" in result && result.error) {
      setLocalMessage(result.error);
      return;
    }
    refreshLocal();
    setLocalMessage(result.overwritten ? `Sessione "${result.session.nome}" aggiornata.` : `Sessione "${result.session.nome}" salvata.`);
  };

  const loadSession = (id: string, nome: string) => {
    if (!window.confirm(`Caricare "${nome}" al posto del database corrente nel gestionale?`)) return;
    const db = loadCyborgSession(id);
    if (!db) {
      setLocalMessage("Sessione non trovata.");
      return;
    }
    refreshLocal();
    setBatch(null);
    setShowRows(100);
    setLocalMessage(`Sessione "${nome}" caricata (${db.length} record).`);
  };

  const removeSession = (id: string, nome: string, count: number) => {
    if (!window.confirm(`Eliminare definitivamente "${nome}" (${count} record) dalle sessioni salvate nel gestionale?`)) return;
    if (deleteCyborgSession(id)) {
      refreshLocal();
      setLocalMessage(`Sessione "${nome}" eliminata.`);
    }
  };

  const importSession = async (file: File | undefined) => {
    if (!file) return;
    let result = await importCyborgSessionFile(file);
    if ("conflict" in result) {
      if (!window.confirm(`Esiste già una sessione chiamata "${result.conflict}". Vuoi sovrascriverla con il file importato?`)) {
        return;
      }
      result = await importCyborgSessionFile(file, { replace: true });
    }
    if ("error" in result) {
      setLocalMessage(result.error);
      return;
    }
    if ("session" in result) {
      refreshLocal();
      setLocalMessage(
        `Sessione "${result.session.nome}" ${result.replaced ? "aggiornata" : "importata"} da file (${result.session.recordCount} record).`,
      );
    }
  };

  return (
    <section className="cyborg-workspace" aria-label="CYBORG CENS">
      <header>
        <strong>CYBORG CENS</strong>
        <p>
          {`Ufficio ${censusOperatingContext.office} · ${censusOperatingContext.officeAddress}. Area operativa: ${censusOperatingContext.area}.`}{" "}
          Gli indirizzi dei contatti non vengono considerati immobili di proprietà senza riferimenti catastali.
        </p>
        <p>
          Database, sessioni, esportazione e importazione nel Censimento sono disponibili qui, anche senza estensione. Le
          automazioni sulle schede esterne (Sister, Area, CercaOra, iniezioni) restano nell’estensione.
        </p>
      </header>

      {localMessage ? <p role="status">{localMessage}</p> : null}

      {batch && report && (
        <section className="cyborg-import-preview" aria-label="Anteprima importazione">
          <h3>Importa nel Censimento</h3>
          <p>
            Nuovi proprietari: {report.addedContacts}. Nuovi immobili: {report.addedProperties}. Elementi già presenti o
            ripetuti: {report.duplicates}. Record non utilizzabili: {report.skipped}.
          </p>
          <p>
            Le schede già presenti vengono conservate. I record originali restano nel database di origine e i dati importati
            conservano una copia del record sorgente.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                onImport(batch);
                setBatch(null);
                setLocalMessage("Importazione completata nel Censimento.");
              } catch (error) {
                setLocalMessage(error instanceof Error ? error.message : "Salvataggio non riuscito.");
              }
            }}
          >
            Conferma importazione
          </button>
          <button
            type="button"
            onClick={() => {
              setBatch(null);
              setLocalMessage("Importazione annullata.");
            }}
          >
            Annulla
          </button>
        </section>
      )}

      <section className="cyborg-local-db" aria-label="Database record nel gestionale">
        <h3>Database dei record (nel gestionale)</h3>
        <p>
          Record: {stats.total} · con nominativo: {stats.withName} · con codice fiscale: {stats.withCf}
          {activeSessionId ? ` · sessione attiva: ${sessions.find((s) => s.id === activeSessionId)?.nome || "sconosciuta"}` : " · nessuna sessione attiva"}
        </p>
        <div className="cyborg-actions">
          <button type="button" onClick={prepareLocalImport} disabled={!localDb.length}>
            Anteprima e importa nel Censimento
          </button>
          <button type="button" onClick={() => exportCyborgCsv(localDb, true)} disabled={!localDb.length}>
            Esporta CSV impaginato
          </button>
          <button type="button" onClick={() => exportCyborgCsv(localDb, false)} disabled={!localDb.length}>
            Esporta CSV grezzo
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Svuotare il database dei record salvato nel gestionale? Le sessioni salvate non vengono eliminate.")) return;
              clearCyborgLocalDb();
              refreshLocal();
              setBatch(null);
              setShowRows(100);
              setLocalMessage("Database nel gestionale svuotato.");
            }}
            disabled={!localDb.length}
          >
            Svuota database
          </button>
        </div>
        {localDb.length ? (
          <div className="cyborg-table-wrap">
            <table className="cyborg-records-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>F</th>
                  <th>P</th>
                  <th>S</th>
                  <th>Indirizzo</th>
                  <th>Cat.</th>
                  <th>Cons.</th>
                  <th>Nominativo</th>
                  <th>CF</th>
                  <th>Titolarità</th>
                  <th>Telefono</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {localDb.slice(0, showRows).map((r, i) => (
                  <tr key={i}>
                    <td>{textCell(r.type || "PROP")}</td>
                    <td>{textCell(r.f)}</td>
                    <td>{textCell(r.p)}</td>
                    <td>{textCell(r.s)}</td>
                    <td>{textCell(r.ind)}</td>
                    <td>{textCell(r.cat)}</td>
                    <td>{textCell(r.cons)}</td>
                    <td>{textCell(r.prop)}</td>
                    <td>{textCell(r.cf)}</td>
                    <td>{textCell(r.usu)}</td>
                    <td>{textCell(r.telefono)}</td>
                    <td>{textCell(r.email)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {localDb.length > showRows ? (
              <button type="button" onClick={() => setShowRows((n) => n + 200)}>
                Mostra altri record ({localDb.length - showRows} rimanenti)
              </button>
            ) : null}
          </div>
        ) : (
          <p>Nessun record nel gestionale. Puoi caricare una sessione, importare un file di sessione o ricevere il database dall’estensione quando è collegata.</p>
        )}
      </section>

      <section className="cyborg-sessions" aria-label="Sessioni">
        <h3>Sessioni</h3>
        <p>Le sessioni salvano il database corrente nel gestionale. Puoi esportarle e importarle anche come file compatibili con l’estensione.</p>
        <div className="cyborg-actions">
          <label>
            Nome sessione{" "}
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Es. Milano Monte Nero - consegna 1"
            />
          </label>
          <button type="button" onClick={saveSession} disabled={!localDb.length && !sessionName.trim()}>
            Salva sessione
          </button>
          <button type="button" onClick={() => sessionFileInput.current?.click()}>
            Importa sessione da file
          </button>
          <input
            ref={sessionFileInput}
            type="file"
            accept=".json,application/json,.cyborg-cens-session.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void importSession(file);
            }}
          />
        </div>
        {sessions.length ? (
          <ul className="cyborg-session-list">
            {sessions.map((session) => (
              <li key={session.id}>
                <div>
                  <strong>
                    {session.nome}
                    {session.id === activeSessionId ? " (attiva)" : ""}
                  </strong>
                  <div>
                    {session.recordCount} record · {formatDate(session.aggiornataIl)}
                    {session.nomeRubricaPdf ? ` · PDF ${session.nomeRubricaPdf}` : ""}
                  </div>
                </div>
                <div className="cyborg-actions">
                  <button type="button" onClick={() => loadSession(session.id, session.nome)}>
                    Carica
                  </button>
                  <button type="button" onClick={() => exportCyborgSessionFile(session.id)}>
                    Esporta
                  </button>
                  <button type="button" onClick={() => removeSession(session.id, session.nome, session.recordCount)}>
                    Elimina
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nessuna sessione salvata nel gestionale.</p>
        )}
      </section>

      <section className="cyborg-automation" aria-label="Automazioni estensione">
        <h3>Automazioni sulle schede esterne (estensione)</h3>
        <p role="status">{automationMessage}</p>
        <p>
          {ready
            ? "Il pannello completo dell’estensione è collegato: da qui puoi usare le automazioni e, con “IMPORTA DB IN CENSIMENTO”, inviare il database al gestionale per anteprima e salvataggio."
            : "Se l’estensione non c’è, database, sessioni, esportazione e importazione nel Censimento restano comunque utilizzabili qui sopra. Le sole operazioni che leggono o pilotano Sister/Area e le altre schede richiedono l’estensione."}
        </p>
        {!ready && (
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Riprova collegamento estensione
          </button>
        )}
        {panelUrl ? <iframe ref={frame} src={panelUrl} title="Pannello completo CYBORG CENS" className="cyborg-frame" /> : null}
      </section>
    </section>
  );
}
