import type { ReactNode } from "react";
import { ExternalLink, MapPinned, ShieldAlert, X } from "lucide-react";
import type { CensimentoSite, CensimentoSiteId } from "./sites";

/**
 * Impaginato "mixabile" del censimento: la colonna degli strumenti resta
 * sempre a sinistra, l'area di lavoro a destra cambia.
 *
 * - nessuno strumento aperto: area di lavoro a tutta larghezza
 * - strumento incorporato ("embed"): il sito gira qui, largo, e nella colonna
 *   di destra restano i dati del censimento (o il pannello CYBORG CENS, per i
 *   siti che si guidano da lì)
 * - mappa e pannello Cyborg: prendono tutto lo spazio accanto alla colonna
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
  const isEmbedSite = activeSite?.mode === "embed";
  // Sister si guida dal pannello: la sua colonna è CYBORG CENS, non i dati.
  const cyborgSide = isEmbedSite && activeSite?.sidePanel === "cyborg";
  const showCyborg = isCyborg || cyborgSide;

  return (
    <div
      className={`census-mix-shell${activeSite ? " is-split" : ""}${isEmbedSite ? " is-embed-split" : ""}`}
    >
      <aside className="census-sites" aria-label="Strumenti di censimento">
        <p className="census-sites-title">Strumenti</p>
        {sites.map((site) => {
          const active = activeSite?.id === site.id;
          // Il motivo del blocco si legge sulla voce intera, non solo sul badge.
          const hint = site.frameBlocked
            ? `Il sito vieta di essere mostrato dentro una pagina: si apre in una scheda del browser. ${site.description}`
            : site.description;
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
                title={hint}
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
              title={hint}
              aria-pressed={active}
              onClick={() => onSelectSite(site.id)}
            >
              <MapPinned size={16} aria-hidden="true" />
              <span>{site.label}</span>
              {/* Si sa prima di aprirlo: questo sito non sta in una pagina. */}
              {/* Nessun title proprio: così il suggerimento della voce vale anche qui. */}
              {site.frameBlocked ? <span className="census-site-tag">scheda</span> : null}
            </button>
          );
        })}
      </aside>

      <div className="census-mix-main">
        {/* Il gestionale resta al suo posto quando non c'è nessuno strumento aperto. */}
        {!activeSite ? <div className="census-main-full">{children}</div> : null}

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
            {activeSite.frameBlocked ? (
              <div className="census-site-blocked" role="status">
                <ShieldAlert size={22} aria-hidden="true" className="census-site-blocked-icon" />
                <strong>{activeSite.label} non può essere mostrata dentro una pagina</strong>
                <p>
                  {activeSite.label} rimanda al portale dell'Agenzia delle Entrate, che dichiara{" "}
                  <code>frame-ancestors 'none'</code>: per sua scelta nessun sito può mostrarlo al proprio
                  interno. Il riquadro è qui e, appena l'Agenzia lo permettesse, si caricherebbe da solo; per
                  ora serve una scheda.
                </p>
                <a href={activeSite.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>Apri {activeSite.label} in una scheda</span>
                </a>
                <p className="census-site-blocked-note">
                  Il pannello CYBORG CENS resta in questa pagina e lavora sulla scheda di Sister.
                </p>
              </div>
            ) : (
              <iframe
                className="census-site-frame"
                src={activeSite.url}
                title={activeSite.label}
                referrerPolicy="no-referrer"
                allow="clipboard-write"
              />
            )}
          </section>
        ) : null}

        {isEmbedSite && !cyborgSide ? (
          <aside className="census-analysis" aria-label="Dati del censimento">
            {children}
          </aside>
        ) : null}

        {/* Il pannello resta montato anche quando è nascosto: smontarlo
            interromperebbe il collegamento con l'estensione. */}
        <div hidden={!showCyborg} className={`census-cyborg-view${cyborgSide ? " is-column" : ""}`}>
          {cyborgView}
        </div>

        {isMap ? <div className="census-main-map">{mapView}</div> : null}
      </div>
    </div>
  );
}
