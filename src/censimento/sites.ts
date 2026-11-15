export type CensimentoSiteId = "cyborg" | "mappa" | "sister" | "cercaora" | "datagma" | "whuis";

export type CensimentoSiteMode = "interno" | "tab" | "external";

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
 * - "tab": si apre in una scheda vera del browser, con l'accesso dell'operatore,
 *   e l'area di lavoro resta sul pannello CYBORG CENS che lavora su quella scheda.
 *   Serve ai siti che richiedono un accesso forte (SPID o codice temporaneo), che
 *   dentro un riquadro non funzionerebbe.
 * - "external": non ha un pannello da guidare: si apre in una scheda separata
 *   come vero collegamento (target="_blank"), senza toccare il gestionale.
 *
 * Nessuno strumento si apre più dentro la pagina: il gestionale non viene mai
 * sostituito da un sito.
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
    description: "Visure catastali ufficiali dell'Agenzia delle Entrate. Si apre in una scheda con il tuo accesso: qui resta il pannello CYBORG CENS che la guida.",
    url: "https://sister.agenziaentrate.gov.it/",
    mode: "tab",
  },
  {
    id: "cercaora",
    label: "CercaOra",
    description: "Telefono del proprietario partendo da codice fiscale o indirizzo.",
    // Si apre il sito, non il guscio dell'applicazione: /app/ mostra la
    // schermata di accesso dell'app, mentre dalla home si arriva al sito con
    // ACCEDI e Registrati. L'accesso porta poi dentro /app/ da sé.
    url: "https://cercaora.online/",
    mode: "external",
  },
  {
    id: "datagma",
    label: "Datagma",
    description: "Numeri di cellulare e recapiti diretti. Si apre in una scheda separata.",
    url: "https://app.datagma.com/signin.html",
    mode: "external",
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
