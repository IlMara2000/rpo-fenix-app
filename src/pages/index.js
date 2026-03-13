import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoConverter } from '../logic/converter';
import { runRpoDivider } from '../logic/divider'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE ®', type: 'info' });
  const [converterFiles, setConverterFiles] = useState(null);
  const [dividerFiles, setDividerFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);

  const handleDividerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    if (!txt) {
      alert("Seleziona il file TXT per procedere!");
      return;
    }
    setLoading(true);
    setStatus({ msg: 'DIVISIONE FILE RPO IN CORSO...', type: 'red' });
    try {
      const result = await runRpoDivider(txt);
      if (result && result.success) {
        setDividerFiles(result);
        setStatus({ msg: `DIVISIONE COMPLETATA`, type: 'yellow' });
      }
    } catch (err) {
      console.error("ERRORE DIVIDER:", err);
      setStatus({ msg: 'ERRORE DI ELABORAZIONE', type: 'red' });
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* AGGIORNATO: Background con sfumatura radiale rossa profonda */
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'radial-gradient(circle at top, #2d1313 0%, #0a0a0a 100%)' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* 1. HEADER CENTRATO - Logo +5% e ombre rosse #ee5556 */}
      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="Logo GR Fenix"
            width="263"
            height="134"
            className="h-[118px] w-auto object-contain drop-shadow-[0_0_25px_rgba(238,85,86,0.25)]"
          />
        </div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="h-[1px] w-8 bg-[#ee5556]/50"></span>
          <p className="text-gray-500 text-[10px] tracking-[0.5em] uppercase font-bold">
            OFFICIAL FENIX TOOL SUITE
          </p>
          <span className="h-[1px] w-8 bg-[#ee5556]/50"></span>
        </div>
        <div className="status-badge shadow-lg shadow-[#ee5556]/10 border-[#ee5556]/20">
          <span className="dot" style={{ backgroundColor: '#ee5556' }}></span>
          {status.msg}
        </div>
      </header>

      {/* CONTENITORE GRID */}
      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* 2. STEP 1: CONVERTER - Tema #ee5556 */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/5 bg-white/[0.01]">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-[#ee5556]/[0.04] transition-colors">
            01
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#ee5556]/10 border border-[#ee5556]/20 flex items-center justify-center text-[#ee5556] text-base shadow-inner">
              1
            </span>
            RPO Converter
          </h2>
          <p className="text-gray-400 text-xs leading-relaxed mb-8 pr-10">
            Carica il file Excel duplicato per generare il TXT da inviare al Registro delle Opposizioni.
          </p>
          <div className="space-y-6">
            <input
              type="file"
              onChange={e => setTempFile(e.target.files[0])}
              className="text-[11px] block w-full text-gray-400"
            />
            <button
              onClick={async () => {
                if (!tempFile) return;
                setLoading(true);
                try {
                  const res = await runRpoConverter(tempFile);
                  setConverterFiles(res);
                  setStatus({ msg: "FILE PRONTO!", type: 'yellow' });
                } catch (e) { alert("Errore nel file Excel"); }
                setLoading(false);
              }}
              disabled={loading || !tempFile}
              className="bottone-blu w-full"
              style={{ background: 'linear-gradient(135deg, #ee5556 0%, #a33b3c 100%)' }}
            >
              <span className="font-bold tracking-widest">{loading ? "ELABORAZIONE..." : "CREA FILE"}</span>
            </button>
            {converterFiles && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <button onClick={() => saveAs(converterFiles.txt, `perinvio${converterFiles.fileName}.txt`)} className="bottone-download text-[10px] border-[#ee5556]/30 text-[#ee5556]">⬇️ TXT ⬇️</button>
                <button onClick={() => saveAs(converterFiles.zip, `perinvio${converterFiles.fileName}.zip`)} className="bottone-download text-[10px]" style={{ background: '#ee5556', color: 'white', fontWeight: 'bold', border: 'none' }}>📦 ZIP 📦</button>
              </div>
            )}
          </div>
        </section>

        {/* 3. STEP 2: DIVIDER - Tema #ee5556 */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/5 bg-white/[0.01]">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.02] select-none group-hover:text-[#ee5556]/[0.04] transition-colors">
            02
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#ee5556]/10 border border-[#ee5556]/20 flex items-center justify-center text-[#ee5556] text-base shadow-inner">
              2
            </span>
            RPO Divider
          </h2>
          <p className="text-gray-400 text-xs leading-relaxed mb-8 pr-10">
            Carica il file TXT di risposta RPO e separa i numeri in due liste (Iscritti e Contattabili).
          </p>
          <form onSubmit={handleDividerSubmit} className="space-y-6">
            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
              <label className="text-[9px] text-gray-500 uppercase block mb-3 font-bold tracking-widest">Esito RPO (.txt)</label>
              <input type="file" name="txtFile" required className="text-[11px] w-full" />
            </div>
            <button type="submit" disabled={loading} className="bottone-blu w-full" style={{ background: 'linear-gradient(135deg, #ee5556 0%, #a33b3c 100%)' }}>
              <span className="font-bold tracking-widest">{loading ? "DIVISIONE..." : "DIVIDI LISTE"}</span>
            </button>
            {dividerFiles && (
              <div className="pt-6 border-t border-white/10 mt-4 grid grid-cols-2 gap-4 animate-in fade-in">
                <button type="button" onClick={() => saveAs(dividerFiles.txtUno, `rpo_1_${dividerFiles.fileName}.txt`)} className="bottone-download text-[9px] py-3" style={{ background: '#333', color: 'white', border: '1px solid #444' }}>📄 RPO (1)</button>
                <button type="button" onClick={() => saveAs(dividerFiles.txtZero, `rpo_0_${dividerFiles.fileName}.txt`)} className="bottone-download text-[9px] py-3" style={{ background: '#22c55e', color: 'white', border: 'none' }}>📄 OK (0)</button>
              </div>
            )}
          </form>
        </section>

        {/* 4. STEP 3: SCANNER WIP */}
        <section className="box-lavoro relative overflow-hidden group h-full border-dashed border-white/10 opacity-50">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.01] select-none">
            03
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3 grayscale">
            <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-base shadow-inner">
              3
            </span>
            RPO Scanner
          </h2>
          <p className="text-gray-500 text-xs leading-relaxed mb-8 pr-10 italic">
            Confronto diretto tra anagrafica Excel ed esito TXT per la bonifica automatica dei file.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/5 rounded-3xl">
             <div className="animate-pulse bg-white/5 px-4 py-2 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400">
               Work In Progress
             </div>
          </div>
        </section>

      </main>

      <footer className="mt-24 text-center opacity-40">
        <p className="text-[9px] text-white uppercase tracking-[0.5em] font-medium">
          FENIX GROUP RPO TOOL SUITE | Private & Lock by Realindi®Den © 2026
        </p>
      </footer>
    </div>
  );
}
