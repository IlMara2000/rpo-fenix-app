import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Box, ImagePlus, Loader2, Trash2, WandSparkles } from "lucide-react";
import { FloorPlan3DViewer } from "./FloorPlan3DViewer";
import {
  createFallbackFloorPlan,
  normalizeFloorPlan3D,
  type FloorPlan3D,
  type FloorPlan3DRequest,
  type Plan3DStyle,
} from "./floorPlan3d";
import { prepareImagePayload } from "../rpoLogic";

const defaultRequest: FloorPlan3DRequest = {
  prompt: "",
  style: "premium",
  areaSqm: 90,
  roomCount: 6,
};

type GenerateResponse = {
  success?: boolean;
  plan?: unknown;
  renderImage?: string | null;
  meta?: {
    mode?: string;
    model?: string;
    imageModel?: string;
    renderError?: string | null;
    error?: string;
    usedImage?: boolean;
  };
  error?: string;
};

export function Plan3DGenerator() {
  const [request, setRequest] = useState<FloorPlan3DRequest>(defaultRequest);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [plan, setPlan] = useState<FloorPlan3D>(() =>
    createFallbackFloorPlan(
      {
        ...defaultRequest,
        prompt: "Trilocale con soggiorno, cucina, due camere, bagno e terrazzo",
      },
      "browser-fallback",
    ),
  );
  const [loading, setLoading] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [message, setMessage] = useState("Carica una planimetria e aggiungi una descrizione sintetica.");
  const [meta, setMeta] = useState<GenerateResponse["meta"]>({ mode: "browser-fallback" });

  const hasInput = Boolean(imageFile || request.prompt.trim());
  const mergedPrompt = useMemo(() => request.prompt.trim(), [request.prompt]);
  const aiCreditsDepleted = Boolean(meta?.renderError?.toLowerCase().includes("depleted"));

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function processFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    const nextImage = nextFiles.find((file) => file.type.startsWith("image/"));

    if (nextImage) {
      setImageFile(nextImage);
    }
  }

  async function generatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasInput) {
      setMessage("Carica almeno un JPG o inserisci una descrizione.");
      return;
    }

    setLoading(true);
    setMessage("Lettura JPG e generazione layout 3D in corso...");

    try {
      const imagePayload = imageFile ? await prepareImagePayload(imageFile) : null;
      const response = await fetch("/api/planimetrie-3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          prompt: mergedPrompt || "Planimetria residenziale caricata dall'utente.",
          image: imagePayload?.dataUrl,
          imageName: imageFile?.name,
          imageWidth: imagePayload?.width,
          imageHeight: imagePayload?.height,
          outputFormat: "jpg",
        }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Generazione non riuscita.");
      }

      const normalizedPlan = normalizeFloorPlan3D(data.plan, {
        ...request,
        prompt: mergedPrompt || "Planimetria residenziale caricata dall'utente.",
      });
      setPlan(normalizedPlan);
      setFinalImageUrl(data.renderImage ?? null);
      setHasGenerated(true);
      setMeta(data.meta ?? { mode: normalizedPlan.source });
      setMessage(
        data.renderImage
          ? "JPG finale AI pronto: controlla e scarica l'immagine."
          : data.meta?.renderError?.toLowerCase().includes("depleted")
            ? "Crediti Hugging Face esauriti: ho generato gratis una planimetria arredata locale scaricabile in JPG."
            : "Ho generato gratis una planimetria arredata locale scaricabile in JPG.",
      );
    } catch (error) {
      const fallbackPlan = createFallbackFloorPlan(
        {
          ...request,
          prompt: mergedPrompt || "Planimetria residenziale caricata dall'utente.",
        },
        "browser-fallback",
      );
      setPlan(fallbackPlan);
      setFinalImageUrl(null);
      setHasGenerated(true);
      setMeta({ mode: "browser-fallback", error: error instanceof Error ? error.message : "Errore sconosciuto" });
      setMessage("Ho generato un layout locale di continuita': puoi comunque scaricare il JPG finale.");
    } finally {
      setLoading(false);
    }
  }

  function updateRequest(patch: Partial<FloorPlan3DRequest>) {
    setRequest((current) => ({ ...current, ...patch }));
  }

  function clearFiles() {
    setImageFile(null);
    setFinalImageUrl(null);
    setHasGenerated(false);
    setMessage("File rimossi. Carica un JPG e inserisci il testo nella descrizione.");
  }

  return (
    <section className="plan-ai-grid">
      <aside className="plan-ai-panel">
        <form className="plan-ai-form" onSubmit={generatePlan}>
          <label
            className="plan-upload-card"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void processFiles(event.dataTransfer.files);
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Anteprima planimetria caricata" />
            ) : (
              <span className="plan-upload-empty">
                <ImagePlus size={32} />
                Carica JPG planimetria
              </span>
            )}
            <small>Accetta JPG, PNG, WEBP</small>
            <input
              accept="image/*"
              type="file"
              onChange={(event) => {
                if (event.target.files) {
                  void processFiles(event.target.files);
                }
                event.currentTarget.value = "";
              }}
            />
          </label>

          <div className="plan-file-summary">
            <span>
              <ImagePlus size={15} />
              {imageFile?.name ?? "nessuna immagine caricata"}
            </span>
            {imageFile ? (
              <button type="button" onClick={clearFiles}>
                <Trash2 size={15} />
                Rimuovi
              </button>
            ) : null}
          </div>

          <label>
            Descrizione immobile
            <textarea
              value={request.prompt}
              placeholder="Esempio: trilocale di 95 mq con soggiorno ampio, cucina abitabile, due camere, bagno finestrato e terrazzo..."
              onChange={(event) => updateRequest({ prompt: event.target.value })}
            />
          </label>

          <div className="plan-ai-fields">
            <label>
              Stile
              <select
                value={request.style}
                onChange={(event) => updateRequest({ style: event.target.value as Plan3DStyle })}
              >
                <option value="premium">Premium</option>
                <option value="moderno">Moderno</option>
                <option value="essenziale">Essenziale</option>
                <option value="classico">Classico</option>
              </select>
            </label>
            <label>
              Ambienti
              <input
                min={1}
                max={12}
                type="number"
                value={request.roomCount}
                onChange={(event) => updateRequest({ roomCount: Number(event.target.value) })}
              />
            </label>
          </div>

          <button className="plan-ai-generate" disabled={loading || !hasInput} type="submit">
            {loading ? <Loader2 className="spin" size={18} /> : <WandSparkles size={18} />}
            Genera JPG planimetria
          </button>
        </form>

        <div className="plan-ai-message">
          <Box size={16} />
          <span>{message}</span>
        </div>
      </aside>

      <section className="plan-ai-preview">
        <header>
          <span>
            <strong>{plan.title}</strong>
          </span>
        </header>
        <FloorPlan3DViewer
          plan={plan}
          baseImageUrl={imagePreview || undefined}
          finalImageUrl={finalImageUrl || undefined}
          fallbackLabel={aiCreditsDepleted ? "Render locale gratuito" : undefined}
          generated={hasGenerated}
        />
      </section>
    </section>
  );
}
