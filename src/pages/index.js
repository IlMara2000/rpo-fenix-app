import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoConverter } from '../logic/converter';
import { runRpoScanner } from '../logic/scanner';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'OFFICIAL FENIX RPO TOOL SUITE', type: 'info' });
  const [converterFiles, setConverterFiles] = useState(null);
  const [scannerFiles, setScannerFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null); 

  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    const excel = e.target.excelFile.files[0];
    if (!txt || !excel) return alert("Seleziona entrambi i file per procedere!");

    setLoading(true);
    setStatus({ msg: 'ANALISI INCROCIATA DEI DATI...', type: 'blue' });
    try {
      const result = await runRpoScanner(txt, excel);
      if (result.success) {
        setScannerFiles(result);
        setStatus({ msg: `COMPLETATO: ${result.foundCount} NUMERI IN LISTA`, type: 'yellow' });
      }
    } catch (err) {
      setStatus({ msg: 'ERRORE DI ELABORAZIONE', type: 'red' });
      alert("C'è stato un problema durante il controllo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-6">
      <Head>
        <title>GR FENIX | RPO TOOL</title>
      </Head>

      <div className="max-w-xl w-full">
        {/* HEADER: MASSIMA CREATIVITÀ E BRANDING */}
        <header className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="status-badge">
              <span className="dot"></span>
              {loading ? 'SYNCING DATA...' : status.msg}
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter italic">
            <span style={{color:'var(--fenix-blue)'}}>GR</span> FENIX
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="h-[1px] w-8 bg-blue-500/50"></span>
            <p className="text-gray-500 text-[10px] tracking-[0.5em] uppercase font-bold">RPO TOOL</p>
            <span className="h-[1px] w-8 bg-blue-500/50"></span>
          </div>
        </header>

        <div className="space-y-12">
          
          {/* STEP 1: PREPARAZIONE FILE REGISTRO */}
          <section className="box-lavoro relative overflow-hidden group">
            {/* Numero decorativo sullo sfondo */}
            <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-blue-500/[0.04] transition-colors">
              01
            </div>
            
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-base shadow-inner">1</span>
              Preparazione Invio
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-8 pr-10">
              Carica il tuo file Excel originale. Estrarrò automaticamente solo la lista dei numeri necessari per l'invio diretto sul portale del Registro delle Opposizioni.
            </p>
            
            <div className="space-y-6">
              <div className="relative">
                 <input type="file" onChange={e => setTempFile(e.target.files[0])} className="text-[11px] block w-full text-gray-400" />
              </div>
              
              <button 
                onClick={async () => {
                  if(!tempFile) return;
                  setLoading(true);
                  try {
                    const res = await runRpoConverter(tempFile);
                    setConverterFiles(res);
                    setStatus({ msg: "FILE PRONTO PER L'RPO!", type: 'yellow' });
                  } catch (e) { alert("Errore nel file Excel"); }
                  setLoading(false);
                }} 
                disabled={loading || !tempFile}
                className="bottone-blu"
              >
                <span>{loading ? "Generazione in corso..." : "Crea File"}</span>
              </button>
              
              {converterFiles && (
                <button onClick={() => saveAs(converterFiles.txt, `PER_INVIO_${converterFiles.fileName}.txt`)} className="bottone-download animate-pulse">
                  ⬇️ Scarica File .txt
                </button>
              )}
            </div>
          </section>

          {/* STEP 2: BONIFICA E PULIZIA */}
          <section className="box-lavoro relative overflow-hidden group">
            <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-green-500/[0.04] transition-colors">
              02
            </div>

            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-base shadow-inner">2</span>
              Bonifica Lista
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-8 pr-10">
              Confronta l'esito ricevuto dal Registro con il tuo file Excel originale per scaricare la lista di chi ha negato il consenso con data d'iscrizione.
            </p>
            
            <form onSubmit={handleScannerSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] hover:border-white/10 transition-colors">
                   <label className="text-[9px] text-gray-500 uppercase block mb-3 font-bold tracking-widest">Esito RPO (.txt)</label>
                   <input type="file" name="txtFile" required className="text-[11px] w-full" />
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] hover:border-white/10 transition-colors">
                   <label className="text-[9px] text-gray-500 uppercase block mb-3 font-bold tracking-widest">Tua Lista Excel Duplicata (.xlsx)</label>
                   <input type="file" name="excelFile" required className="text-[11px] w-full" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="bottone-blu">
                <span>{loading ? "Verifica Sicurezza in corso..." : "Avvia Bonifica Numeri"}</span>
              </button>
              
              {scannerFiles && (
                <div className="pt-4 border-t border-white/5">
                  <button type="button" onClick={() => saveAs(scannerFiles.excelCensored, `LISTA_MOD_${CONVERTERFILES.fileName}.xlsx`)} 
                    className="bottone-download" style={{background: '#22c55e', color: 'white'}}>
                    🔥 Scarica la Lista 
                  </button>
                  <p className="text-[9px] text-gray-500 mt-4 text-center font-medium italic">I numeri in lista sono stati caricati.</p>
                </div>
              )}
            </form>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="mt-24 text-center">
          <div className="flex justify-center gap-4 mb-8 opacity-30">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.5em] font-medium">
            GR FENIX RPO Tool Suite — Private & Secure by Realindi.Den
          </p>
        </footer>
      </div>
    </div>
  );
}