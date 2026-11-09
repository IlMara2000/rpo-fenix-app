import type { ReactNode } from "react";
import { ExternalLink, MapPinned, X } from "lucide-react";
import type { CensimentoSite, CensimentoSiteId } from "./sites";

/**
 * Impaginato "mixabile" del censimento: la colonna degli strumenti resta
 * sempre a sinistra, l'area di lavoro a destra cambia.
 *
 * - nessuno strumento aperto: area di lavoro a tutta larghezza
 * - strumento incorporato: sito al centro, analisi del gestionale a destra
 * - mappa: la mappa prende tutto lo spazio accanto alla colonna
 */
export function CensimentoWorkspace({
  sites,
  activeSite,
  onSelectSite,
  onClose,
  mapView,
  cyborgView,
  children,
}: {
  sites: CensimentoSite[];
  activeSite: CensimentoSite | null;
  onSelectSite: (id: CensimentoSiteId) => void;
  onClose: () => void;
  mapView: ReactNode;
  cyborgView: ReactNode;
  children: ReactNode;
}) {
  const isMap = activeSite?.id === "mappa";
  const isCyborg = activeSite?.id === "cyborg";
  const showAnalysis = Boolean(activeSite) && !isMap && !isCyborg;

  return (
    <div className={`census-mix-shell${activeSite ? " is-split" : ""}`}>
      <aside className="census-sites" aria-label="Strumenti di censimento">
        <p className="census-sites-title">Strumenti</p>
        {sites.map((site) => {
          const active = activeSite?.id === site.id;
          // I siti che non si possono incorporare sono veri collegamenti:
          // il browser apre una scheda nuova e questa resta com'era.
          if (site.mode === "external") {
            return (
              <a
                key={site.id}
                className="census-site-link"
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                title={site.description}
              >
                <MapPinned size={16} aria-hidden="true" />
                <span>{site.label}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            );
          }

          return (
            <button
              key={site.id}
              type="button"
              className={`census-site-link${active ? " is-active" : ""}`}
              title={site.description}
              aria-pressed={active}
              onClick={() => onSelectSite(site.id)}
            >
              <MapPinned size={16} aria-hidden="true" />
              <span>{site.label}</span>
            </button>
          );
        })}
      </aside>

      <div className="census-mix-main">
        {!activeSite ? <div className="census-main-full">{children}</div> : null}

        <div hidden={!isCyborg} className="census-cyborg-view">
          {cyborgView}
        </div>
        {isMap ? <div className="census-main-map">{mapView}</div> : null}

        {showAnalysis && activeSite ? (
          <>
            <section className="census-site-panel" aria-label={activeSite.label}>
              <header>
                <strong>{activeSite.label}</strong>
                <span>{activeSite.description}</span>
                <div className="census-site-actions">
                  {activeSite.url ? (
                    <a href={activeSite.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} aria-hidden="true" />
                      <span>Apri in una scheda</span>
                    </a>
                  ) : null}
                  <button type="button" onClick={onClose}>
                    <X size={14} aria-hidden="true" />
                    <span>Chiudi</span>
                  </button>
                </div>
              </header>
              {activeSite.url ? (
                <iframe
                  className="census-site-frame"
                  src={activeSite.url}
                  title={activeSite.label}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="census-site-empty">Questo strumento non ha una pagina da mostrare.</p>
              )}
            </section>
            <aside className="census-analysis" aria-label="Analisi gestionale">
              {children}
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
