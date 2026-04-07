// src/pages/planimetrie.js
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';

export default function PlanimetrieTool() {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('INIZIALIZZAZIONE...');
  const [status, setStatus] = useState({ msg: 'PRONTO PER LA GENERAZIONE', type: 'info' });
  const [serverStatus, setServerStatus] = useState('checking');
  
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("nessun file selezionato");
  const [resultImage, setResultImage] = useState(null);

  const [overlayText, setOverlayText] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!loading) return;
    const phrases = [
      'ANALISI DELLA PLANIMETRIA...',
      'RICONOSCIMENTO MURI (CONTROLNET)...',
      'POSIZIONAMENTO ARREDI...',
      'CALCOLO ILLUMINAZIONE 8K...',
      'RENDERIZZAZIONE FINALE SUL MAC M4...',
      'QUASI PRONTO...'
    ];
    let i = 0;
    setLoadingText(phrases[0]);
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setLoadingText(phrases[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  const checkServerStatus = async () => {
    setServerStatus('checking');
    try {
      const res = await fetch('/api/check-server');
      const data = await res.json();
      setServerStatus(data.isOnline ? 'online' : 'offline');
    } catch (error) {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    checkServerStatus();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!file || serverStatus === 'offline') return;

    setLoading(true);
    setResultImage(null);
    setOverlayText([]); 
    setStatus({ msg: 'ELABORAZIONE IN CORSO...', type: 'red' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/planimetrie', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Errore server');

      setResultImage(data.imageUrl);
      setStatus({ msg: 'PLANIMETRIA ARREDATA CON SUCCESSO!', type: 'yellow' });
    } catch (error) {
      console.error(error);
      setStatus({ msg: `ERRORE: ${error.message}`, type: 'red' });
    }
    setLoading(false);
  };

  const handleDrag = (e, index) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newTexts = [...overlayText];
    newTexts[index] = { ...newTexts[index], x: `${x}%`, y: `${y}%` };
    setOverlayText(newTexts);
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      saveAs(blob, `${baseName}_arredata.png`);
    } catch (err) {
      window.open(resultImage, '_blank');
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
          
          <h2 className="text-2xl font-black uppercase tracking-widest mb-4 flex items-center gap-3 text-red-500">
            Motore AI Locale
          </h2>

          <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                serverStatus === 'online' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 
                serverStatus === 'offline' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-yellow-500'
              }`}></div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                Stato Server M4: <span className={serverStatus === 'online' ? 'text-green-400' : 'text-red-400'}>{serverStatus.toUpperCase()}</span>
              </span>
            </div>
            <button onClick={checkServerStatus} className="text-[9px] uppercase font-bold bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20">Aggiorna</button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <label className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
              <span className="text-[10px] font-bold uppercase tracking-widest">Carica Planimetria:</span>
              <input type="file" accept=".png,.jpg,.jpeg" className="hidden" 
                onChange={e => {
                  setFile(e.target.files[0]); 
                  setFileName(e.target.files[0]?.name || "nessun file");
                  setResultImage(null);
                }} 
              />
              <span className="text-[10px] truncate max-w-[200px] opacity-50">{fileName}</span>
            </label>

            {loading ? (
              <div className="w-full py-6 flex flex-col items-center justify-center bg-black/60 rounded-2xl border border-red-500/50 shadow-2xl">
                <svg className="animate-spin h-8 w-8 text-red-500 mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs font-black tracking-widest uppercase text-red-400 animate-pulse">{loadingText}</span>
              </div>
            ) : (
              /* IL BOTTONE DI GENERAZIONE SPARISCE SE C'È IL RISULTATO */
              !resultImage && (
                <button type="submit" disabled={!file || serverStatus !== 'online'} 
                  className={`w-full py-4 text-white font-black rounded-2xl uppercase tracking-widest transition-all ${
                    serverStatus === 'online' ? 'bg-red-600 hover:bg-red-500 shadow-xl active:scale-95' : 'bg-gray-800 opacity-50 cursor-not-allowed'
                  }`}>
                  {serverStatus !== 'online' ? "SERVER OFFLINE" : "GENERA ARREDAMENTO AI"}
                </button>
              )
            )}
          </form>

          {resultImage && (
            <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
              
              <div 
                ref={containerRef}
                className="relative mb-6 rounded-2xl overflow-hidden border-2 border-green-500/50 shadow-2xl bg-black cursor-crosshair"
                style={{ width: '100%', minHeight: '300px' }}
              >
                <img src={resultImage} alt="Risultato" className="w-full h-auto block" />
                
                <div className="absolute inset-0">
                  {overlayText.map((t, i) => (
                    <div 
                      key={i} 
                      draggable 
                      onDragEnd={(e) => handleDrag(e, i)}
                      style={{ left: t.x, top: t.y }} 
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move pointer-events-auto"
                    >
                      <div className="group relative">
                        <span className="text-white bg-black/80 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border border-white/30 shadow-2xl whitespace-nowrap">
                          {t.label}
                        </span>
                        <button 
                          onClick={() => setOverlayText(overlayText.filter((_, idx) => idx !== i))}
                          className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full w-4 h-4 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* I BOTTONI DELLE STANZE E IL DOWNLOAD RIMANGONO QUI SOTTO */}
              <div className="grid grid-cols-3 gap-2 mb-6 w-full">
                {['SOGGIORNO', 'CUCINA', 'CAMERA', 'BAGNO', 'INGRESSO', 'BALCONE'].map(label => (
                  <button 
                    key={label}
                    onClick={() => setOverlayText([...overlayText, { label, x: '50%', y: '50%' }])}
                    className="text-[9px] bg-white/5 hover:bg-red-500/30 border border-white/10 p-2 rounded-xl transition-all uppercase font-bold"
                  >
                    + {label}
                  </button>
                ))}
              </div>

              <button onClick={handleDownload} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest">
                SCARICA IMMAGINE FINALE
              </button>

              {/* BOTTONE RESET SE VUOI CARICARE UN'ALTRA FOTO SENZA REFRESH */}
              <button 
                onClick={() => {setResultImage(null); setFile(null); setFileName("nessun file selezionato"); setOverlayText([]);}}
                className="mt-4 text-[9px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
              >
                Annulla e carica altra foto
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