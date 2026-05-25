import { lazy, Suspense, useEffect } from "react";
import { ArrowLeft, Loader2, WandSparkles } from "lucide-react";

const Plan3DGenerator = lazy(() =>
  import("./AI/Plan3DGenerator").then((module) => ({ default: module.Plan3DGenerator })),
);

type PlanimetrieToolProps = {
  onNavigate: (path: string) => void;
};

export function PlanimetrieTool({ onNavigate }: PlanimetrieToolProps) {
  useEffect(() => {
    document.title = "Fenix Group | Planimetrie";
  }, []);

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
          <h1>Genera planimetrie 3D da JPG e descrizione.</h1>
        </div>
        <div className="plan-hero-actions">
          <div className="plan-status">
            <WandSparkles size={17} />
            CARICA JPG + TXT E SCARICA JPG
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <section className="plan-ai-loading">
            <Loader2 className="spin" size={22} />
            Caricamento motore planimetrie...
          </section>
        }
      >
        <Plan3DGenerator />
      </Suspense>
    </main>
  );
}
