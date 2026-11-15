import { useEffect, useRef, useState } from 'react';
import { censusOperatingContext } from './censusContext';
import { cyborgPanelUrl, prepareCyborgImport, type CyborgImport } from './cyborgImport';

/** Ogni quanto richiedere la presenza dell'estensione: nessun timeout la spegne. */
const PROBE_INTERVAL_MS = 2000;
/** Dopo quanto avvisare che l'estensione non si vede ancora (la ricerca continua). */
const FIRST_HINT_MS = 4000;
/** Dopo quanto segnalare che il pannello è stato trovato ma non ha risposto. */
const PANEL_READY_TIMEOUT_MS = 8000;

type ExtensionHost = 'chromium' | 'firefox' | 'other';

/**
 * Il pannello è un'estensione Chromium (Chrome, Edge, Brave): altrove non esiste
 * alcun collegamento possibile e conviene dirlo invece di lasciare in attesa.
 */
function extensionHost(): ExtensionHost {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/chrome|chromium|edg\//i.test(ua)) return 'chromium';
  return 'other';
}

function missingHint(): string {
  if (extensionHost() !== 'chromium') {
    return 'CYBORG CENS è un’estensione per Chrome, Edge e Brave: da questo browser il pannello non può collegarsi. Apri GRFenix in uno di quei browser.';
  }
  const origin = typeof location === 'undefined' ? '' : location.origin;
  // Dentro un riquadro (anteprima incorporata) il content script dell'estensione
  // spesso non viene iniettato: senza di lui nessuna sonda può ricevere risposta.
  const embedded = typeof window !== 'undefined' && window.top !== window.self;
  const parts = [
    `Estensione CYBORG CENS non rilevata${origin ? ` su ${origin}` : ''}. Controlla che sia installata e attiva in questo browser e che ${origin || 'questa origine'} sia fra quelle ammesse dall’estensione: continuo a cercarla.`,
  ];
  if (embedded) {
    parts.push('Questa pagina è dentro un riquadro: aprìla in una scheda del browser, l’estensione non arriva nei riquadri incorporati.');
  }
  return parts.join(' ');
}

export function CyborgPanel({ onImport, preview }: {
  onImport: (batch: CyborgImport) => void;
  preview: (batch: CyborgImport) => { addedContacts: number; addedProperties: number; duplicates: number; skipped: number };
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [panelUrl, setPanelUrl] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [message, setMessage] = useState('Collegamento con CYBORG CENS…');
  const [batch, setBatch] = useState<CyborgImport | null>(null);

  useEffect(() => {
    const requestId = crypto.randomUUID();
    let hinted = false;
    let announced = false;
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;
      if (event.data?.type !== 'GRFENIX_CYBORG_DISCOVERED' || event.data.requestId !== requestId) return;
      const url = cyborgPanelUrl(event.data.panelUrl, location.origin);
      if (!url) {
        // L'estensione ha risposto, ma non con la pagina del pannello: non è un
        // problema di attesa, è un collegamento non riconosciuto.
        setMessage('L’estensione ha risposto con una pagina non riconosciuta. Ricarica CYBORG CENS aggiornata dalla pagina Estensioni.');
        return;
      }
      hinted = true;
      // Stesso URL: nessun ricaricamento dell'iframe. URL diverso (estensione
      // reinstallata): il pannello si riaggancia da solo.
      setPanelUrl((current) => (current === url ? current : url));
      // Solo al primo ritrovamento: le probe successive non devono sovrascrivere
      // l'avviso "pannello trovato ma non risponde".
      if (!announced && !readyRef.current) { announced = true; setMessage('Estensione collegata. Caricamento pannello…'); }
    };
    window.addEventListener('message', receive);
    const discover = () => window.postMessage({ type: 'GRFENIX_CYBORG_DISCOVER', requestId }, location.origin);
    discover();
    // La ricerca resta attiva finché il pannello è montato: se l'estensione
    // arriva dopo (o viene ricaricata) il collegamento si riprende da solo.
    const probe = window.setInterval(discover, PROBE_INTERVAL_MS);
    const hint = window.setTimeout(() => {
      if (!hinted && !readyRef.current) setMessage(missingHint());
    }, FIRST_HINT_MS);
    return () => { window.removeEventListener('message', receive); clearInterval(probe); clearTimeout(hint); };
  }, [attempt]);

  useEffect(() => {
    if (!panelUrl) return;
    // URL.origin dei protocolli extension non e' uniforme tra browser: usa host esplicito.
    const origin = panelUrl.slice(0, panelUrl.indexOf('/popup.html'));
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin) return;
      if (event.data?.type === 'GRFENIX_CYBORG_READY') { readyRef.current = true; setReady(true); setMessage('CYBORG CENS collegato.'); }
      if (event.data?.type === 'GRFENIX_CYBORG_IMPORT') {
        try { setBatch(prepareCyborgImport(event.data.records)); setMessage('Controlla il riepilogo prima di salvare.'); }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Importazione non valida.'); }
      }
    };
    window.addEventListener('message', receive);
    // Trovato l'indirizzo del pannello, se non risponde la causa è nell'estensione.
    const slow = window.setTimeout(() => {
      if (!readyRef.current) setMessage('Il pannello è stato trovato ma non ha risposto. Ricarica CYBORG CENS dalla pagina Estensioni e, se serve, questa pagina.');
    }, PANEL_READY_TIMEOUT_MS);
    return () => { window.removeEventListener('message', receive); clearTimeout(slow); };
  }, [panelUrl]);

  const report = batch ? preview(batch) : null;
  return <section className="cyborg-workspace" aria-label="CYBORG CENS">
    <header>
      <strong>CYBORG CENS</strong>
      <p>{`Ufficio ${censusOperatingContext.office} · ${censusOperatingContext.officeAddress}. Area operativa: ${censusOperatingContext.area}.`} Gli indirizzi dei contatti non vengono considerati immobili di proprietà senza riferimenti catastali.</p>
      <p>Scansione, intestatari, contatti, PDF, CSV, sessioni, CHECK AREA e iniezione: lo stesso DB dell’estensione.</p>
      <p role="status">{message}</p>
      {!ready && <button type="button" onClick={() => setAttempt(value => value + 1)}>Ricollega estensione</button>}
      <p>I dati trasferiti restano nel browser e seguono il salvataggio del tuo account GRFenix. Le automazioni sui siti usano le schede aperte e le tue sessioni di accesso.</p>
    </header>
    {batch && report && <section className="cyborg-import-preview" aria-label="Anteprima importazione">
      <h3>Importa nel Censimento</h3>
      <p>Nuovi proprietari: {report.addedContacts}. Nuovi immobili: {report.addedProperties}. Elementi già presenti o ripetuti: {report.duplicates}. Record non utilizzabili: {report.skipped}.</p>
      <p>Le schede già presenti vengono conservate. I record originali restano nell’estensione e i dati importati conservano una copia del record sorgente.</p>
      <button type="button" onClick={() => {
        try { onImport(batch); setBatch(null); setMessage('Importazione completata nel Censimento.'); }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Salvataggio non riuscito.'); }
      }}>Conferma importazione</button>
      <button type="button" onClick={() => { setBatch(null); setMessage('Importazione annullata.'); }}>Annulla</button>
    </section>}
    {panelUrl && <iframe ref={frame} src={panelUrl} title="Pannello completo CYBORG CENS" className="cyborg-frame" />}
  </section>;
}
