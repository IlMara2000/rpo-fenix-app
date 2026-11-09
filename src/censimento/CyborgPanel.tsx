import { useEffect, useRef, useState } from 'react';
import { censusOperatingContext } from './censusContext';
import { cyborgPanelUrl, prepareCyborgImport, type CyborgImport } from './cyborgImport';

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
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'GRFENIX_CYBORG_DISCOVERED' || event.data.requestId !== requestId) return;
      const url = cyborgPanelUrl(event.data.panelUrl, location.origin);
      if (url) { clearInterval(retry); setPanelUrl(url); if (!readyRef.current) setMessage('Estensione collegata. Caricamento pannello…'); }
    };
    window.addEventListener('message', receive);
    const discover = () => window.postMessage({ type: 'GRFENIX_CYBORG_DISCOVER', requestId }, location.origin);
    discover();
    const retry = window.setInterval(discover, 1000);
    const timeout = window.setTimeout(() => {
      window.clearInterval(retry);
      if (!readyRef.current) setMessage('Se il pannello non appare, ricarica l’estensione CYBORG CENS aggiornata e questa pagina in Chrome, Edge o Brave.');
    }, 5000);
    return () => { window.removeEventListener('message', receive); clearInterval(retry); clearTimeout(timeout); };
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
    return () => window.removeEventListener('message', receive);
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
