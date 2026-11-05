export type CensimentoSiteId = "mappa" | "sister" | "cercaora" | "datagma" | "whuis";

export type CensimentoSiteMode = "interno" | "embed" | "external";

export interface CensimentoSite {
  id: CensimentoSiteId;
  label: string;
  description: string;
  url: string;
  mode: CensimentoSiteMode;
}

/**
 * Siti di lavoro del censimento.
 * - "interno": pagina del gestionale (la mappa).
 * - "embed": si apre dentro l'area di lavoro, in un riquadro.
 * - "external": il sito rifiuta l'incorporamento, si apre in una scheda separata
 *   come vero collegamento (target="_blank"), mai dentro la pagina corrente.
 */
export const censimentoSites: CensimentoSite[] = [
  {
    id: "mappa",
    label: "Mappa",
    description: "Mappa immobiliare degli immobili censiti, con i dati catastali.",
    url: "",
    mode: "interno",
  },
  {
    id: "sister",
    label: "Sister",
    description: "Visure catastali ufficiali dell'Agenzia delle Entrate.",
    url: "https://sister.agenziaentrate.gov.it/",
    mode: "embed",
  },
  {
    id: "cercaora",
    label: "CercaOra",
    description: "Telefono del proprietario partendo da codice fiscale o indirizzo.",
    // L'applicazione sta su /app/: la home del sito è solo la pagina di
    // presentazione e dopo l'accesso porta a una pagina diversa da quella
    // che si apre con il collegamento diretto.
    url: "https://cercaora.online/app/",
    mode: "embed",
  },
  {
    id: "datagma",
    label: "Datagma",
    description: "Numeri di cellulare e recapiti diretti.",
    url: "https://app.datagma.com/signin.html",
    mode: "embed",
  },
  {
    id: "whuis",
    label: "Whuis",
    description: "Visure su persone, aziende e immobili. Si apre in una scheda separata.",
    url: "https://app.whuis.com/",
    mode: "external",
  },
];

export function findCensimentoSite(id: CensimentoSiteId): CensimentoSite | undefined {
  return censimentoSites.find((site) => site.id === id);
}
