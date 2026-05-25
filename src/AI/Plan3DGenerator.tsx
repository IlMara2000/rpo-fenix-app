import { useMemo, useState, type FormEvent } from "react";
import { Box, Braces, Download, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { FloorPlan3DViewer } from "./FloorPlan3DViewer";
import {
  createFallbackFloorPlan,
  normalizeFloorPlan3D,
  type FloorPlan3D,
  type FloorPlan3DRequest,
  type Plan3DStyle,
} from "./floorPlan3d";

const defaultRequest: FloorPlan3DRequest = {
  prompt: "",
  style: "premium",
  areaSqm: 90,
  roomCount: 6,
};

type GenerateResponse = {
  success?: boolean;
  plan?: unknown;
  meta?: {
    mode?: string;
    model?: string;
    error?: string;
  };
  error?: string;
};

export function Plan3DGenerator() {
  const [request, setRequest] = useState<FloorPlan3DRequest>(defaultRequest);
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
  const [message, setMessage] = useState("Pronto per generare una planimetria 3D.");
  const [meta, setMeta] = useState<GenerateResponse["meta"]>({ mode: "browser-fallback" });

  const jsonOutput = useMemo(() => JSON.stringify(plan, null, 2), [plan]);

  async function generatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("Generazione layout 3D in corso...");

    try {
      const response = await fetch("/api/planimetrie-3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Generazione non riuscita.");
      }

      const normalizedPlan = normalizeFloorPlan3D(data.plan, request);
      setPlan(normalizedPlan);
      setMeta(data.meta ?? { mode: normalizedPlan.source });
      setMessage(
        normalizedPlan.source === "hugging-face"
          ? "Layout generato con Hugging Face e renderizzato in 3D."
          : "Layout generato con fallback locale e renderizzato in 3D.",
      );
    } catch (error) {
      const fallbackPlan = createFallbackFloorPlan(request, "browser-fallback");
      setPlan(fallbackPlan);
      setMeta({ mode: "browser-fallback", error: error instanceof Error ? error.message : "Errore sconosciuto" });
      setMessage("Backend non disponibile: ho generato un 3D locale di continuita'.");
    } finally {
      setLoading(false);
    }
  }

  function updateRequest(patch: Partial<FloorPlan3DRequest>) {
    setRequest((current) => ({ ...current, ...patch }));
  }

  function downloadJson() {
    const blob = new Blob([jsonOutput], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fenix-planimetria-3d.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(jsonOutput);
    setMessage("JSON copiato negli appunti.");
  }

  return (
    <section className="plan-ai-grid">
      <aside className="plan-ai-panel">
        <div className="plan-ai-panel-title">
          <span>
            <Sparkles size={18} />
            Generatore 3D AI
          </span>
          <b>{meta?.model ?? meta?.mode ?? "3D"}</b>
        </div>

        <form className="plan-ai-form" onSubmit={generatePlan}>
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
              Mq indicativi
              <input
                min={35}
                max={260}
                type="number"
                value={request.areaSqm}
                onChange={(event) => updateRequest({ areaSqm: Number(event.target.value) })}
              />
            </label>
            <label>
              Ambienti
              <input
                min={4}
                max={12}
                type="number"
                value={request.roomCount}
                onChange={(event) => updateRequest({ roomCount: Number(event.target.value) })}
              />
            </label>
          </div>

          <button className="plan-ai-generate" disabled={loading} type="submit">
            {loading ? <Loader2 className="spin" size={18} /> : <WandSparkles size={18} />}
            Genera planimetria 3D
          </button>
        </form>

        <div className="plan-ai-message">
          <Box size={16} />
          <span>{message}</span>
        </div>

        <div className="plan-ai-actions">
          <button type="button" onClick={downloadJson}>
            <Download size={16} />
            Scarica JSON
          </button>
          <button type="button" onClick={copyJson}>
            <Braces size={16} />
            Copia JSON
          </button>
        </div>
      </aside>

      <section className="plan-ai-preview">
        <header>
          <span>
            <strong>{plan.title}</strong>
            <small>
              {plan.rooms.length} ambienti - {Math.round(plan.width * plan.depth)} mq stimati - {plan.source}
            </small>
          </span>
          <b>{plan.style}</b>
        </header>
        <FloorPlan3DViewer plan={plan} />
      </section>
    </section>
  );
}
