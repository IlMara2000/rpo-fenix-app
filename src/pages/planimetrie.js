// src/pages/planimetrie.js
import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';

export default function PlanimetrieTool() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'PRONTO PER LA GENERAZIONE', type: 'info' });
  
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("nessun file selezionato");
  const [resultImage, setResultImage] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResultImage(null);
    setStatus({ msg: 'ELABORAZIONE E GENERAZIONE AI IN CORSO...', type: 'red' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/planimetrie', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore di generazione');
      }

      // Fal.ai ci restituisce direttamente l'URL, niente più conversioni pazze Base64!
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
        // Scarichiamo l'immagine dal server di Fal per salvarla in locale
        const res = await fetch(resultImage);
        const blob = await res.blob();
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        saveAs(blob, `${baseName}_arredata.png`);
      } catch (err) {
        console.error("Errore nel download", err);
        // Piano B: se il browser blocca il download per sicurezza, apre la foto in una nuova scheda
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

      {/* TASTO TORNA AL MENU */}
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
        <section className="bg-black/40 backdrop-blur-md p-10 rounded-[35px] border border-white/10 w-full shadow-2xl">
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </span>
            Generatore AI
          </h2>
          <p className="text-gray-400 text-xs mb-8">
            Carica la planimetria "nuda" in formato <b>PNG o JPG</b>. Il sistema la invierà ai server cloud di <b>Fal.ai</b> per generare una versione fotorealistica arredata mantenendo le proporzioni esatte.
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
                  setResultImage(null); // Resetta l'immagine precedente
                }} 
              />
              <span className="text-[10px] truncate max-w-[200px] opacity-50">{fileName}</span>
            </label>

            <button 
              type="submit" 
              disabled={loading || !file} 
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 disabled:grayscale cursor-pointer"
            >
              {loading ? "GENERAZIONE IN CORSO... (Richiede pochi secondi)" : "GENERA ARREDAMENTO AI"}
            </button>
          </form>

          {/* AREA DI DOWNLOAD RISULTATO */}
          {resultImage && (
            <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 rounded-2xl overflow-hidden border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                {/* Mostra l'immagine generata tramite il link fornito da Fal.ai */}
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
