import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eraser,
  FileDown,
  FileText,
  Gauge,
  MapPinned,
  MessageSquareText,
  Pause,
  PhoneCall,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react";

type TelefonistaMode = "principiante" | "esperto";
type ScriptPhaseKey = "apertura" | "aggancio" | "indagine" | "perizia" | "obiezioni" | "chiusura";
type CallOutcome =
  | "Perizia fissata"
  | "Da richiamare"
  | "Info raccolte"
  | "Non interessato ora"
  | "Numero errato"
  | "Segnalazione ricevuta";

type CallContext = {
  owner: string;
  operator: string;
  zone: string;
  street: string;
  building: string;
  property: string;
};

type CallLog = {
  id: string;
  createdAt: string;
  duration: number;
  outcome: CallOutcome;
  context: CallContext;
  notes: string;
  checklist: string[];
};

type TelefonistaToolProps = {
  onNavigate: (path: string) => void;
};

const callStorageKey = "fenix-telefonista-calls-v1";
const draftStorageKey = "fenix-telefonista-draft-v1";

const emptyContext: CallContext = {
  owner: "",
  operator: "",
  zone: "",
  street: "",
  building: "",
  property: "",
};

const outcomes: CallOutcome[] = [
  "Perizia fissata",
  "Da richiamare",
  "Info raccolte",
  "Non interessato ora",
  "Numero errato",
  "Segnalazione ricevuta",
];

const checklistItems = [
  "Proprietario confermato",
  "Situazione immobile aggiornata",
  "Motivazione o tempi capiti",
  "Proposta perizia presentata",
  "Vicini o conoscenti chiesti",
  "Esito finale scritto nelle note",
];

const objections = [
  {
    label: "Non vendo",
    answer:
      "La capisco. Non la chiamo per forzarla a vendere, ma per darle un valore aggiornato dell'immobile. Anche se oggi non vende, sapere il prezzo reale le evita decisioni al buio in futuro.",
  },
  {
    label: "Ho gia' un'agenzia",
    answer:
      "Perfetto, allora e' ancora piu' utile avere un secondo parere gratuito. Non le chiedo di cambiare nulla: le propongo solo una valutazione tecnica per confrontare i dati.",
  },
  {
    label: "Non mi interessa",
    answer:
      "Nessun problema. Le faccio una sola domanda pratica: preferisce che la richiami piu' avanti o registro che al momento non vuole aggiornamenti sulla valutazione?",
  },
  {
    label: "Mi richiami piu' avanti",
    answer:
      "Certo. Per non disturbarla a caso, mi dice quale periodo ha piu' senso per lei? Intanto segno se l'immobile e' abitato, libero o locato.",
  },
  {
    label: "Come avete il numero?",
    answer:
      "Stiamo lavorando su contatti e immobili gia' censiti in zona. Se preferisce non ricevere altre chiamate, lo registro subito e non la disturbo oltre.",
  },
  {
    label: "Mi mandi un messaggio",
    answer:
      "Glielo mando volentieri. Prima pero' mi basta capire un dettaglio, cosi' il messaggio e' utile: parliamo dello stesso immobile o la situazione e' cambiata?",
  },
];

function loadCalls() {
  try {
    const parsed = JSON.parse(localStorage.getItem(callStorageKey) || "[]") as CallLog[];
    return Array.isArray(parsed)
      ? parsed
          .filter((call) => call && typeof call === "object")
          .map((call) => ({
            id: String(call.id || `${Date.now()}-${Math.random()}`),
            createdAt: String(call.createdAt || new Date().toISOString()),
            duration: Number.isFinite(call.duration) ? call.duration : 0,
            outcome: outcomes.includes(call.outcome) ? call.outcome : "Info raccolte",
            context: { ...emptyContext, ...(call.context || {}) },
            notes: String(call.notes || ""),
            checklist: Array.isArray(call.checklist) ? call.checklist.filter(Boolean).map(String) : [],
          }))
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftStorageKey) || "{}") as Partial<{
      context: CallContext;
      notes: string;
      outcome: CallOutcome;
      checked: string[];
      mode: TelefonistaMode;
      phase: ScriptPhaseKey;
    }>;
  } catch {
    return {};
  }
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function createSummary(log: Omit<CallLog, "id" | "createdAt">) {
  const subject = log.context.owner || "Proprietario non indicato";
  const address = [log.context.zone, log.context.street, log.context.building, log.context.property]
    .filter(Boolean)
    .join(" / ");
  return [
    `Telefonata: ${subject}`,
    `Esito: ${log.outcome}`,
    `Durata: ${formatDuration(log.duration)}`,
    address ? `Riferimento: ${address}` : "Riferimento: non indicato",
    log.context.operator ? `Operatore: ${log.context.operator}` : "Operatore: non indicato",
    `Punti raccolti: ${log.checklist.length}/${checklistItems.length}`,
    "",
    "Note:",
    log.notes || "Nessuna nota inserita.",
  ].join("\n");
}

