export type CensimentoSiteId = "cyborg" | "mappa" | "sister" | "cercaora" | "datagma" | "whuis";

export type CensimentoSiteMode = "interno" | "embed" | "external";

export interface CensimentoSite {
  id: CensimentoSiteId;
  label: string;
  description: string;
  url: string;
  mode: CensimentoSiteMode;
  /** Il sito rifiuta di essere mostrato dentro una pagina: il riquadro lo spiega. */
  frameBlocked?: boolean;
  /** Cosa mostrare nella colonna accanto al sito (default: i dati del censimento). */
  sidePanel?: "crm" | "cyborg";
}

/**
 * Siti di lavoro del censimento.
 * - "interno": pagina del gestionale (mappa e pannello Cyborg).
 * - "embed": il sito accetta di girare dentro una pagina e si apre qui, accanto
 *   al gestionale: il sito occupa l'area di lavoro e i dati restano nella
 *   colonna di destra, così si consultano mentre il sito è aperto.
 * - "external": non si incorpora e non ha un pannello da guidare: si apre in una
 *   scheda separata come vero collegamento (target="_blank").
 */
export const censimentoSites: CensimentoSite[] = [
  { id: "cyborg", label: "CYBORG CENS", description: "Pannello completo dell’estensione: scansioni, sessioni e iniezione.", url: "", mode: "interno" },
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
    // sister.agenziaentrate.gov.it risponde con un meta refresh verso
    // /Main/index.jsp, che a sua volta rimanda al portale dell'Agenzia: quel
    // portale dichiara `frame-ancestors 'none'`, quindi nessuna pagina può
    // mostrarlo dentro di sé. Il riquadro resta, e spiega cosa succede.
    description: "Visure catastali ufficiali dell'Agenzia delle Entrate, con il pannello CYBORG CENS qui accanto.",
    url: "https://sister.agenziaentrate.gov.it/",
    mode: "embed",
    frameBlocked: true,
    sidePanel: "cyborg",
  },
  {
    id: "cercaora",
    label: "CercaOra",
    description: "Telefono del proprietario partendo da codice fiscale o indirizzo. Si apre qui, accanto ai dati del censimento.",
    // Si punta la home del sito, non le pagine /app/: /app/home rimanda a
    // /app/login, che dentro un riquadro resta bianca (il suo script non
    // disegna nulla sotto un genitore). Dalla home si entra con ACCEDI.
    url: "https://cercaora.online/",
    mode: "embed",
  },
  {
    id: "datagma",
    label: "Datagma",
    description: "Numeri di cellulare e recapiti diretti. Si apre qui, accanto ai dati del censimento.",
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
