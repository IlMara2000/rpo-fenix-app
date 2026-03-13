import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoConverter } from '../logic/converter';
import { runRpoDivider } from '../logic/divider'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE ©', type: 'info' });
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
    /* SFONDO CORALLO #ee5556 -> NERO (FISSO) */
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #ee5556 0%, #000000 75%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* HEADER - Logo XL 156px */}
      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="Logo GR Fenix"
            width="315"
            height="160"
            className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
           />
        </div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="h-[1px] w-8 bg-white/40"></span>
          <p className="text-white text-[10px] tracking-[0.5em] uppercase font-bold drop-shadow-md">
            OFFICIAL FENIX TOOL SUITE
          </p>
          <span className="h-[1px] w-8 bg-white/40"></span>
        </div>
        <div className="status-badge shadow-2xl shadow-black/40 border-white/20 bg-black/60 backdrop-blur-xl">
          <span className="dot" style={{ backgroundColor: '#ffffff' }}></span>
          <span className="text-white font-bold">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* STEP 1: CONVERTER - White Glassed Buttons */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:border-white/30">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">
            01
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-base font-black shadow-lg">
              1
            </span>
            <span className="text-white">RPO Converter</span>
          </h2>
          <p className="text-gray-200 text-xs leading-relaxed mb-8 pr-10">
            Carica il file Excel duplicato per generare il TXT da inviare al Registro delle Opposizioni.
          </p>
          <div className="space-y-6">
            
            <div className="bg-white/[0.05] p-4 rounded-2xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-gray-900 shadow-md cursor-pointer transition-all hover:bg-white active:scale-95 backdrop-blur-sm border border-white/40" 
                     style={{ background: 'rgba(255, 255, 255, 0.85)' }}>
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
              <span className="flex-1 text-white text-xs truncate font-medium">{fileNameExcel}</span>
            </div>

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
              className="w-full py-4 rounded-2xl text-base font-black tracking-widest uppercase text-gray-950 shadow-xl transition-all hover:bg-white active:scale-95 backdrop-blur-sm border border-white/50"
              style={{ background: 'rgba(255, 255, 255, 0.9)' }}
            >
              <span>{loading ? "ELABORAZIONE..." : "CREA FILE"}</span>
            </button>
            
            {converterFiles && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <button onClick={() => saveAs(converterFiles.txt, `perinvio${converterFiles.fileName}.txt`)} className="bottone-download text-[10px] border-white/30 text-white bg-white/10 backdrop-blur-sm">⬇️ TXT ⬇️</button>
                <button onClick={() => saveAs(converterFiles.zip, `perinvio${converterFiles.fileName}.zip`)} className="bottone-download text-[10px] font-bold" style={{ background: 'white', color: 'black' }}>📦 ZIP 📦</button>
              </div>
            )}
          </div>
        </section>

        {/* STEP 2: DIVIDER - White Glassed Buttons */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:border-white/30">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">
            02
          </div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-base font-black shadow-lg">
              2
            </span>
            <span className="text-white">RPO Divider</span>
          </h2>
          <p className="text-gray-200 text-xs leading-relaxed mb-8 pr-10">
            Carica il file TXT di risposta RPO e separa i numeri in due liste.
          </p>
          <form onSubmit={handleDividerSubmit} className="space-y-6">
            
            <div className="bg-white/[0.05] p-4 rounded-2xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-gray-900 shadow-md cursor-pointer transition-all hover:bg-white active:scale-95 backdrop-blur-sm border border-white/40" 
                     style={{ background: 'rgba(255, 255, 255, 0.85)' }}>
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
              <span className="flex-1 text-white text-xs truncate font-medium">{fileNameTxt}</span>
            </div>

            <button type="submit" disabled={loading} 
                    className="w-full py-4 rounded-2xl text-base font-black tracking-widest uppercase text-gray-950 shadow-xl transition-all hover:bg-white active:scale-95 backdrop-blur-sm border border-white/50"
                    style={{ background: 'rgba(255, 255, 255, 0.9)' }}>
              <span>{loading ? "DIVISIONE..." : "DIVIDI LISTE"}</span>
            </button>
            
            {dividerFiles && (
              <div className="pt-6 border-t border-white/20 mt-4 grid grid-cols-2 gap-4 animate-in fade-in">
                <button type="button" onClick={() => saveAs(dividerFiles.txtUno, `rpo_1_${dividerFiles.fileName}.txt`)} className="bottone-download text-[10px] py-3 border-white/30 text-white bg-white/10 backdrop-blur-sm">📄 RPO (1)</button>
                <button type="button" onClick={() => saveAs(dividerFiles.txtZero, `rpo_0_${dividerFiles.fileName}.txt`)} className="bottone-download text-[10px] py-3 font-bold" style={{ background: 'white', color: 'black' }}>📄 OK (0)</button>
              </div>
            )}
          </form>
        </section>

        {/* STEP 3: SCANNER WIP */}
        <section className="box-lavoro relative overflow-hidden h-full border-dashed border-white/10 bg-white/[0.02] opacity-50">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 text-base shadow-inner">
              3
            </span>
            <span className="text-gray-400">RPO Scanner</span>
          </h2>
          <p className="text-gray-500 text-xs leading-relaxed mb-8 pr-10 italic">
            Work In Progress...
          </p>
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
