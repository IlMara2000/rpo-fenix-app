import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Loader2,
  Scissors,
  ShieldCheck,
  SplitSquareHorizontal,
  UploadCloud,
} from "lucide-react";
import {
  downloadBlob,
  runRpoDivider,
  runRpoSplitter,
  type DividerResult,
  type SplitterResult,
} from "./rpoLogic";

type ToolStatus = {
  message: string;
  tone: "idle" | "loading" | "success" | "error";
};

type RpoToolProps = {
  onNavigate: (path: string) => void;
};

const tutorialCopy = [
  {
    title: "Excel Converter",
    before:
      "Prima: parti dall'Excel originale, controlla che i numeri siano nella colonna corretta e che il file non sia aperto in altri programmi.",
    after:
      "Dopo: scarica lo ZIP generato e caricalo sul portale RPO. Se il portale rifiuta il file per dimensione o crediti, passa al divisore TXT.",
  },
  {
    title: "TXT Divider",
    before:
      "Prima: usa il TXT da inviare al Registro e decidi la riga di taglio in base ai crediti disponibili o al limite del caricamento.",
    after:
      "Dopo: scarica Parte 1 e Parte 2, poi caricale separatamente sul portale RPO mantenendo l'ordine dei lotti.",
  },
  {
    title: "TXT Cleaner",
    before:
      "Prima: recupera dal portale RPO il TXT di esito elaborato e assicurati che sia il risultato corretto della lista caricata.",
    after:
      "Dopo: conserva la Lista nera per la bonifica finale dell'Excel e usa la Lista OK solo come elenco dei numeri chiamabili.",
  },
  {
    title: "Excel Scanner",
    before:
      "Prima: carica la Lista nera appena generata e lo stesso Excel originale usato all'inizio, senza cambiarne struttura o righe.",
    after:
      "Dopo: scarica l'Excel bonificato, verifica il numero di righe oscurate e usa solo quel file per lavorazione, chiamate o archivio.",
  },
];

