/**
 * Endpoint dismesso (novembre 2026).
 *
 * L'importazione del Censimento ha una sola strada: il pulsante dentro il
 * pannello dell'estensione, che trasferisce i record a GRFenix via postMessage
 * verificato per origine e finestra mittente (`src/censimento/CyborgPanel.tsx`).
 *
 * Qui non si legge alcun corpo, non si valida alcun token e non si inoltra
 * nulla a servizi esterni: le vecchie variabili CYBORG_IMPORT_TOKEN e
 * CRM_CENSUS_IMPORT_FORWARD_URL non servono più. La rotta resta solo per
 * rispondere con un errore esplicito alle copie dell'estensione già installate
 * che chiamano ancora il vecchio adattatore HTTP, invece di un 404 muto.
 */
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(410).json({
    error: "Endpoint dismesso: l'importazione del Censimento avviene dal pannello CYBORG CENS.",
  });
}
