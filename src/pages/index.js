import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoConverter } from '../logic/converter';
import { runRpoScanner } from '../logic/scanner';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'Sistema Pronto', type: 'info' });
  const [converterFiles, setConverterFiles] = useState(null);
  const [scannerFiles, setScannerFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
        body { background: radial-gradient(circle at top, #1a1a1a 0%, #000000 100%) !important; color: #ffffff !important; margin: 0; font-family: 'Inter', sans-serif !important; overflow-x: hidden; }
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.37); }
        .glass-download { background: rgba(255,255,255,0.9); color: #000000; font-weight: 800; border: 1px solid rgba(255,255,255,1); }
        .file-input-green::-webkit-file-upload-button { background-color: #22c55e !important; color: white !important; border: none; padding: 8px 16px; border-radius: 9999px; font-weight: bold; cursor: pointer; margin-right: 12px; }
        .status-bar { transition: all 0.3s ease; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    const excel = e.target.excelFile.files[0];
    if (!txt || !excel) return alert("Seleziona i file!");

    setLoading(true);
    setStatus({ msg: 'FASE 1: Lettura file TXT e caricamento Excel...', type: 'blue' });
    
    try {
      const result = await runRpoScanner(txt, excel);
      if (result.success) {
        setScannerFiles(result);
        setStatus({ msg: `COMPLETATO: Trovati ${result.foundCount} numeri corrispondenti!`, type: 'yellow' });
      }
    } catch (err) {
      setStatus({ msg: 'ERRORE: Elaborazione interrotta.', type: 'red' });
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pb-20">
      <Head><title>GR FENIX | Data Intelligence</title></Head>
      
      <main className="w-full max-w-lg mt-12">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 uppercase">
            <span style={{color:'#0081FB'}}>GR</span> <span className="text-white">FENIX</span>
          </h1>
          <div className="h-1 w-12 bg-[#0081FB] mx-auto mb-2"></div>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">Data Compliance Hub</p>
        </header>

        {/* INDICATORE DI STATO */}
        <div className={`mb-6 p-3 rounded-xl text-center text-[10px] font-bold uppercase tracking-widest status-bar ${
          status.type === 'blue' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 
          status.type === 'yellow' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/50' : 
          status.type === 'red' ? 'bg-red-600/20 text-red-400 border border-red-500/50' : 
          'bg-white/5 text-gray-400 border border-white/10'
        }`}>
          {loading ? '● Operazione in corso...' : `● ${status.msg}`}
        </div>

        <div className="space-y-6">
          
          {/* SEZIONE 1: CONVERTER */}
          <section className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-2">1. RPO Converter</h2>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-6">
              Usa questo strumento per preparare la lista dei numeri da inviare al Registro delle Opposizioni. 
              Carica l'Excel originale: il sistema estrarrà i numeri e creerà un file .txt compatibile.
            </p>
            
            <input type="file" onChange={e => setTempFile(e.target.files[0])} className="w-full text-xs text-gray-400 file-input-green mb-6" />
            
            <button 
              onClick={async () => {
                setLoading(true);
                setStatus({ msg: 'Conversione in corso...', type: 'blue' });
                try {
                  const res = await runRpoConverter(tempFile);
                  setConverterFiles(res);
                  setStatus({ msg: 'File TXT pronto per il download', type: 'yellow' });
                } catch (e) { alert("Errore"); }
                setLoading(false);
              }} 
              disabled={loading || !tempFile} 
              className={`w-full py-4 rounded-xl font-bold text-xs uppercase transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 shadow-lg'}`} 
              style={{backgroundColor:'#0081FB',color:'white'}}
            >
              Genera Lista RPO (.txt)
            </button>
            {converterFiles && (
              <button onClick={() => saveAs(converterFiles.txt, `${converterFiles.fileName}.txt`)} className="w-full py-3 mt-4 rounded-lg glass-download text-[10px] uppercase">Scarica Lista Numeri</button>
            )}
          </section>

          {/* SEZIONE 2: SCANNER */}
          <section className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-2">2. RPO Scanner</h2>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-6">
              Questo è il cuore del sistema. Confronta l'esito ricevuto dal Registro (.txt) con il tuo Excel originale. 
              Le righe corrispondenti ai numeri "Negativi" verranno processate per la tua sicurezza.
            </p>
            
            <form onSubmit={handleScannerSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] text-gray-500 uppercase ml-1">Carica Esito Registro (.txt)</label>
                <input type="file" name="txtFile" required className="w-full text-xs text-gray-400 file-input-green" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] text-gray-500 uppercase ml-1">Carica Excel Originale (.xlsx)</label>
                <input type="file" name="excelFile" required className="w-full text-xs text-gray-400 file-input-green" />
              </div>
              
              <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold text-xs uppercase shadow-lg" style={{backgroundColor: '#0081FB', color: 'white'}}>
                {loading ? "Elaborazione Dati..." : "Inizia Scansione e Marcatura"}
              </button>
              
              {scannerFiles && (
                <div className="pt-6 mt-4 border-t border-white/10 space-y-4">
                  <div>
                    <p className="text-[10px] text-blue-400 mb-2 font-bold uppercase italic">Opzione A: Excel con Evidenziazione</p>
                    <button type="button" onClick={() => saveAs(scannerFiles.excel, 'Excel_Elaborato_Fenix.xlsx')} className="w-full py-3 rounded-lg glass-download text-[10px] uppercase">Scarica Excel Evidenziato</button>
                    <p className="text-[9px] text-gray-500 mt-1 px-1">Le righe con numeri RPO positivi sono colorate di nero.</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-red-400 mb-2 font-bold uppercase italic">Opzione B: Excel per Operatori (Censurato)</p>
                    <button type="button" onClick={() => saveAs(scannerFiles.excelCensored, `CENSURATO_${scannerFiles.originalName}`)} className="w-full py-3 rounded-lg glass-download text-[10px] uppercase">Scarica Excel Censurato</button>
                    <p className="text-[9px] text-gray-500 mt-1 px-1">Tutte le righe RPO positive sono oscurate e illeggibili.</p>
                  </div>
                </div>
              )}
            </form>
          </section>
        </div>

        <footer className="mt-16 text-center border-t border-white/5 pt-8">
          <p className="text-[9px] text-gray-600 uppercase tracking-[0.4em] mb-2">Powered by Fenix Intelligence</p>
          <p className="text-[8px] text-gray-700 max-w-xs mx-auto leading-relaxed">
            Sistema di elaborazione locale. I dati non vengono salvati sui nostri server per garantire la massima privacy.
          </p>
        </footer>
      </main>
    </div>
  );
}