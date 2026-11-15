import type { ReactNode } from "react";
import { ExternalLink, MapPinned, X } from "lucide-react";
import type { CensimentoSite, CensimentoSiteId } from "./sites";

/**
 * Impaginato "mixabile" del censimento: la colonna degli strumenti resta
 * sempre a sinistra, l'area di lavoro a destra cambia.
 *
 * - nessuno strumento aperto: area di lavoro a tutta larghezza
 * - strumento incorporato ("embed"): il sito gira qui, largo, e il gestionale
 *   resta leggibile nella colonna di destra
 * - strumento in scheda ("tab"): il gestionale resta l'area principale, il sito
 *   si apre in una scheda vera del browser e qui accanto compare la sua colonna
 *   con il pannello CYBORG CENS che lavora su quella scheda
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
  // Sister lavora in una scheda del browser: la sua colonna sta accanto al
  // gestionale, che resta al suo posto, e il pannello Cyborg non sparisce.
  const isTabSite = activeSite?.mode === "tab";
  // CercaOra e Datagma accettano di girare dentro una pagina: si aprono qui,
  // larghi, con i dati del censimento nella colonna accanto.
  const isEmbedSite = activeSite?.mode === "embed";
  const showCyborg = isCyborg || isTabSite;

  return (
    <div
      className={`census-mix-shell${activeSite ? " is-split" : ""}${isTabSite ? " is-tab-split" : ""}${isEmbedSite ? " is-embed-split" : ""}`}
    >
      <aside className="census-sites" aria-label="Strumenti di censimento">
        <p className="census-sites-title">Strumenti</p>
        {sites.map((site) => {
          const active = activeSite?.id === site.id;
          // Gli strumenti esterni sono veri collegamenti: il browser apre una
          // scheda nuova e il gestionale resta esattamente com'era.
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
              {site.mode === "tab" ? <ExternalLink size={13} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </aside>

      <div className="census-mix-main">
        {/* Il gestionale non viene mai sostituito: con Sister resta qui, a piena larghezza. */}
        {!activeSite || isTabSite ? <div className="census-main-full">{children}</div> : null}

        {/* Il pannello resta montato anche quando è nascosto: smontarlo
            interromperebbe il collegamento con l'estensione. */}
        <div hidden={!showCyborg} className={isTabSite ? "census-site-dock" : "census-cyborg-view"}>
          {isTabSite && activeSite ? (
            <section className="census-site-panel" aria-label={activeSite.label}>
              <header>
                <strong>{activeSite.label}</strong>
                <span>{activeSite.description}</span>
                <div className="census-site-actions">
                  <a href={activeSite.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} aria-hidden="true" />
                    <span>Apri in una scheda</span>
                  </a>
                  <button type="button" onClick={onClose}>
                    <X size={14} aria-hidden="true" />
                    <span>Chiudi</span>
                  </button>
                </div>
              </header>
              <p className="census-site-empty">
                {activeSite.label} si apre in una scheda del browser con il tuo accesso. Il pannello CYBORG CENS qui sotto
                resta collegato a quella scheda: scegli la scheda operativa nel pannello per scansioni, CHECK AREA e iniezione.
              </p>
            </section>
          ) : null}
          <div className={isTabSite ? "census-cyborg-view" : undefined}>{cyborgView}</div>
        </div>

        {isEmbedSite && activeSite ? (
          <section className="census-site-panel" aria-label={activeSite.label}>
            <header>
              <strong>{activeSite.label}</strong>
              <span>{activeSite.description}</span>
              <div className="census-site-actions">
                <a href={activeSite.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>Apri in una scheda</span>
                </a>
                <button type="button" onClick={onClose}>
                  <X size={14} aria-hidden="true" />
                  <span>Chiudi</span>
                </button>
              </div>
            </header>
            <iframe
              className="census-site-frame"
              src={activeSite.url}
              title={activeSite.label}
              referrerPolicy="no-referrer"
              allow="clipboard-write"
            />
          </section>
        ) : null}

        {isEmbedSite ? (
          <aside className="census-analysis" aria-label="Dati del censimento">
            {children}
          </aside>
        ) : null}

        {isMap ? <div className="census-main-map">{mapView}</div> : null}
      </div>
    </div>
  );
}