export function RpoTool({ onNavigate }: RpoToolProps) {
  const [status, setStatus] = useState<ToolStatus>({
    message: "FENIX GROUP REAL ESTATE - RPO TOOL SUITE",
    tone: "idle",
  });
  const [loading, setLoading] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  const [converterFile, setConverterFile] = useState<File | null>(null);
  const [converterResult, setConverterResult] = useState<{ blob: Blob; fileName: string } | null>(null);

  const [dividerFile, setDividerFile] = useState<File | null>(null);
  const [splitPoint, setSplitPoint] = useState("");
  const [dividerResult, setDividerResult] = useState<DividerResult | null>(null);

  const [splitterFile, setSplitterFile] = useState<File | null>(null);
  const [splitterResult, setSplitterResult] = useState<SplitterResult | null>(null);

  const [scannerTxt, setScannerTxt] = useState<File | null>(null);
  const [scannerExcel, setScannerExcel] = useState<File | null>(null);
  const [scannerResult, setScannerResult] = useState<{ blob: Blob; count: string; baseName: string } | null>(null);

  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Fenix Group | RPO";
  }, []);

  useEffect(() => {
    if (tutorialStep === null) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-tour-card="${tutorialStep + 1}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
    });
  }, [tutorialStep]);

  const tutorialOpen = tutorialStep !== null;

  function closeTutorial() {
    setTutorialStep(null);
  }

  function goToTutorialStep(direction: 1 | -1) {
    setTutorialStep((step) => {
      if (step === null) {
        return 0;
      }

      return Math.min(Math.max(step + direction, 0), tutorialCopy.length - 1);
    });
  }

  async function runWithStatus(message: string, action: () => Promise<void>) {
    setLoading(true);
    setStatus({ message, tone: "loading" });
    try {
      await action();
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Errore durante l'elaborazione.",
        tone: "error",
      });
    } finally {
      setLoading(false);
      statusRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  async function handleConverterSubmit() {
    if (!converterFile) {
      return;
    }

    await runWithStatus("CREAZIONE ZIP RPO IN CORSO...", async () => {
      const formData = new FormData();
      formData.append("excel", converterFile);
      const response = await fetch("/api/converter", { method: "POST", body: formData });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const fileName = converterFile.name.split(".")[0].toLowerCase().replace(/\s+/g, "_");
      setConverterResult({ blob, fileName });
      setStatus({ message: "ZIP RPO creato con successo.", tone: "success" });
    });
  }

  async function handleDividerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dividerFile) {
      return;
    }

    await runWithStatus("DIVISIONE TXT IN CORSO...", async () => {
      const result = await runRpoDivider(dividerFile, splitPoint);
      setDividerResult(result);
      setStatus({
        message: `Divisione completata: ${result.countA} righe + ${result.countB} righe.`,
        tone: "success",
      });
    });
  }

  async function handleSplitterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!splitterFile) {
      return;
    }

    await runWithStatus("SEPARAZIONE ESITO RPO IN CORSO...", async () => {
      const result = await runRpoSplitter(splitterFile);
      setSplitterResult(result);
      setStatus({
        message: `Separazione completata: ${result.foundCount} iscritti, ${result.cleanCount} chiamabili.`,
        tone: "success",
      });
    });
  }

  async function handleScannerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scannerTxt || !scannerExcel) {
      return;
    }

    await runWithStatus("BONIFICA EXCEL IN CORSO...", async () => {
      const formData = new FormData();
      formData.append("txt", scannerTxt);
      formData.append("excel", scannerExcel);
      const response = await fetch("/api/scanner", { method: "POST", body: formData });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const count = response.headers.get("X-Matches") || "0";
      setScannerResult({
        blob,
        count,
        baseName: scannerExcel.name.replace(/\.xlsx$/i, ""),
      });
      setStatus({ message: `Pulizia completata: ${count} righe oscurate.`, tone: "success" });
    });
  }

  return (
    <main className="rpo-shell" data-tour-open={tutorialOpen ? "true" : "false"}>
      <header className="rpo-header">
        <button className="rpo-logo-button" type="button" onClick={() => onNavigate("/")}>
          <img src="/logo.png" alt="Fenix Group" />
        </button>
        <div className="rpo-status" data-tone={status.tone} ref={statusRef}>
          {loading ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
          <span>{status.message}</span>
        </div>
        <div className="rpo-header-actions">
          <button type="button" onClick={() => onNavigate("/planimetrie")}>
            Planimetrie
            <ArrowRight size={16} />
          </button>
          <button type="button" onClick={() => onNavigate("/crm")}>
            CRM
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <section className="rpo-grid" aria-label="Strumenti RPO">
        <article className="rpo-card" data-tour-active={tutorialStep === 0 ? "true" : "false"} data-tour-card="1">
          <ToolCardHeader
            Icon={FileSpreadsheet}
            kicker="Fase 1"
            title="Convertitore Excel"
            text="Serve a trasformare un Excel o CSV con numeri in uno ZIP pronto da caricare sul portale RPO."
          />
          {tutorialStep === 0 ? (
            <TutorialNote
              item={tutorialCopy[0]}
              onClose={closeTutorial}
              onNext={() => goToTutorialStep(1)}
              onPrevious={() => goToTutorialStep(-1)}
              step={1}
              total={tutorialCopy.length}
            />
          ) : null}
          <FilePicker
            accept=".xls,.xlsx,.csv"
            file={converterFile}
            label="Lista originale"
            onChange={(file) => {
              setConverterFile(file);
              setConverterResult(null);
            }}
          />
          <button className="rpo-primary" type="button" disabled={loading || !converterFile} onClick={handleConverterSubmit}>
            <FileArchive size={18} />
            Genera file RPO
          </button>
          {converterResult ? (
            <button
              className="rpo-secondary"
              type="button"
              onClick={() => downloadBlob(converterResult.blob, `lista_${converterResult.fileName}.zip`)}
            >
              <Download size={18} />
              Scarica ZIP
            </button>
          ) : null}
        </article>

        <article className="rpo-card" data-tour-active={tutorialStep === 1 ? "true" : "false"} data-tour-card="2">
          <ToolCardHeader
            Icon={Scissors}
            kicker="Fase 2"
            title="Divisore file RPO"
            text="Serve a dividere un TXT in due file separati dalla riga scelta, cosi gestisci lotti e crediti."
          />
          {tutorialStep === 1 ? (
            <TutorialNote
              item={tutorialCopy[1]}
              onClose={closeTutorial}
              onNext={() => goToTutorialStep(1)}
              onPrevious={() => goToTutorialStep(-1)}
              step={2}
              total={tutorialCopy.length}
            />
          ) : null}
          <form className="rpo-form" onSubmit={handleDividerSubmit}>
            <FilePicker
              accept=".txt"
              file={dividerFile}
              label="File TXT"
              onChange={(file) => {
                setDividerFile(file);
                setDividerResult(null);
              }}
            />
            <label>
              Riga da tagliare
              <input
                min="1"
                placeholder="es. 15000"
                type="number"
                value={splitPoint}
                onChange={(event) => setSplitPoint(event.target.value)}
              />
            </label>
            <button className="rpo-primary" type="submit" disabled={loading || !dividerFile || !splitPoint}>
              <SplitSquareHorizontal size={18} />
              Dividi lista
            </button>
          </form>
          {dividerResult ? (
            <div className="rpo-download-pair">
              <button type="button" onClick={() => downloadBlob(dividerResult.fileA, `${dividerResult.originalName}_PARTE1.txt`)}>
                Parte 1 ({dividerResult.countA})
              </button>
              <button type="button" onClick={() => downloadBlob(dividerResult.fileB, `${dividerResult.originalName}_PARTE2.txt`)}>
                Parte 2 ({dividerResult.countB})
              </button>
            </div>
          ) : null}
        </article>

        <article className="rpo-card" data-tour-active={tutorialStep === 2 ? "true" : "false"} data-tour-card="3">
          <ToolCardHeader
            Icon={FileText}
            kicker="Fase 3"
            title="Lista nera"
            text="Serve a leggere l'esito del Registro e produrre due TXT: numeri iscritti RPO e numeri chiamabili."
          />
          {tutorialStep === 2 ? (
            <TutorialNote
              item={tutorialCopy[2]}
              onClose={closeTutorial}
              onNext={() => goToTutorialStep(1)}
              onPrevious={() => goToTutorialStep(-1)}
              step={3}
              total={tutorialCopy.length}
            />
          ) : null}
          <form className="rpo-form" onSubmit={handleSplitterSubmit}>
            <FilePicker
              accept=".txt"
              file={splitterFile}
              label="Esito RPO"
              onChange={(file) => {
                setSplitterFile(file);
                setSplitterResult(null);
              }}
            />
            <button className="rpo-primary" type="submit" disabled={loading || !splitterFile}>
              <ShieldCheck size={18} />
              Separa lista
            </button>
          </form>
          {splitterResult ? (
            <div className="rpo-download-pair">
              <button type="button" onClick={() => downloadBlob(splitterResult.txtUno, `${splitterResult.originalName}_LISTA_NERA.txt`)}>
                Lista nera ({splitterResult.foundCount})
              </button>
              <button type="button" onClick={() => downloadBlob(splitterResult.txtZero, `${splitterResult.originalName}_LISTA_PULITA.txt`)}>
                Lista OK ({splitterResult.cleanCount})
              </button>
            </div>
          ) : null}
        </article>

        <article
          className="rpo-card rpo-card-accent"
          data-tour-active={tutorialStep === 3 ? "true" : "false"}
          data-tour-card="4"
        >
          <ToolCardHeader
            Icon={UploadCloud}
            kicker="Fase 4"
            title="Pulizia finale Excel"
            text="Serve a oscurare nell'Excel originale le righe presenti in lista nera e scaricare il file bonificato."
          />
          {tutorialStep === 3 ? (
            <TutorialNote
              item={tutorialCopy[3]}
              onClose={closeTutorial}
              onNext={() => goToTutorialStep(1)}
              onPrevious={() => goToTutorialStep(-1)}
              step={4}
              total={tutorialCopy.length}
            />
          ) : null}
          <form className="rpo-form" onSubmit={handleScannerSubmit}>
            <FilePicker
              accept=".txt"
              file={scannerTxt}
              label="TXT lista nera"
              onChange={(file) => {
                setScannerTxt(file);
                setScannerResult(null);
              }}
            />
            <FilePicker
              accept=".xls,.xlsx"
              file={scannerExcel}
              label="Excel originale"
              onChange={(file) => {
                setScannerExcel(file);
                setScannerResult(null);
              }}
            />
            <button className="rpo-primary" type="submit" disabled={loading || !scannerTxt || !scannerExcel}>
              <ShieldCheck size={18} />
              Avvia bonifica
            </button>
          </form>
          {scannerResult ? (
            <button
              className="rpo-success"
              type="button"
              onClick={() => downloadBlob(scannerResult.blob, `${scannerResult.baseName}_Lista_Bonificata.xlsx`)}
            >
              <Download size={18} />
              Scarica Excel ({scannerResult.count})
            </button>
          ) : null}
        </article>
      </section>

      <button
        className="rpo-tutorial-float"
        type="button"
        aria-pressed={tutorialOpen}
        onClick={() => setTutorialStep((step) => (step === null ? 0 : null))}
      >
        <span>{tutorialOpen ? "Chiudi" : "Tutorial"}</span>
        <HelpCircle size={28} />
      </button>

      <footer className="rpo-footer">REALINDI DEN SYSTEMS © 2026</footer>
    </main>
  );
}

