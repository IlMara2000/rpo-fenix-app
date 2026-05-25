import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Box,
  Download,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { downloadDataUrl, prepareImagePayload } from "./rpoLogic";

const Plan3DGenerator = lazy(() =>
  import("./AI/Plan3DGenerator").then((module) => ({ default: module.Plan3DGenerator })),
);

type PlanimetrieToolProps = {
  onNavigate: (path: string) => void;
};

type QueueItem = {
  id: string;
  file: File;
  fileName: string;
  status: "waiting" | "processing" | "completed" | "error";
  resultImage: string | null;
  errorMessage: string;
  meta: null | {
    originalWidth?: number;
    originalHeight?: number;
    outputWidth?: number;
    outputHeight?: number;
    model?: string;
  };
};

const loadingPhrases = [
  "LETTURA PLANIMETRIA...",
  "NORMALIZZAZIONE IMMAGINE...",
  "INVIO AL MODELLO...",
  "ARREDO STANZE...",
  "FINALIZZAZIONE PNG...",
];

export function PlanimetrieTool({ onNavigate }: PlanimetrieToolProps) {
  const [loadingText, setLoadingText] = useState(loadingPhrases[0]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"furnished-2d" | "generated-3d">("furnished-2d");
  const loading = queue.some((item) => item.status === "processing");
  const activeItem = useMemo(
    () => queue.find((item) => item.id === activeViewId) ?? queue.find((item) => item.resultImage),
    [activeViewId, queue],
  );

  useEffect(() => {
    document.title = "Fenix Group | Planimetrie";
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingText(queue.length > 0 ? "CODA PLANIMETRIE ATTIVA" : "CARICA UNA FOTO O PLANIMETRIA");
      return;
    }

    let index = 0;
    setLoadingText(loadingPhrases[0]);
    const interval = window.setInterval(() => {
      index = (index + 1) % loadingPhrases.length;
      setLoadingText(loadingPhrases[index]);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [loading, queue.length]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const nextTask = queue.find((item) => item.status === "waiting");
    if (!nextTask) {
      return;
    }

    void processItem(nextTask);
  }, [loading, queue]);

  function processFiles(fileList: FileList) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    const newItems = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      status: "waiting" as const,
      resultImage: null,
      errorMessage: "",
      meta: null,
    }));
    setQueue((previous) => [...previous, ...newItems]);
  }

  async function processItem(item: QueueItem) {
    updateItem(item.id, { status: "processing", errorMessage: "" });

    try {
      const payload = await prepareImagePayload(item.file);
      const response = await fetch("/api/planimetrie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: payload.dataUrl,
          fileName: item.fileName,
          width: payload.width,
          height: payload.height,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Errore durante la generazione.");
      }

      updateItem(item.id, {
        status: "completed",
        resultImage: data.imageUrl,
        meta: data.meta ?? null,
      });
      setActiveViewId((current) => current ?? item.id);
    } catch (error) {
      updateItem(item.id, {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Errore sconosciuto.",
      });
    }
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setQueue((previous) => previous.filter((item) => item.id !== id));
    if (activeViewId === id) {
      setActiveViewId(null);
    }
  }

  return (
    <main className="plan-shell">
      <header className="plan-header">
        <button type="button" onClick={() => onNavigate("/")}>
          <ArrowLeft size={17} />
          RPO
        </button>
        <img src="/logo.png" alt="Fenix Group" />
        <button type="button" onClick={() => onNavigate("/crm")}>
          CRM
        </button>
      </header>

      <section className="plan-hero">
        <div>
          <span className="system-label">Planimetrie AI</span>
          <h1>
            {activeMode === "furnished-2d"
              ? "Genera planimetrie arredate partendo da foto o schizzi."
              : "Crea una planimetria 3D navigabile partendo da una descrizione."}
          </h1>
        </div>
        <div className="plan-hero-actions">
          <div className="plan-mode-switch" aria-label="Modalita planimetrie">
            <button
              className={activeMode === "furnished-2d" ? "active" : ""}
              type="button"
              onClick={() => setActiveMode("furnished-2d")}
            >
              <LayoutTemplate size={16} />
              2D arredata
            </button>
            <button
              className={activeMode === "generated-3d" ? "active" : ""}
              type="button"
              onClick={() => setActiveMode("generated-3d")}
            >
              <Box size={16} />
              3D AI
            </button>
          </div>
          <div className="plan-status">
            {activeMode === "furnished-2d" && loading ? <Loader2 size={17} className="spin" /> : <WandSparkles size={17} />}
            {activeMode === "furnished-2d" ? loadingText : "MOTORE 3D COLLEGATO"}
          </div>
        </div>
      </section>

      {activeMode === "generated-3d" ? (
        <Suspense
          fallback={
            <section className="plan-ai-loading">
              <Loader2 className="spin" size={22} />
              Caricamento motore 3D...
            </section>
          }
        >
          <Plan3DGenerator />
        </Suspense>
      ) : (
        <section className="plan-grid">
          <aside className="plan-queue">
            <label
              className="plan-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                processFiles(event.dataTransfer.files);
              }}
            >
              <ImagePlus size={34} />
              <span>Clicca o trascina qui la planimetria</span>
              <small>JPG, PNG, WEBP</small>
              <input
                accept="image/*"
                multiple
                type="file"
                onChange={(event) => {
                  if (event.target.files) {
                    processFiles(event.target.files);
                  }
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <div className="plan-list-header">
              <span>Monitor di sistema</span>
              {queue.length > 0 ? (
                <button type="button" onClick={() => {
                  setQueue([]);
                  setActiveViewId(null);
                }}>
                  <Trash2 size={15} />
                  Svuota
                </button>
              ) : null}
            </div>

            <div className="plan-list">
              {queue.length === 0 ? (
                <div className="plan-empty">In attesa di elaborazione</div>
              ) : null}
              {queue.map((item) => (
                <button
                  className={item.id === activeItem?.id ? "active" : ""}
                  disabled={!item.resultImage}
                  key={item.id}
                  type="button"
                  onClick={() => setActiveViewId(item.id)}
                >
                  <span>
                    <strong>{item.fileName}</strong>
                    <small data-status={item.status}>
                      {item.status === "processing"
                        ? "Elaborazione..."
                        : item.status === "completed"
                          ? "Completata"
                          : item.status === "error"
                            ? item.errorMessage
                            : "In coda"}
                    </small>
                  </span>
                  {item.resultImage ? (
                    <i
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadDataUrl(item.resultImage!, `${item.fileName.split(".")[0]}_FenixPlanimetria.png`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.stopPropagation();
                          downloadDataUrl(item.resultImage!, `${item.fileName.split(".")[0]}_FenixPlanimetria.png`);
                        }
                      }}
                    >
                      <Download size={15} />
                    </i>
                  ) : null}
                  <i
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeItem(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.stopPropagation();
                        removeItem(item.id);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </i>
                </button>
              ))}
            </div>
          </aside>

          <section className="plan-preview">
            {activeItem?.resultImage ? (
              <>
                <header>
                  <span>
                    <strong>Planimetria arredata</strong>
                    <small>
                      {activeItem.fileName}
                      {activeItem.meta?.outputWidth && activeItem.meta.outputHeight
                        ? ` - PNG ${activeItem.meta.outputWidth}x${activeItem.meta.outputHeight}`
                        : ""}
                    </small>
                  </span>
                  <b>{activeItem.meta?.model ?? "AI"}</b>
                </header>
                <div className="plan-image-frame">
                  <img src={activeItem.resultImage} alt="Planimetria arredata generata" />
                </div>
                <button
                  className="plan-download"
                  type="button"
                  onClick={() => downloadDataUrl(activeItem.resultImage!, `${activeItem.fileName.split(".")[0]}_FenixPlanimetria.png`)}
                >
                  <Download size={18} />
                  Scarica PNG finale
                </button>
              </>
            ) : (
              <div className="plan-placeholder">
                <WandSparkles size={44} />
                <span>Carica una planimetria per avviare la generazione.</span>
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
