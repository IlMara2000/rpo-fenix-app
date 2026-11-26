/**
 * Matrice di pubblicazione: un immobile, un esito per ogni sito.
 * Lo stato vive in `property.details`, che accetta chiavi libere, così non
 * serve una migrazione: `portal.<sito>.state` e `portal.<sito>.at`.
 */
export type PortalSite = { id: string; label: string };

export const portalSites: PortalSite[] = [
  { id: "immobiliare", label: "Immobiliare.it" },
  { id: "idealista", label: "Idealista" },
  { id: "casait", label: "Casa.it" },
  { id: "subito", label: "Subito" },
  { id: "sito", label: "Sito del gruppo" },
];

type PortalProperty = {
  id: string;
  code: string;
  title: string;
  portals: string;
  updatedAt: string;
  details?: Record<string, string | undefined>;
};

const stateKey = (siteId: string) => `portal.${siteId}.state`;
const dateKey = (siteId: string) => `portal.${siteId}.at`;

/**
 * Esito di un immobile su un sito. Se la scheda e' cambiata dopo l'invio
 * l'esito e' «Da aggiornare»: un prezzo vecchio su un portale e' un danno,
 * non una svista da scoprire per caso.
 */
export function portalOutcome(property: PortalProperty, site: PortalSite): string {
  const details = property.details ?? {};
  if (details[stateKey(site.id)] !== "Pubblicato") {
    return "—";
  }
  const sent = details[dateKey(site.id)] || "";
  return sent && sent < property.updatedAt ? "Da aggiornare" : "Pubblicato";
}

export function portalTotals(property: PortalProperty, sites: PortalSite[] = portalSites) {
  const outcomes = sites.map((site) => portalOutcome(property, site));
  return {
    published: outcomes.filter((outcome) => outcome === "Pubblicato").length,
    stale: outcomes.filter((outcome) => outcome === "Da aggiornare").length,
    total: sites.length,
  };
}

/** Un solo invio: tutte le destinazioni risultano pubblicate alla stessa data. */
export function publishOnEverySite(property: PortalProperty, date: string, sites: PortalSite[] = portalSites) {
  const details: Record<string, string | undefined> = { ...(property.details ?? {}) };
  sites.forEach((site) => {
    details[stateKey(site.id)] = "Pubblicato";
    details[dateKey(site.id)] = date;
  });
  return { details, portals: `${sites.length}/${sites.length}` };
}