function TutorialNote({
  item,
  onClose,
  onNext,
  onPrevious,
  step,
  total,
}: {
  item: (typeof tutorialCopy)[number];
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  step: number;
  total: number;
}) {
  return (
    <aside className="rpo-tour-note" data-step={step} aria-label={`Tutorial ${item.title}`}>
      <strong>{item.title}</strong>
      <span>Prima</span>
      <small>{item.before}</small>
      <span>Dopo</span>
      <small>{item.after}</small>
      <div className="rpo-tour-actions">
        <button type="button" disabled={step === 1} onClick={onPrevious}>
          Indietro
        </button>
        <button type="button" onClick={step === total ? onClose : onNext}>
          {step === total ? "Fine" : "Avanti"}
        </button>
      </div>
    </aside>
  );
}

function ToolCardHeader({
  Icon,
  kicker,
  title,
  text,
}: {
  Icon: typeof FileSpreadsheet;
  kicker: string;
  title: string;
  text: string;
}) {
  return (
    <header className="rpo-card-header">
      <span className="rpo-card-icon">
        <Icon size={22} />
      </span>
      <span>{kicker}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </header>
  );
}

function FilePicker({
  accept,
  file,
  label,
  onChange,
}: {
  accept: string;
  file: File | null;
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="rpo-file-picker">
      <span>{label}</span>
      <input
        accept={accept}
        type="file"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <small>{file?.name ?? "nessun file selezionato"}</small>
    </label>
  );
}
