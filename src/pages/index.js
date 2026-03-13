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
      if (result && result.success) {
        setScannerFiles(result);
        setStatus({ msg: `COMPLETATO: ${result.foundCount} MATCH TROVATI`, type: 'yellow' });
      }
    } catch (err) {
      console.error("ERRORE SCANNER:", err);
      setStatus({ msg: 'ERRORE DI ELABORAZIONE', type: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh' }} className="flex flex-col items-center py-16 px-6 font-sans">
      <Head>
        <title>GR FENIX | RPO TOOL</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="max-w-xl w-full">
        
        {/* LOGO 1: HEADER TOP (Versione Orizzontale) */}
        <header className="flex justify-center mb-12">
          <img 
            src="/logo1.png" 
            alt="Fenix Group Logo" 
            className="h-16 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '<h1 style="letter-spacing:0.3em; font-weight:900;">FENIX GROUP</h1>';
            }}
          />
        </header>

        <div className="space-y-12">
          
          {/* STEP 1: RPO CONVERTER */}
          <section className="box-lavoro relative overflow-hidden group">
            <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-blue-500/[0.04] transition-colors">01</div>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-base shadow-inner">1</span>
              RPO Converter
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-8 pr-10">
              Carica il tuo file Excel duplicato. Estrarrò automaticamente la lista dei numeri incolonnati per l'invio diretto sul portale.
            </p>
            <div className="space-y-6">
              <input type="file" onChange={e => setTempFile(e.target.files[0])} className="text-[11px] block w-full text-gray-400" />
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
                className="bottone-blu w-full"
              >
                <span>{loading ? "Generazione in corso..." : "Crea File"}</span>
              </button>
            </div>
          </section>

          {/* LOGO AREA 2 & STATUS BADGE (Centro) */}
          <div className="text-center py-6">
            <div className="inline-block mb-10">
              <div className="status-badge shadow-xl shadow-blue-500/10">
                <span className="dot"></span>
                {status.msg}
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <img 
                src="/logo2.png" 
                alt="Logo GR Fenix" 
                className="h-12 w-auto object-contain filter brightness-0 invert"
                onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<p style="letter-spacing:0.5em; font-size:10px; color:#3b82f6;">GR FENIX RPO TOOL</p>';
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="h-[1px] w-8 bg-blue-500/30"></span>
              <p className="text-gray-600 text-[9px] tracking-[0.5em] uppercase font-bold">Security Suite</p>
              <span className="h-[1px] w-8 bg-blue-500/30"></span>
            </div>
          </div>
        
          {/* STEP 2: RPO SCANNER */}
          <section className="box-lavoro relative overflow-hidden group">
            <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-green-500/[0.04] transition-colors">02</div>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-base shadow-inner">2</span>
              RPO Scanner
            </h2>
            <form onSubmit={handleScannerSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                   <label className="text-[9px] text-gray-500 uppercase block mb-3 font-bold tracking-widest">Esito RPO(.txt)</label>
                   <input type="file" name="txtFile" required className="text-[11px] w-full" />
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                   <label className="text-[9px] text-gray-500 uppercase block mb-3 font-bold tracking-widest">Lista Excel duplicata(.xlsx)</label>
                   <input type="file" name="excelFile" required className="text-[11px] w-full" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="bottone-blu w-full">
                <span>{loading ? "Scansione in corso..." : "Avvio Controllo Numeri"}</span>
              </button>
              
              {scannerFiles && (
                <div className="pt-6 border-t border-white/10 mt-4 transition-all duration-500">
                  <button 
                    type="button" 
                    onClick={() => saveAs(scannerFiles.excelBonificato, `LISTA_CONTROLLATA.xlsx`)} 
                    className="bottone-download py-4 shadow-2xl w-full" 
                    style={{background: '#22c55e', color: 'white', border: 'none'}}
                  >
                     📦 SCARICA QUI IL FILE 📲
                  </button>
                </div>
              )}
            </form>
          </section>
        </div>

        <footer className="mt-24 text-center opacity-30">
          <p className="text-[10px] text-white uppercase tracking-[0.5em] font-medium">
           GR FENIX RPO Suite — Private & Lock by Realindi®Den © 2026 
          </p>
        </footer>
      </div>
    </div>
  );
}
