import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';

export default function PlanimetrieTool() {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('INIZIALIZZAZIONE...');
  const [serverStatus, setServerStatus] = useState('checking');
  const [queue, setQueue] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null); 
  const containerRef = useRef(null);

  // Ciclo messaggi di caricamento
  useEffect(() => {
    if (!loading) return;
    const phrases = [
      'ANALISI DELLA PLANIMETRIA...',
      'LOCK GEOMETRICO MURI (CONTROLNET)...',
      'CONFIGURAZIONE TOP RENDER...',
      'POSIZIONAMENTO ARREDI LUXURY...',
      'CALCOLO ILLUMINAZIONE 8K...',
      'RENDERIZZAZIONE FINALE SUL MAC M4...',
      'QUASI PRONTO...'
    ];
    let i = 0;
    setLoadingText(phrases[0]);
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setLoadingText(phrases[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/check-server');
      const data = await res.json();
      setServerStatus(data.isOnline ? 'online' : 'offline');
    } catch { setServerStatus('offline'); }
  };

  useEffect(() => { checkServerStatus(); }, []);

  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newItems = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      fileName: f.name,
      style: 'modern_luxury', // Forza sempre la versione Top di gamma nel backend
      status: 'waiting',
      resultImage: null
    }));
    setQueue(prev => [...prev, ...newItems]);
    e.target.value = null; 
  };

  useEffect(() => {
    const processQueue = async () => {
      if (loading || serverStatus !== 'online') return;
      const nextTask = queue.find(item => item.status === 'waiting');
      
      if (nextTask) {
        setLoading(true);
        updateItemStatus(nextTask.id, 'processing');
        
        try {
          const formData = new FormData();
          formData.append('file', nextTask.file);
          formData.append('style', nextTask.style);

          const response = await fetch('/api/planimetrie', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          
          updateItemStatus(nextTask.id, 'completed', data.imageUrl);
          if (!activeViewId) setActiveViewId(nextTask.id); 
        } catch (err) {
          updateItemStatus(nextTask.id, 'error');
        }
        setLoading(false);
      }
    };
    processQueue();
  }, [queue, loading, serverStatus]);

  const updateItemStatus = (id, status, imageUrl = null) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status, resultImage: imageUrl } : item
    ));
  };

  const removeItem = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
    if (activeViewId === id) setActiveViewId(null);
  };

  const clearAll = () => {
    if (confirm("Vuoi svuotare tutta la cache dei download?")) {
      setQueue([]);
      setActiveViewId(null);
    }
  };

  const handleDownload = async (item) => {
    if (!item.resultImage) return;
    try {
      const res = await fetch(item.resultImage);
      const blob = await res.blob();
      saveAs(blob, `${item.fileName.split('.')[0]}_FenixRender.png`);
    } catch (err) {
      window.open(item.resultImage, '_blank');
    }
  };

  const activeItem = queue.find(item => item.id === activeViewId);

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | HIGH-END RENDER M4</title>
      </Head>

      {/* TOP BAR */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
          ← Menu Principale
        </button>
        {queue.length > 0 && (
          <button onClick={clearAll} className="text-[10px] uppercase tracking-widest font-bold text-red-400 hover:text-white transition-all bg-red-500/10 hover:bg-red-600 px-4 py-2 rounded-xl border border-red-500/30 backdrop-blur-md">
            🗑️ Svuota Cache ({queue.length})
          </button>
        )}
      </div>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        <img src="/logo.png" alt="Logo" className="h-[120px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-red-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-black/80 backdrop-blur-xl p-4 px-8 rounded-2xl border border-red-500/30 shadow-2xl text-center">
            <span className="font-black uppercase tracking-[0.3em] block text-xs text-white">
              {loading ? <span className="animate-pulse">{loadingText}</span> : (queue.length > 0 ? "CODA RENDERING ATTIVA" : "SISTEMA PRONTO PER L'UPLOAD")}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* COLONNA SINISTRA: UPLOAD E CODA */}
        <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-left-8 duration-700">
          <section className="bg-black/40 backdrop-blur-md p-6 rounded-[35px] border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
            
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">M4 PERFORMANCE ENGINE</h2>
              <div className={`w-2.5 h-2.5 rounded-full ${serverStatus === 'online' ? 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
            </div>

            {/* AREA UPLOAD DIRETTA */}
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">Caricamento Planimetria:</h3>
            <label className="flex flex-col items-center justify-center bg-white/5 p-12 rounded-2xl border border-white/10 border-dashed cursor-pointer hover:bg-red-500/5 hover:border-red-500/30 transition-all group relative overflow-hidden">
              <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-500">📥</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center leading-relaxed">
                Trascina qui lo schizzo<br/>
                <span className="opacity-40 font-bold text-[8px]">PROCESSO AUTOMATICO 8K HD</span>
              </span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </section>

          {/* LISTA CODA */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Monitor di Sistema</h3>
            <div className="max-h-[450px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {queue.map((item) => (
                <div key={item.id} 
                  className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden ${
                    activeViewId === item.id ? 'bg-red-950/20 border-red-500/50 shadow-lg' : 'bg-black/40 border-white/10 hover:border-white/30'
                  }`}
                  onClick={() => item.resultImage && setActiveViewId(item.id)}
                >
                  {item.status === 'processing' && (
                    <div className="absolute bottom-0 left-0 h-[1px] bg-red-500 animate-progress-indefinite"></div>
                  )}
                  <div className="flex flex-col overflow-hidden relative z-10">
                    <span className="text-[10px] font-bold truncate max-w-[130px]">{item.fileName}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${
                      item.status === 'processing' ? 'text-red-400' : 
                      item.status === 'completed' ? 'text-green-500' : 'text-white/20'
                    }`}>
                      {item.status === 'processing' ? 'Rendering...' : 'Completato'}
                    </span>
                  </div>
                  <div className="flex gap-2 relative z-10">
                    {item.resultImage && (
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl transition-all">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-2 bg-white/5 hover:bg-red-600 rounded-xl transition-all text-white/40 hover:text-white text-[10px]">✕</button>
                  </div>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-20 text-center py-12 border border-dashed border-white/10 rounded-[30px]">
                  In attesa di elaborazione
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLONNA DESTRA: PREVIEW HD PULITA */}
        <div className="lg:col-span-2 animate-in fade-in slide-in-from-right-8 duration-700">
          {activeItem?.resultImage ? (
            <section className="bg-black/40 backdrop-blur-md p-10 rounded-[45px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h2 className="text-xl font-black uppercase tracking-tighter">Render 8K Finale</h2>
                  <p className="text-[9px] text-white/30 uppercase tracking-[0.2em]">{activeItem.fileName}</p>
                </div>
                <div className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                  Fenix M4 Engine Active
                </div>
              </div>

              {/* IMMAGINE PULITA SENZA OVERLAY O BOTTONI */}
              <div 
                ref={containerRef}
                className="relative mb-8 rounded-[30px] overflow-hidden border border-white/10 shadow-2xl bg-black cursor-default"
                style={{ width: '100%', minHeight: '450px' }}
              >
                <img src={activeItem.resultImage} alt="Render Finale" className="w-full h-auto block" />
              </div>

              <button onClick={() => handleDownload(activeItem)} className="relative group w-full py-6 bg-red-600 hover:bg-red-500 text-white font-black rounded-[25px] shadow-2xl uppercase tracking-[0.3em] transition-all overflow-hidden active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                ESPORTA IMMAGINE DI LUSSO
              </button>
            </section>
          ) : (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-black/20 border-2 border-dashed border-white/5 rounded-[50px] animate-pulse">
              <span className="text-6xl mb-6 grayscale opacity-20">🏗️</span>
              <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/10">In attesa di elaborazione</p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-24 opacity-20 text-[9px] tracking-[1em] uppercase font-black text-center border-t border-white/5 w-full pt-10 pb-6">
        FENIX GROUP ® REAL ESTATE AI | SYSTEM 2026 | M4 PERFORMANCE
      </footer>

      <style jsx global>{`
        @keyframes progress-indefinite {
          0% { left: -25%; width: 25%; }
          50% { left: 40%; width: 40%; }
          100% { left: 100%; width: 25%; }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s infinite linear;
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 1.5s infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        body { overflow-x: hidden; }
      `}</style>
    </div>
  );
}