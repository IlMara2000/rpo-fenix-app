import '../styles/globals.css'; // Carica il tuo CSS bellissimo
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoConverter } from '../logic/converter';
import { runRpoScanner } from '../logic/scanner';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'Sistema pronto', type: 'info' });
  const [converterFiles, setConverterFiles] = useState(null);
  const [scannerFiles, setScannerFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null); 

  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    const excel = e.target.excelFile.files[0];
    if (!txt || !excel) return alert("Per favore, seleziona entrambi i file!");

    setLoading(true);
    setStatus({ msg: 'Sto controllando i numeri nell\'Excel...', type: 'blue' });
    try {
      const result = await runRpoScanner(txt, excel);
      if (result.success) {
        setScannerFiles(result);
        setStatus({ msg: `Controllo finito! Trovati ${result.foundCount} numeri che NON puoi chiamare.`, type: 'yellow' });
      }
    } catch (err) {
      setStatus({ msg: 'Errore durante il controllo.', type: 'red' });
      alert("C'è stato un problema con i file. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <Head><title>FENIX | Controllo Registro Opposizioni</title></Head>

      <div className="max-w-md w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold italic"><span style={{color:'#0081FB'}}>GR</span> FENIX</h1>
          <p className="text-gray-400 text-sm">Strumento Protezione Sanzioni RPO</p>
        </header>

        {/* MESSAGGIO DI STATO */}
        <div className="mb-6 p-4 text-center rounded-lg border border-white/10 bg-white/5 text-xs uppercase tracking-widest">
          {loading ? "Attendi, sto lavorando..." : status.msg}
        </div>

        <div className="space-y-8">
          
          {/* STEP 1 */}
          <section className="box-lavoro">
            <h2 className="text-lg font-bold mb-2">1. Prepara file per il Registro</h2>
            <p className="text-gray-400 text-xs mb-4">
              Carica il tuo file Excel originale. Creerò un file con solo i numeri, pronto da inviare al sito del Registro delle Opposizioni.
            </p>
            <input type="file" onChange={e => setTempFile(e.target.files[0])} className="text-xs mb-4 block w-full" />
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await runRpoConverter(tempFile);
                  setConverterFiles(res);
                  setStatus({ msg: 'File pronto! Invialo al Registro.', type: 'yellow' });
                } catch (e) { alert("Errore nel file Excel"); }
                setLoading(false);
              }} 
              disabled={loading || !tempFile}
              className="bottone-blu"
            >
              Crea Lista Numeri
            </button>
            {converterFiles && (
              <button onClick={() => saveAs(converterFiles.txt, `lista_per_registro.txt`)} className="bottone-download">Scarica file da inviare</button>
            )}
          </section>

          {/* STEP 2 */}
          <section className="box-lavoro">
            <h2 className="text-lg font-bold mb-2">2. Pulisci la lista (Togli chi ha negato)</h2>
            <p className="text-gray-400 text-xs mb-4">
              Dopo che il Registro ti ha rimandato l'esito, caricalo qui insieme al tuo Excel per "oscurare" chi non vuole essere chiamato.
            </p>
            <form onSubmit={handleScannerSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">File ricevuto dal Registro (.txt)</label>
                <input type="file" name="txtFile" required className="text-xs block w-full mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Il tuo Excel originale (.xlsx)</label>
                <input type="file" name="excelFile" required className="text-xs block w-full mt-1" />
              </div>
              <button type="submit" disabled={loading} className="bottone-blu">
                {loading ? "Sto pulendo l'Excel..." : "Controlla e Proteggi"}
              </button>
              
              {scannerFiles && (
                <div className="pt-4 mt-4 border-t border-white/10">
                  <p className="text-[10px] text-blue-400 font-bold mb-2">OPERAZIONE RIUSCITA!</p>
                  <button type="button" onClick={() => saveAs(scannerFiles.excelCensored, `LISTA_SICURA_PER_CHIAMATE.xlsx`)} className="bottone-download" style={{backgroundColor: '#22c55e', color: 'white'}}>
                    Scarica Lista Sicura per Chiamate
                  </button>
                  <p className="text-[9px] text-gray-500 mt-2 text-center">In questo file i numeri vietati sono stati oscurati.</p>
                </div>
              )}
            </form>
          </section>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-[10px] text-gray-600">I tuoi dati non vengono salvati. Tutto rimane privato nel tuo computer.</p>
        </footer>
      </div>
    </div>
  );
}