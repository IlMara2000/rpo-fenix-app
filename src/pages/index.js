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
  
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");
  const [fileNameTxt, setFileNameTxt] = useState("nessun file selezionato");

  const handleDividerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    if (!txt) {
      alert("Seleziona il file TXT per procedere!");
      return;
    }
    setLoading(true);
    setStatus({ msg: 'DIVISIONE FILE RPO IN CORSO...', type: 'blue' });
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
    /* AGGIORNATO: Sfondo Azzurro Fenix che sfuma in nero verso il basso */
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(to bottom, #ee5556 0%, #05161a 30%, #000000 100%)' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* 1. HEADER CENTRATO - Logo +5% e ombre azzurre */}
      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="Logo GR Fenix"
            width="263"
            height="134"
            className="h-[130px] w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
           />
        </div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="h-[1px] w-8 bg-white/30"></span>
          <p className="text-white/70 text-[10px] tracking-[0.5em] uppercase font-bold">
            OFFICIAL FENIX TOOL SUITE
          </p>
          <span className="h-[1px] w-8 bg-white/30"></span>
        </div>
        <div className="status-badge shadow-2xl shadow-black/20 border-white/20 bg-black/40 backdrop-blur-md">
          <span className="dot" style={{ backgroundColor: '#00d1ff' }}></span>
          <span className="text-white">{status.msg}</span>
        </div>
      </header>

      {/* CONTENITORE GRID */}
      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* 2. STEP 1: CONVERTER - Tutto Azzurro Fenix */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.03] select-none group-hover:text-[#00d1ff]/[0.05] transition-colors">
            01
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#00d1ff] flex items-center justify-center text-black text-base font-black shadow-lg">
              1
            </span>
            <span className="text-white">RPO Converter</span>
          </h2>
          <p className="text-gray-300 text-xs leading-relaxed mb-8 pr-10">
            Carica il file Excel duplicato per generare il TXT da inviare al Registro delle Opposizioni.
          </p>
          <div className="space-y-6">
            
            {/* Tasto Scegli File Azzurro */}
            <div className="bg-white/[0.05] p-4 rounded-2xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-black shadow-md cursor-pointer transition-all hover:brightness-110 active:scale-95" 
                     style={{ background: '#00d1ff' }}>
                <input
                  type="file"
                  onChange={e => {
                    setTempFile(e.target.files[0]);
                    setFileNameExcel(e.target.files[0]?.name || "nessun file selezionato");
                  }}
                  className="sr-only"
                />
                Scegli File
              </label>
              <span className="flex-1 text-gray-200 text-xs truncate">{fileNameExcel}</span>
            </div>

            {/* Tasto principale Azzurro */}
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
              className="bottone-blu w-full shadow-lg shadow-[#00d1ff]/20"
              style={{ background: 'linear-gradient(135deg, #ee5556 0%, #00a8cc 100%)', color: '#001a1a' }}
            >
              <span className="font-black tracking-widest">{loading ? "ELABORAZIONE..." : "CREA FILE"}</span>
            </button>
            
            {/* Download Azzurri */}
            {converterFiles && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <button onClick={() => saveAs(converterFiles.txt, `perinvio${converterFiles.fileName}.txt`)} className="bottone-download text-[10px] border-[#00d1ff]/50 text-[#00d1ff] bg-[#00d1ff]/5">⬇️ TXT ⬇️</button>
                <button onClick={() => saveAs(converterFiles.zip, `perinvio${converterFiles.fileName}.zip`)} className="bottone-download text-[10px]" style={{ background: '#00d1ff', color: 'black', fontWeight: 'bold' }}>📦 ZIP 📦</button>
              </div>
            )}
          </div>
        </section>

        {/* 3. STEP 2: DIVIDER - Tutto Azzurro Fenix */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.03] select-none group-hover:text-[#00d1ff]/[0.05] transition-colors">
            02
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#00d1ff] flex items-center justify-center text-black text-base font-black shadow-lg">
              2
            </span>
            <span className="text-white">RPO Divider</span>
          </h2>
          <p className="text-gray-300 text-xs leading-relaxed mb-8 pr-10">
            Carica il file TXT di risposta RPO e separa i numeri in due liste (Iscritti e Contattabili).
          </p>
          <form onSubmit={handleDividerSubmit} className="space-y-6">
            
            {/* Tasto Scegli File Azzurro */}
            <div className="bg-white/[0.05] p-4 rounded-2xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-black shadow-md cursor-pointer transition-all hover:brightness-110 active:scale-95" 
                     style={{ background: '#00d1ff' }}>
                <input
                  type="file"
                  name="txtFile"
                  required
                  onChange={e => {
                    setFileNameTxt(e.target.files[0]?.name || "nessun file selezionato");
                  }}
                  className="sr-only"
                />
                Scegli File
              </label>
              <span className="flex-1 text-gray-200 text-xs truncate">{fileNameTxt}</span>
            </div>

            {/* Tasto principale Azzurro */}
            <button type="submit" disabled={loading} className="bottone-blu w-full shadow-lg shadow-[#00d1ff]/20" 
                    style={{ background: 'linear-gradient(135deg, #ee5556 0%, #00a8cc 100%)', color: '#001a1a' }}>
              <span className="font-black tracking-widest">{loading ? "DIVISIONE..." : "DIVIDI LISTE"}</span>
            </button>
            
            {/* Bottoni download coordinati */}
            {dividerFiles && (
              <div className="pt-6 border-t border-white/10 mt-4 grid grid-cols-2 gap-4 animate-in fade-in">
                <button type="button" onClick={() => saveAs(dividerFiles.txtUno, `rpo_1_${dividerFiles.fileName}.txt`)} className="bottone-download text-[10px] py-3 border-[#00d1ff]/50 text-[#00d1ff] bg-[#00d1ff]/5">📄 RPO (1)</button>
                <button type="button" onClick={() => saveAs(dividerFiles.txtZero, `rpo_0_${dividerFiles.fileName}.txt`)} className="bottone-download text-[10px] py-3" style={{ background: '#00d1ff', color: 'black', fontWeight: 'bold' }}>📄 OK (0)</button>
              </div>
            )}
          </form>
        </section>

        {/* 4. STEP 3: SCANNER WIP */}
        <section className="box-lavoro relative overflow-hidden group h-full border-dashed border-white/10 opacity-40">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.01] select-none">
            03
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3 grayscale">
            <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-gray-400 text-base shadow-inner">
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
        <p className="text-[9px] text-[#ffffff] uppercase tracking-[0.5em] font-medium drop-shadow-[0_0_10px_rgba(0,209,255,0.3)]">
          FENIX GROUP RPO TOOL SUITE | Private & Lock by Realindi®Den © 2026
        </p>
      </footer>
    </div>
  );
}
