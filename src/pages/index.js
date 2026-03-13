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

  // LOGICA SCANNER UNIFICATA (CON DEBUG LOG)
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    const excel = e.target.excelFile.files[0];
    if (!txt || !excel) return alert("Seleziona entrambi i file per procedere!");

    setLoading(true);
    setStatus({ msg: 'ANALISI INCROCIATA DEI DATI...', type: 'blue' });
    
    try {
      console.log("Inizio scansione..."); 
      const result = await runRpoScanner(txt, excel);
      console.log("Risultato ricevuto dallo scanner:", result); 

      if (result && result.success) {
        setScannerFiles(result);
        setStatus({ msg: `COMPLETATO: ${result.foundCount} NUMERI IN LISTA`, type: 'yellow' });
      } else {
        alert("Lo scanner ha risposto ma senza successo. Controlla che i file siano corretti.");
      }
    } catch (err) {
      console.error("ERRORE FATALE SCANNER:", err);
      setStatus({ msg: 'ERRORE DI ELABORAZIONE', type: 'red' });
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
        
        <div className="space-y-12">
          
          {/* STEP 1: RPO CONVERTER */}
          <section className="box-lavoro relative overflow-hidden group">
            <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-blue-500/[0.04] transition-colors">
              01
            </div>
            
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-base shadow-inner">1</span>
              RPO Converter
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-8 pr-10">
              Carica il tuo file Excel originale. Estrarrò automaticamente solo la lista dei numeri necessari per l'invio diretto sul portale del Registro delle Opposizioni.
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
                className="bottone-blu"
              >
                <span>{loading ? "Generazione in corso..." : "Crea File"}</span>
              </button>
              
              {converterFiles && (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => saveAs(converterFiles.txt, `perinvio_${converterFiles.fileName}.txt`)} className="bottone-download text-[10px]">
                    ⬇️ Scarica .txt ⬇️
                  </button>
                  <button onClick={() => saveAs(converterFiles.zip, `perinvio_${converterFiles.fileName}.zip`)} className="bottone-download text-[10px]" style={{background: 'var(--fenix-blue)', color: 'white'}}>
                    📦 Scarica ZIP 📦
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* BADGE E HEADER CENTRALE */}
          <header className="text-center py-4">
            <div className="inline-block mb-6">
              <div className="status-badge shadow-xl shadow-blue-500/10">
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
        
          {/* STEP 2: RPO SCANNER */}
          <section className="box-lavoro relative overflow-hidden group">
            <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-green-500/[0.04] transition-colors">
              02
            </div>

            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-base shadow-inner">2</span>
              RPO Scanner
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
                <span>{loading ? "Verifica in corso..." : "Avvia Controllo Numeri"}</span>
              </button>
              
              {/* BOX RISULTATO FINALE */}
              {scannerFiles && (
                <div className="pt-6 border-t border-white/10 mt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      console.log("Tentativo download file:", scannerFiles.excelCensored);
                      saveAs(scannerFiles.excelBonificato, `LISTA_MODIFICATA_${filename}.xlsx`);
                    }} 
                    className="bottone-download py-4 shadow-2xl" 
                    style={{background: '#22c55e', color: 'white', border: 'none'}}
                  >
                     📞 SCARICA LA LISTA 📲
                  </button>
                  <p className="text-[10px] text-white mt-4 text-center font-medium italic uppercase tracking-tighter">
                    Analisi completata con successo. Il file è pronto.
                  </p>
                </div>
              )}
            </form>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="mt-24 text-center opacity-50">
          <p className="text-[10px] text-white uppercase tracking-[0.5em] font-medium">
           GR FENIX RPO Tool Suite — Private & Lock by Realindi®Den © 2026 
          </p>
        </footer>
      </div>
    </div>
  );
}