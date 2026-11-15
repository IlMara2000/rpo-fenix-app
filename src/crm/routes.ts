/**
 * Percorsi pubblici delle pagine del gestionale.
 *
 * Il gestionale vive su `/crm` con la pagina nell'hash (`/crm#modulo/pagina`),
 * ma ogni pagina ha anche un percorso leggibile, usato da segnalibri e deep
 * link: `/censimento/nominativi` deve aprire gli stessi contatti, anche dopo un
 * ricaricamento della pagina.
 */
export const pagePaths: Record<string, string> = {
    "start-dashboard": "/home",
    "immobili-nuovo": "/immobili/nuovo",
    "immobili-tutti": "/immobili",
    "immobili-vendite": "/immobili/vendite",
    "immobili-affitti": "/immobili/affitti-annuali",
    "immobili-ricerca-op": "/immobili/ricerca-op",
    "immobili-ricerca-cli": "/immobili/ricerca-cli",
    "richieste-nuova": "/nominativi/richieste/nuova",
    "richieste-elenco": "/nominativi/richieste",
    "richieste-matching": "/nominativi/richieste/incroci",
    "nominativi-nuovo": "/nominativi/nuovo",
    "nominativi-elenco": "/nominativi",
    "nominativi-richieste": "/nominativi/richieste",
    "proprietari-elenco": "/proprietari",
    "proprietari-collega": "/proprietari/collega",
    "attivita-elenco": "/attivita",
    "attivita-nuova": "/attivita/nuova",
    "agenda-nuova": "/agenda/attivita/nuova",
    "agenda-calendario": "/agenda",
    "agenda-storico": "/agenda/storico",
    "pubblicita-portali": "/pubblicita",
    "contatti-p-nuovo": "/contatti-pubblicita/nuovo",
    "contatti-p-elenco": "/contatti-pubblicita",
    "censimento-nuovo-contatto": "/censimento/nominativi/create",
    "censimento-contatti": "/censimento/nominativi",
    "censimento-zone": "/censimento/zone",
    "censimento-vie": "/censimento/vie",
    "censimento-complessi": "/censimento/complessi",
    "censimento-immobili": "/censimento/immobili",
    "censimento-proprietari": "/censimento/proprietari",
    "obiettivi-elenco": "/obiettivi",
    "account-ruoli": "/account/ruoli",
    "utilita-preferenze": "/preferenze",
    "utilita-backup": "/utilita/copie-sicurezza",
    "utilita-portali": "/utilita/portali/esportazioni",
    "utilita-pubblicita": "/pubblicita",
    "utilita-info-territoriali": "/info-territoriali",
    "impostazioni-cantieri": "/impostazioni/cantieri",
    "impostazioni-tipologie": "/impostazioni/tipologie",
    "impostazioni-tipi-gestione": "/impostazioni/tipi-gestione",
    "impostazioni-stati": "/impostazioni/stati-conservazione",
    "impostazioni-accessori": "/impostazioni/accessori",
    "impostazioni-accessori-tipologia": "/impostazioni/accessori/tipologia",
    "impostazioni-accessori-gestione": "/impostazioni/accessori/tipo-gestione",
    "impostazioni-modulistica": "/impostazioni/contratti",
    "impostazioni-cartelli": "/impostazioni/preset-cartellini",
    "impostazioni-distanze": "/impostazioni/distanze",
    "impostazioni-aziende": "/impostazioni/aziende",
    "impostazioni-tipo-attivita": "/tipo-attivita",
    "impostazioni-azienda": "/impostazioni/agenzia",
    "impostazioni-aree": "/impostazioni/aree-geografiche",
    "impostazioni-frazioni": "/impostazioni/frazioni",
    "impostazioni-localita": "/impostazioni/localita",
    "impostazioni-provenienze": "/impostazioni/provenienze",
    "impostazioni-provenienze-portali": "/impostazioni/provenienze/portali-personali",
    "impostazioni-provenienze-giornalini": "/impostazioni/provenienze/giornalini",
    "impostazioni-provenienze-siti": "/impostazioni/provenienze/siti-web",
    "impostazioni-provenienze-altri": "/impostazioni/provenienze/altri",
    "impostazioni-email-cp": "/impostazioni/email-contatti-pubblicita",
    "impostazioni-email-cp-mittenti": "/impostazioni/email-contatti-pubblicita/mittenti",
  };

/** Percorso pubblico di una pagina; `/workspace` se la pagina non ne ha uno. */
export function pathForPage(pageKey: string) {
  return pagePaths[pageKey] ?? "/workspace";
}

/** Pagina dietro un percorso pubblico, ignorando lo slash finale e le maiuscole. */
export function pageForPath(pathname: string) {
  const clean = pathname.replace(/\/+$/, "").toLowerCase();
  if (!clean) {
    return null;
  }
  const entry = Object.entries(pagePaths).find(([, path]) => path.toLowerCase() === clean);
  return entry ? entry[0] : null;
}
