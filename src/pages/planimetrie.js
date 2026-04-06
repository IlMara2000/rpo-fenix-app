// src/pages/planimetrie.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';

export default function PlanimetrieTool() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'PRONTO PER LA GENERAZIONE', type: 'info' });
  
  // STATO DEL SEMAFORO: 'checking' (giallo), 'online' (verde), 'offline' (rosso)
  const [serverStatus, setServerStatus] = useState('checking');

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("nessun file selezionato");
  const [resultImage, setResultImage] = useState(null);

  // Funzione che controlla se il Mac Mini è acceso
  const checkServerStatus = async () => {
    setServerStatus('checking');
    try {
      const res = await fetch('/api/check-server');
      const data = await res.json();
      if (data.isOnline) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      setServerStatus('offline');
    }
  };

  // Controlla lo stato appena apri la pagina
  useEffect(() => {
    checkServerStatus();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!file) return;

    // Se è offline, blocca tutto e avvisa
    if (serverStatus === 'offline') {
      setStatus({ msg: 'ERRORE: ACCENDI PRIMA IL SERVER SUL MAC MINI!', type: 'red' });
      return;
    }

    setLoading(true);
    setResultImage(null);
    setStatus({ msg: 'ELABORAZIONE SUL SERVER MAC MINI M4...', type: 'red' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/planimetrie', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore di generazione dal server locale');
      }

      setResultImage(data.imageUrl);
      setStatus({ msg: 'PLANIMETRIA ARREDATA CON SUCCESSO!', type: 'yellow' });

    } catch (error) {
      console.error(error);
      setStatus({ msg: `ERRORE: ${error.message}`, type: 'red' });
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (resultImage) {
      try {
        const res = await fetch(resultImage);
        const blob = await res.blob();
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        saveAs(blob, `${baseName}_arredata.png`);
      } catch (err) {
        console.error("Errore nel download", err);
        window.open(resultImage, '_blank');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | FOTO PLANIMETRIE</title>
      </Head>

      <div className="w-full max-w-4xl flex justify-start mb-4">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-xl border border-white/10">
          ← Torna al Menu Principale
        </button>
      </div>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-red-500/30 shadow-2xl text-center">
          <span className="font-bold uppercase tracking-widest block px-4 text-xs md:text-sm text-white">
            {status.msg}
          </span>
        </div>
      </header>

      <main className="w-full max-w-2xl flex flex-col items-center justify-center flex-1">
        <section className="bg-black/40 backdrop-blur-md p-10 rounded-[35px] border border-white/10 w-full shadow-2xl relative">
          
          <h2 className="text-2xl font-black uppercase tracking-widest mb-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </span>
            Motore AI Locale
          </h2>

          {/* IL SEMAFORO DI STATO */}
          <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${
                serverStatus === 'online' ? 'bg-green-500 text-green-500' : 
                serverStatus === 'offline' ? 'bg-red-500 text-red-500' : 'bg-yellow-500 text-yellow-500'
              }`}></div>
              <span className="text-xs font-bold tracking-widest uppercase text-gray-300">
                Stato Server M4: <span className={
                  serverStatus === 'online' ? 'text-green-400' : 
                  serverStatus === 'offline' ? 'text-red-400' : 'text-yellow-400'
                }>
                  {serverStatus === 'checking' ? 'VERIFICA...' : serverStatus}
                </span>
              </span>
            </div>
            <button onClick={checkServerStatus} className="text-[9px] uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors">
              Aggiorna
            </button>
          </div>

          <p className="text-gray-400 text-xs mb-8">
            Carica la planimetria "nuda" in formato <b>PNG o JPG</b>. Il sistema invierà la richiesta al server dedicato <b>Mac Mini M4</b> per generare una versione fotorealistica arredata a costo zero.
          </p>

          <form onSubmit={handleGenerate} className="space-y-6">
            <label className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
              <span className="text-[10px] font-bold uppercase tracking-widest">Carica Planimetria:</span>
              <input 
                type="file" 
                accept=".png,.jpg,.jpeg" 
                className="hidden" 
                onChange={e => {
                  setFile(e.target.files[0]); 
                  setFileName(e.target.files[0]?.name || "nessun file");
                  setResultImage(null);
                }} 
              />
              <span className="text-[10px] truncate max-w-[200px] opacity-50">{fileName}</span>
            </label>

            <button 
              type="submit" 
              disabled={loading || !file || serverStatus !== 'online'} 
              className={`w-full py-4 text-white font-black rounded-2xl uppercase tracking-widest transition-all cursor-pointer ${
                serverStatus === 'online' 
                ? 'bg-red-600 hover:bg-red-500 shadow-[0_10px_30px_rgba(220,38,38,0.3)] active:scale-95' 
                : 'bg-gray-600 opacity-50 cursor-not-allowed grayscale'
              }`}
            >
              {loading ? "GENERAZIONE IN CORSO... (Attendi)" : 
               serverStatus !== 'online' ? "SERVER OFFLINE" : "GENERA ARREDAMENTO AI"}
            </button>
          </form>

          {resultImage && (
            <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 rounded-2xl overflow-hidden border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <img src={resultImage} alt="Preview Planimetria Arredata" className="w-full max-h-[300px] object-contain bg-black" crossOrigin="anonymous" />
              </div>
              <button 
                onClick={handleDownload}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest animate-pulse cursor-pointer"
              >
                SCARICA IMMAGINE FINALE
              </button>
            </div>
          )}

        </section>
      </main>

      <footer className="mt-24 opacity-20 text-[8px] tracking-[0.8em] uppercase font-bold text-center">
        REALINDI®DEN SYSTEM © 2026
      </footer>
    </div>
  );
}