function downloadTextFile(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildScript() {
  return [
    {
      key: "apertura" as const,
      title: "Apertura",
      icon: PhoneCall,
      beginner: [
        "Telefonista: Buongiorno, parlo con il proprietario dell'immobile? Sono di Fenix Group Real Estate, la disturbo solo per un aggiornamento rapido.",
        "Se risponde: \"Dipende, per cosa?\"\nTelefonista: Le spiego subito: stiamo aggiornando le situazioni degli immobili gia' censiti in zona e vorrei capire se i dati che abbiamo sono ancora corretti.",
        "Se risponde: \"Non ho tempo\"\nTelefonista: Ha ragione, le faccio una sola domanda e poi decida lei: l'immobile e' ancora suo oppure la situazione e' cambiata?",
      ],
      expert: [
        "Apri con nome agenzia + motivo rapido.",
        "Se chiede dettagli: aggiornamento immobili censiti.",
        "Se ha fretta: una sola domanda di conferma proprieta.",
      ],
    },
    {
      key: "aggancio" as const,
      title: "Aggancio",
      icon: Target,
      beginner: [
        "Telefonista: Non la chiamo per venderle qualcosa al telefono. Prima mi serve capire se la situazione dell'immobile e' ancora quella registrata.",
        "Se risponde: \"Non vendo\"\nTelefonista: Perfetto, infatti non le sto chiedendo di vendere. Anche chi non vende spesso vuole sapere quanto vale oggi casa sua, soprattutto se il mercato della zona si muove.",
        "Telefonista: Se ha senso, le propongo una perizia gratuita. Se non ha senso, chiudiamo qui e aggiorno semplicemente la scheda.",
      ],
      expert: [
        "Disinnesca: non sto vendendo nulla.",
        "Aggancia al valore reale dell'immobile.",
        "Obiettivo: capire se proporre perizia o solo aggiornare scheda.",
      ],
    },
    {
      key: "indagine" as const,
      title: "Indagine",
      icon: ClipboardCheck,
      beginner: [
        "Telefonista: L'immobile e' ancora di sua proprieta? E oggi e' abitato da lei, affittato, libero o gestito da qualcun altro?",
        "Se risponde in modo chiuso\nTelefonista: Le chiedo solo per non richiamarla con informazioni sbagliate. Se mi dice lo stato attuale, aggiorno la scheda e non le faccio perdere tempo.",
        "Telefonista: Ha mai fatto una valutazione recente o si basa ancora su una stima vecchia?",
        "Telefonista: Nel palazzo o nella via conosce qualcuno che sta pensando di vendere, affittare o semplicemente capire il valore del proprio immobile?",
        "Nota per il telefonista: scrivi subito ogni dettaglio utile nel blocchetto note: stato immobile, tempi, obiezioni, nomi di vicini o conoscenti, prossimo ricontatto.",
      ],
      expert: [
        "Conferma proprieta e stato immobile.",
        "Capisci stima recente o vecchia.",
        "Chiedi segnali su vicini/conoscenti.",
        "Annota subito: situazione, interesse, prossimo passo.",
      ],
    },
    {
      key: "perizia" as const,
      title: "Perizia",
      icon: Gauge,
      beginner: [
        "Telefonista: Per darle un valore serio non basta guardare i metri quadri. Servono stato interno, piano, esposizione, palazzo e domanda reale della zona.",
        "Se risponde: \"Quanto vale?\"\nTelefonista: Al telefono rischierei di darle un numero poco serio. La cosa corretta e' far passare un tecnico per una perizia gratuita e senza impegno.",
        "Telefonista: Le torna meglio un passaggio breve questa settimana oppure la prossima? Anche solo 15 minuti per raccogliere i dati corretti.",
      ],
      expert: [
        "Non dare prezzi al telefono.",
        "Spiega perizia gratuita come dato utile, non pressione alla vendita.",
        "Chiudi proponendo due finestre temporali.",
      ],
    },
    {
      key: "obiezioni" as const,
      title: "Obiezioni",
      icon: MessageSquareText,
      beginner: objections.map((item) => `Cliente: \"${item.label}\"\nTelefonista: ${item.answer}`),
      expert: objections.map((item) => `${item.label}: rispondi breve, poi fai una domanda che riporta la chiamata su immobile/perizia.`),
    },
    {
      key: "chiusura" as const,
      title: "Chiusura",
      icon: CheckCircle2,
      beginner: [
        "Telefonista: Perfetto, allora le confermo cosa segno: situazione dell'immobile, eventuale interesse alla perizia e prossimo ricontatto.",
        "Se la perizia e' fissata\nTelefonista: Le mando conferma e faccio passare il tecnico preparato sui dati corretti. Se cambia qualcosa, ci avvisa prima dell'appuntamento.",
        "Se non fissa\nTelefonista: Va bene, aggiorno la scheda. Posso richiamarla piu' avanti o preferisce che la lasci tranquillo per ora?",
        "Dopo la chiamata: salva l'esito, scrivi le note essenziali e passa subito al prossimo contatto senza perdere il ritmo.",
      ],
      expert: ["Riepiloga dati.", "Conferma appuntamento o ricontatto.", "Chiedi consenso al prossimo contatto.", "Salva note e riparti."],
    },
  ];
}

export function TelefonistaTool({ onNavigate }: TelefonistaToolProps) {
  const draft = useMemo(loadDraft, []);
  const [context] = useState<CallContext>(() => ({ ...emptyContext, ...(draft.context || {}) }));
  const [notes, setNotes] = useState(typeof draft.notes === "string" ? draft.notes : "");
  const [mode, setMode] = useState<TelefonistaMode>(
    draft.mode === "esperto" || draft.mode === "principiante" ? draft.mode : "principiante",
  );
  const [phase, setPhase] = useState<ScriptPhaseKey>(
    ["apertura", "aggancio", "indagine", "perizia", "obiezioni", "chiusura"].includes(String(draft.phase))
      ? (draft.phase as ScriptPhaseKey)
      : "apertura",
  );
  const [outcome, setOutcome] = useState<CallOutcome>(
    outcomes.includes(draft.outcome as CallOutcome) ? (draft.outcome as CallOutcome) : "Info raccolte",
  );
  const [checked, setChecked] = useState<string[]>(
    Array.isArray(draft.checked) ? draft.checked.filter(Boolean).map(String) : [],
  );
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [calls, setCalls] = useState<CallLog[]>(loadCalls);
  const [notice, setNotice] = useState("Pronto per iniziare la telefonata.");

  const script = useMemo(() => buildScript(), []);
  const activePhase = script.find((item) => item.key === phase) || script[0];
  const activeLines = mode === "principiante" ? activePhase.beginner : activePhase.expert;
  const progress = Math.round((checked.length / checklistItems.length) * 100);
  const safeCalls = Array.isArray(calls) ? calls : [];
  const todaySeconds = safeCalls.reduce((total, call) => {
    const isToday = new Date(call.createdAt).toDateString() === new Date().toDateString();
    return isToday ? total + call.duration : total;
  }, 0);

  useEffect(() => {
    document.title = "Fenix Group | Telefonista";
  }, []);

  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    localStorage.setItem(draftStorageKey, JSON.stringify({ context, notes, outcome, checked, mode, phase }));
  }, [checked, context, mode, notes, outcome, phase]);

  function toggleCheck(item: string) {
    setChecked((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item],
    );
  }

  async function copySummary() {
    const summary = createSummary({ context, notes, outcome, duration: elapsed, checklist: checked });
    try {
      await navigator.clipboard.writeText(summary);
      setNotice("Riepilogo copiato negli appunti.");
    } catch {
      setNotice("Riepilogo pronto, ma il browser non ha concesso la copia automatica.");
    }
  }

  function saveCall() {
    const log: CallLog = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
      createdAt: new Date().toISOString(),
      duration: elapsed,
      outcome,
      context,
      notes,
      checklist: checked,
    };
    const nextCalls = [log, ...safeCalls].slice(0, 8);
    setCalls(nextCalls);
    localStorage.setItem(callStorageKey, JSON.stringify(nextCalls));
    setNotice("Chiamata salvata nello storico locale.");
  }

  function resetCall() {
    setRunning(false);
    setElapsed(0);
    setNotes("");
    setChecked([]);
    setOutcome("Info raccolte");
    setPhase("apertura");
    setNotice("Scheda chiamata pulita.");
  }

  return (
    <main className="telefonista-shell">
      <header className="telefonista-header">
        <button
          className="telefonista-ghost-button"
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
              return;
            }
            onNavigate("/");
          }}
        >
          <ArrowLeft size={17} />
          Indietro
        </button>
        <img src="/logo.png" alt="Fenix Group" />
        <button className="telefonista-ghost-button" type="button" onClick={() => onNavigate("/crm")}>
          CRM
        </button>
      </header>

      <section className="telefonista-hero">
        <span>Script per proprietari censiti</span>
        <h1>Telefonista</h1>
        <p>
          Guida operativa per gestire chiamate immobiliari, raccogliere informazioni utili e fissare perizie
          gratuite senza perdere il controllo della conversazione.
        </p>
      </section>

      <section className="telefonista-grid">
        <aside className="telefonista-card telefonista-control-panel">
          <div className="telefonista-section-title">
            <Gauge size={18} />
            <span>Modalita chiamata</span>
          </div>

          <div className="telefonista-mode-switch" aria-label="Modalita script">
            <button className={mode === "principiante" ? "active" : ""} type="button" onClick={() => setMode("principiante")}>
              <BookOpenText size={16} />
              Principiante
            </button>
            <button className={mode === "esperto" ? "active" : ""} type="button" onClick={() => setMode("esperto")}>
              <Sparkles size={16} />
              Esperto
            </button>
          </div>

          <div className="telefonista-timer">
            <small>Tempo chiamata</small>
            <strong>{formatDuration(elapsed)}</strong>
            <div>
              <button type="button" onClick={() => setRunning((value) => !value)}>
                {running ? <Pause size={16} /> : <Play size={16} />}
                {running ? "Pausa" : "Start"}
              </button>
              <button type="button" onClick={() => { setRunning(false); setElapsed(0); }}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>
        </aside>

        <section className="telefonista-card telefonista-script-panel">
          <div className="telefonista-script-head">
            <div>
              <span>Script operativo</span>
              <h2>{activePhase.title}</h2>
            </div>
            <strong>{mode === "principiante" ? "Guidato" : "Sintesi"}</strong>
          </div>

          <nav className="telefonista-phase-nav" aria-label="Fasi telefonata">
            {script.map(({ key, title, icon: Icon }) => (
              <button className={phase === key ? "active" : ""} key={key} type="button" onClick={() => setPhase(key)}>
                <Icon size={17} />
                {title}
              </button>
            ))}
          </nav>

          <div className="telefonista-script-lines">
            {activeLines.map((line, index) => (
              <article key={`${activePhase.key}-${index}`}>
                <span>{index + 1}</span>
                <p>{line}</p>
              </article>
            ))}
          </div>

          <div className="telefonista-objections">
            <h3>Risposte rapide</h3>
            <div>
              {objections.map((item) => (
                <details key={item.label}>
                  <summary>{item.label}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <aside className="telefonista-card telefonista-notes-panel">
          <div className="telefonista-section-title">
            <FileText size={18} />
            <span>Blocchetto note</span>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Scrivi cosa e' successo durante la telefonata: situazione immobile, disponibilita, obiezioni, persone citate, prossimo ricontatto..."
          />

          <div className="telefonista-checklist-head">
            <span>Controllo rapido</span>
            <strong>{progress}%</strong>
          </div>
          <div className="telefonista-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="telefonista-checklist">
            {checklistItems.map((item) => (
              <button className={checked.includes(item) ? "checked" : ""} key={item} type="button" onClick={() => toggleCheck(item)}>
                <CheckCircle2 size={16} />
                {item}
              </button>
            ))}
          </div>

          <label className="telefonista-outcome">
            Esito
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as CallOutcome)}>
              {outcomes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <div className="telefonista-actions">
            <button type="button" onClick={copySummary}>
              <Copy size={16} />
              Copia
            </button>
            <button type="button" onClick={saveCall}>
              <Save size={16} />
              Salva
            </button>
            <button type="button" onClick={resetCall}>
              <Eraser size={16} />
              Pulisci
            </button>
          </div>

          <div className="telefonista-notice">
            <TimerReset size={16} />
            <span>{notice}</span>
          </div>
        </aside>
      </section>

      <section className="telefonista-history">
        <div>
          <span>Tempo lavorato oggi</span>
          <strong>{formatDuration(todaySeconds)}</strong>
        </div>
        <button
          type="button"
          onClick={() => {
            const exportContent = safeCalls
              .map((call) => createSummary(call))
              .join("\n\n---\n\n");
            downloadTextFile("storico-telefonista-fenix.txt", exportContent || "Nessuna chiamata salvata.");
          }}
        >
          <FileDown size={16} />
          Esporta storico
        </button>
      </section>

      <section className="telefonista-call-list" aria-label="Ultime chiamate salvate">
        {safeCalls.length === 0 ? (
          <article>
            <MapPinned size={18} />
            <span>Nessuna chiamata salvata. Quando finisci una telefonata, salva l'esito per ritrovarlo qui.</span>
          </article>
        ) : (
          safeCalls.map((call) => (
            <article key={call.id}>
              <PhoneCall size={18} />
              <span>
                <strong>{call.context.owner || "Proprietario non indicato"}</strong>
                {call.outcome} - {formatDuration(call.duration)}
              </span>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
