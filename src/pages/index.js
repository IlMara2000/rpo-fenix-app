import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoConverter } from '../logic/converter';
import { runRpoScanner } from '../logic/scanner';

export default function Home() {
  // Iniezione Tailwind e Stili Globali ispirati a grfenix.com
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
        
        body { 
          background: radial-gradient(circle at top, #1a1a1a 0%, #000000 100%) !important;
          color: #ffffff !important;
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
          overflow-x: hidden;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        .glass-download {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          color: #000000;
          font-weight: 800;
          border: 1px solid rgba(255, 255, 255, 1);
        }

        /* Styling per i bottoni Scegli File */
        .file-input-green::-webkit-file-upload-button {
          background-color: #22c55e !important; /* Verde Speranza */
          color: white !important;
          border: none;
          padding: 8px 16px;
          border-radius: 9999px;
          font-weight: bold;
          cursor: pointer;
          margin-right: 12px;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'Sistema Pronto', type: 'info' });
  
  // Stati per i file pronti al download
  const [converterFiles, setConverterFiles] = useState(null); // { txt, zip, fileName }
  const [scannerFiles, setScannerFiles] = useState(null); // { excel, numbersTxt }

  const updateStatus = (msg, type = 'info') => setStatus({ msg, type });

  // Gestione Converter
  const [tempFile, setTempFile] = useState(null);
  const handleConverter = async () => {
    if (!tempFile) return updateStatus('Carica un file prima', 'red');
    setLoading(true);
    updateStatus('Conversione...', 'blue');
    try {
      const result = await runRpoConverter(tempFile);
      setConverterFiles(result);
      updateStatus('File pronti per il download', 'yellow');
    } catch (err) { updateStatus('Errore!', 'red'); }
    setLoading(false);
  };

  // Gestione Scanner
  const handleScanner = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    const excel = e.target.excelFile.files[0];
    if (!txt || !excel) return updateStatus('Seleziona entrambi i file', 'red');
    setLoading(true);
    updateStatus('Scansione...', 'blue');
    try {
      const result = await runRpoScanner(txt, excel);
      setScannerFiles(result);
      updateStatus('Scansione completata!', 'yellow');
    } catch (err) { updateStatus('Errore!', 'red'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pb-20">
      <Head>
        <title>GR FENIX | RPO Tool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <main className="w-full max-w-lg mt-12">
        {/* Header con colori invertiti */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 uppercase">
            <span style={{color: '#0081FB'}}>GR</span> <span className="text-white">FENIX</span>
          </h1>
          <div className="h-1 w-12 bg-[#0081FB] mx-auto mb-4"></div>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">Data Compliance Hub</p>
        </header>

        <div className="space-y-6">
          
          {/* Box 1 - RPO CONVERTER */}
          <section className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-1">RPO Converter</h2>
            <p className="text-gray-500 text-[11px] mb-6 uppercase tracking-wider">Generazione Liste TXT/ZIP</p>
            
            <div className="space-y-6">
              <input 
                type="file" 
                onChange={(e) => setTempFile(e.target.files[0])}
                className="w-full text-xs text-gray-400 file-input-green"
              />
              
              <button 
                onClick={handleConverter}
                disabled={loading || !tempFile}
                className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                style={{backgroundColor: '#0081FB', color: 'white'}}
              >
                {loading ? "Elaborazione..." : "Crea Liste RPO"}
              </button>

              {/* Download Buttons Converter */}
              {converterFiles && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                    <button 
                        onClick={() => saveAs(converterFiles.txt, `${converterFiles.fileName}.txt`)}
                        className="w-full py-3 rounded-lg glass-download text-[10px] uppercase tracking-wider active:scale-95 transition-all"
                    >
                        Download TXT
                    </button>
                    <button 
                        onClick={() => saveAs(converterFiles.zip, `${converterFiles.fileName}.zip`)}
                        className="w-full py-3 rounded-lg glass-download text-[10px] uppercase tracking-wider active:scale-95 transition-all"
                    >
                        Download ZIP (Backup)
                    </button>
                </div>
              )}
            </div>
          </section>

          {/* Box 2 - RPO SCANNER */}
          <section className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-1">RPO Scanner</h2>
            <p className="text-gray-500 text-[11px] mb-6 uppercase tracking-wider">Confronto e Marcatura Excel</p>
            
            <form onSubmit={handleScanner} className="space-y-5">
              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 uppercase ml-1">Esito RPO (.txt)</label>
                <input type="file" name="txtFile" className="w-full text-xs text-gray-400 file-input-green" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-gray-500 uppercase ml-1">Excel Originale (.xlsx)</label>
                <input type="file" name="excelFile" className="w-full text-xs text-gray-400 file-input-green" />
              </div>
              
              <button 
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                style={{backgroundColor: '#0081FB', color: 'white'}}
              >
                {loading ? "Processando..." : "Inizia Scansione"}
              </button>

              {/* Download Buttons Scanner */}
              {scannerFiles && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                    <button 
                        onClick={() => saveAs(scannerFiles.excel, 'Excel_Elaborato_Fenix.xlsx')}
                        className="w-full py-3 rounded-lg glass-download text-[10px] uppercase tracking-wider active:scale-95 transition-all"
                    >
                        Scarica Excel Elaborato
                    </button>
                    <button 
                        onClick={() => saveAs(scannerFiles.numbersTxt, 'Numeri_Trovati.txt')}
                        className="w-full py-3 rounded-lg glass-download text-[10px] uppercase tracking-wider active:scale-95 transition-all"
                    >
                        Scarica Lista Numeri
                    </button>
                </div>
              )}
            </form>
          </section>
        </div>

        <footer className="mt-16 text-center">
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.4em]">Powered by Fenix Intelligence</p>
        </footer>
      </main>
    </div>
  );
}