import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';

export default function PlanimetrieTool() {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('INIZIALIZZAZIONE...');
  const [serverStatus, setServerStatus] = useState('checking');
  
  // STATO CODA: Array di oggetti { id, file, fileName, status, resultImage }
  const [queue, setQueue] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null); 
  const [overlayText, setOverlayText] = useState([]);
  const containerRef = useRef(null);

  // Ciclo messaggi di caricamento
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
    }, 3500);
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

  // GESTORE CARICAMENTO FILE MULTIPLI
  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newItems = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      fileName: f.name,
      status: 'waiting',
      resultImage: null
    }));
    setQueue(prev => [...prev, ...newItems]);
    e.target.value = null; 
  };

  // PROCESSORE DELLA CODA (Uno alla volta)
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
      setOverlayText([]);
    }
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

  const handleDownload = async (item) => {
    if (!item.resultImage) return;
    try {
      const res = await fetch(item.resultImage);
      const blob = await res.blob();
      saveAs(blob, `${item.fileName.split('.')[0]}_arredata.png`);
    } catch (err) {
      window.open(item.resultImage, '_blank');
    }
  };

  const activeItem = queue.find(item => item.id === activeViewId);

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | MULTI-PLANIMETRIE M4</title>
      </Head>

      {/* TOP BAR */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-xl border border-white/10">
          ← Menu
        </button>
        {queue.length > 0 && (
          <button onClick={clearAll} className="text-[10px] uppercase tracking-widest font-bold text-red-400 hover:text-white transition-all bg-red-500/10 hover:bg-red-600 px-4 py-2 rounded-xl border border-red-500/30">
            🗑️ Svuota Cache ({queue.length})
          </button>
        )}
      </div>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[120px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        <div className="bg-black/80 backdrop-blur-xl p-3 rounded-2xl border border-red-500/30 shadow-2xl text-center">
          <span className="font-bold uppercase tracking-widest block px-6 text-xs text-white">
            {loading ? loadingText : (queue.length > 0 ? "GESTIONE CODA ATTIVA" : "PRONTO PER IL CARICAMENTO")}
          </span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* COLONNA SINISTRA: UPLOAD E LISTA */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-black/40 backdrop-blur-md p-6 rounded-[30px] border border-white/10 shadow-2xl">
            <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-red-500">Motore AI Locale</h2>
            
            {/* SEMAFORO */}
            <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Server M4: {serverStatus}</span>
              </div>
              <button onClick={checkServerStatus} className="text-[8px] bg-white/5 px-2 py-1 rounded hover:bg-white/10">Ref</button>
            </div>

            <label className="flex flex-col items-center justify-center bg-white/5 p-8 rounded-2xl border border-white/10 border-dashed cursor-pointer hover:bg-white/10 transition-all group">
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📂</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-center">Trascina o clicca<br/>per Multi-Upload</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </section>

          {/* LISTA CODA */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-2">Coda di Lavoro</h3>
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
              {queue.map((item) => (
                <div key={item.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    activeViewId === item.id ? 'bg-red-500/20 border-red-500/50' : 'bg-black/40 border-white/10 hover:border-white/30'
                  }`}
                  onClick={() => item.resultImage && setActiveViewId(item.id)}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold truncate max-w-[120px]">{item.fileName}</span>
                    <span className={`text-[8px] font-black uppercase ${
                      item.status === 'processing' ? 'text-yellow-500' : 
                      item.status === 'completed' ? 'text-green-500' : 'text-white/20'
                    }`}>
                      {item.status === 'processing' ? 'Render in corso...' : item.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {item.resultImage && (
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="p-2 bg-green-500/20 hover:bg-green-500 rounded-lg transition-colors">
                        📥
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-2 bg-white/5 hover:bg-red-600 rounded-lg transition-colors text-[10px]">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {queue.length === 0 && <div className="text-[10px] opacity-20 text-center py-10 border border-dashed border-white/10 rounded-2xl">Coda vuota</div>}
            </div>
          </div>
        </div>

        {/* COLONNA DESTRA: EDITOR RISULTATO */}
        <div className="lg:col-span-2">
          {activeItem?.resultImage ? (
            <section className="bg-black/40 backdrop-blur-md p-8 rounded-[35px] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <div 
                ref={containerRef}
                className="relative mb-6 rounded-2xl overflow-hidden border-2 border-green-500/50 shadow-2xl bg-black cursor-crosshair"
                style={{ width: '100%', minHeight: '400px' }}
              >
                <img src={activeItem.resultImage} alt="Risultato" className="w-full h-auto block" />
                
                <div className="absolute inset-0">
                  {overlayText.map((t, i) => (
                    <div 
                      key={i} draggable 
                      onDragEnd={(e) => handleDrag(e, i)}
                      style={{ left: t.x, top: t.y }} 
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move"
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

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6 w-full">
                {['SOGGIORNO', 'CUCINA', 'CAMERA', 'BAGNO', 'INGRESSO', 'BALCONE'].map(label => (
                  <button 
                    key={label}
                    onClick={() => setOverlayText([...overlayText, { label, x: '50%', y: '50%' }])}
                    className="text-[8px] bg-white/5 hover:bg-red-500/30 border border-white/10 p-2 rounded-xl transition-all uppercase font-bold"
                  >
                    + {label}
                  </button>
                ))}
              </div>

              <button onClick={() => handleDownload(activeItem)} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest transition-all">
                SCARICA IMMAGINE FINALE
              </button>
            </section>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-black/20 border-2 border-dashed border-white/5 rounded-[40px] opacity-30">
              <span className="text-6xl mb-6">🏠</span>
              <p className="text-xs font-bold uppercase tracking-[0.3em]">Carica o seleziona un file pronto</p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-24 opacity-20 text-[8px] tracking-[0.8em] uppercase font-bold text-center">
        REALINDI®DEN SYSTEM © 2026 | M4 PERFORMANCE ENGINE
      </footer>
    </div>
  );
}