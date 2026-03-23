import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoDivider } from '../logic/divider'; 
import { runRpoSplitter } from '../logic/splitter'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE © 2026', type: 'info' });
  
  // STATO TUTORIAL (0 = chiuso, 1-5 = passi del tutorial)
  const [tutorialStep, setTutorialStep] = useState(0);

  // STEP 1
  const [converterFiles, setConverterFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");

  // STEP 2
  const [dividerFiles, setDividerFiles] = useState(null);
  const [splitPoint, setSplitPoint] = useState("");
  const [nameDividerTxt, setNameDividerTxt] = useState("nessun file selezionato");

  // STEP 3
  const [splitterResult, setSplitterResult] = useState(null);
  const [nameSplitterTxt, setNameSplitterTxt] = useState("nessun file selezionato");

  // STEP 4
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);
  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file selezionato");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file selezionato");

  const handleConverterSubmit = async () => {
    if (!tempFile) return;
    setLoading(true);
    setStatus({ msg: "CREAZIONE ZIP IN CORSO...", type: 'red' });
    try {
      const formData = new FormData();
      formData.append('excel', tempFile);
      const response = await fetch('/api/converter', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const fileName = tempFile.name.split('.')[0].toLowerCase().replace(/\s/g, '_');
      setConverterFiles({ zip: blob, fileName: fileName });
      setStatus({ msg: "ZIP CREATO CON SUCCESSO!", type: 'yellow' });
    } catch (e) { 
      setStatus({ msg: "ERRORE CONVERSIONE", type: 'red' });
      alert("DETTAGLI: " + e.message);
    }
    setLoading(false);
  };

  const handleDividerSubmit = async (e) => {
    e.preventDefault();
    const file = e.target.txtToDivide.files[0];
    if (!file || !splitPoint) return;
    setLoading(true);
    try {
      const res = await runRpoDivider(file, splitPoint);
      setDividerFiles(res);
      setStatus({ msg: "TAGLIO COMPLETATO", type: 'yellow' });
    } catch (err) { setStatus({ msg: "ERRORE TAGLIO", type: 'red' }); }
    setLoading(false);
  };

  const handleSplitterSubmit = async (e) => {
    e.preventDefault();
    const file = e.target.txtToSplit.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await runRpoSplitter(file);
      setSplitterResult(res);
      setStatus({ msg: "SEPARAZIONE COMPLETATA", type: 'yellow' });
    } catch (err) { setStatus({ msg: "ERRORE SEPARAZIONE", type: 'red' }); }
    setLoading(false);
  };

  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return;
    setLoading(true);
    setStatus({ msg: 'BONIFICA IN CORSO...', type: 'red' });
    try {
      const formData = new FormData();
      formData.append('txt', scannerTxt);
      formData.append('excel', scannerExcel);
      const response = await fetch('/api/scanner', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Errore Scanner');
      const blob = await response.blob();
      const matches = response.headers.get('X-Matches') || "0";
      setScannerResult({ blob, count: matches });
      setStatus({ msg: `PULIZIA COMPLETATA: ${matches} RIGHE`, type: 'yellow' });
    } catch (err) { setStatus({ msg: 'ERRORE SCANNER', type: 'red' }); }
    setLoading(false);
  };

  // DATI DEL TUTORIAL
  const tutorialData = [
    { title: "Fase 1: Excel Converter", desc: "Pulisce il tuo Excel originale e genera un file .ZIP pronto per il portale RPO." },
    { title: "Fase 2: TXT Divider", desc: "Taglia il file TXT se vuoi gestire i caricamenti a scaglioni e risparmiare crediti." },
    { title: "Fase 3: TXT Cleaner", desc: "Prendi l'esito RPO e separalo istantaneamente in Numeri OK e Lista Nera." },
    { title: "Fase 4: Excel Scanner", desc: "Carica la Lista Nera e il tuo Excel originale per ottenere il file finale bonificato." },
    { title: "Monitoraggio Stato", desc: "IMPORTANTE: In questo riquadro nero vedrai sempre lo stato dell'operazione. Se è rosso sta lavorando o c'è un errore, se è giallo o bianco l'operazione è conclusa." }
  ];

  // Helper Focus Class
  const getFocusClass = (step) => {
    if (tutorialStep === 0) return "";
    if (tutorialStep === step) return "ring-2 ring-red-500 scale-[1.02] bg-black/80 z-[110] relative";
    return "opacity-20 grayscale pointer-events-none";
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* --- LAYER TUTORIAL --- */}
      {tutorialStep > 0 && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6 transition-all">
          <div className="bg-zinc-900 border border-red-600/50 p-8 rounded-[35px] max-w-lg w-full shadow-[0_0_60px_rgba(0,0,0,0.8)] relative">
            
            <button onClick={() => setTutorialStep(0)} className="absolute top-6 right-8 text-white/10 hover:text-white transition-all text-2xl font-light cursor-pointer">✕</button>
            
            <span className="text-red-500 font-black text-[10px] tracking-[0.3em] uppercase block mb-2">Step {tutorialStep} di 5</span>
            <h3 className="text-2xl font-bold mb-4">{tutorialData[tutorialStep - 1].title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">{tutorialData[tutorialStep - 1].desc}</p>
            
            {/* RETTANGOLINI NAVIGAZIONE */}
            <div className="flex gap-2 mb-10 justify-start">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setTutorialStep(s)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${tutorialStep === s ? 'w-8 bg-white' : 'w-4 bg-white/20 hover:bg-white/40'}`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button 
                onClick={() => setTutorialStep(prev => prev > 1 ? prev - 1 : prev)}
                className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer ${tutorialStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-40 hover:opacity-100 transition-all'}`}
              >
                Indietro
              </button>
              <button 
                onClick={() => tutorialStep < 5 ? setTutorialStep(tutorialStep + 1) : setTutorialStep(0)}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                {tutorialStep === 5 ? "Inizia ora" : "Avanti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTONE TUTORIAL VOLANTE --- */}
      <div className="fixed bottom-8 right-8 z-[90] group flex items-center">
        <div className="mr-4 bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-2xl translate-x-2 group-hover:translate-x-0">
          Guida Rapida
        </div>
        <button onClick={() => setTutorialStep(1)} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-[0_10px_30px_rgba(220,38,38,0.5)] hover:scale-110 active:scale-90 transition-all border-2 border-white/10 cursor-pointer">?</button>
      </div>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        
        {/* BARRA DI STATO (Focus Step 5) */}
        <div className={`bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-red-500/30 shadow-2xl text-center transition-all duration-500 ${getFocusClass(5)}`}>
          <span className="font-bold uppercase tracking-widest block px-4 text-xs md:text-sm">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-stretch">
        
        {/* STEP 1 */}
        <section className={`box-lavoro ${getFocusClass(1)}`}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">1</span>
            Excel Converter
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Estrae i numeri e genera lo <b>.ZIP</b>.</p>
          <div className="space-y-4">
            <label className="input-file-style">
              <span className="text-[10px] font-bold uppercase">Excel Base:</span>
              <input type="file" className="hidden" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{fileNameExcel}</span>
            </label>
            <button onClick={handleConverterSubmit} disabled={loading || !tempFile} className="btn-main">{loading ? "ELABORAZIONE..." : "GENERA .ZIP"}</button>
            {converterFiles && (
              <button onClick={() => saveAs(converterFiles.zip, `lista_${converterFiles.fileName}.zip`)} className="btn-download">SCARICA .ZIP</button>
            )}
          </div>
        </section>

        {/* STEP 2 */}
        <section className={`box-lavoro ${getFocusClass(2)}`}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">2</span>
            TXT Divider
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Spezza il file per gestire i crediti.</p>
          <form onSubmit={handleDividerSubmit} className="space-y-4">
            <label className="input-file-style">
              <span className="text-[10px] font-bold uppercase">File TXT:</span>
              <input type="file" name="txtToDivide" required className="hidden" onChange={e => setNameDividerTxt(e.target.files[0]?.name || "nessun file")} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameDividerTxt}</span>
            </label>
            <input type="number" placeholder="RIGA DI TAGLIO" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs text-white outline-none focus:border-red-500" value={splitPoint} onChange={(e) => setSplitPoint(e.target.value)} />
            <button type="submit" disabled={loading} className="btn-main">DIVIDI LISTA</button>
          </form>
        </section>
        
        {/* STEP 3 */}
        <section className={`box-lavoro ${getFocusClass(3)}`}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">3</span>
            TXT Cleaner
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Separa i numeri caricando l'esito RPO.</p>
          <form onSubmit={handleSplitterSubmit} className="space-y-4">
            <label className="input-file-style">
              <span className="text-[10px] font-bold uppercase">File RPO:</span>
              <input type="file" name="txtToSplit" required className="hidden" onChange={e => setNameSplitterTxt(e.target.files[0]?.name || "nessun file")} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameSplitterTxt}</span>
            </label>
            <button type="submit" disabled={loading} className="btn-main">SEPARA LISTA</button>
          </form>
        </section>

        {/* STEP 4 */}
        <section className={`box-lavoro border-red-500/40 ${getFocusClass(4)}`}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/40 flex items-center justify-center font-black">4</span>
            Excel Scanner
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Confronta e annerisci l'Excel originale.</p>
          <form onSubmit={handleScannerSubmit} className="space-y-4">
            <label className="input-file-style">
              <span className="text-[10px] font-bold uppercase">TXT RPO:</span>
              <input type="file" accept=".txt" className="hidden" onChange={e => {setScannerTxt(e.target.files[0]); setNameScannerTxt(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerTxt}</span>
            </label>
            <label className="input-file-style">
              <span className="text-[10px] font-bold uppercase">Excel Originale:</span>
              <input type="file" accept=".xlsx" className="hidden" onChange={e => {setScannerExcel(e.target.files[0]); setNameScannerExcel(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerExcel}</span>
            </label>
            <button type="submit" disabled={loading || !scannerTxt || !scannerExcel} className="btn-main bg-red-500 hover:bg-red-600 text-white">AVVIA BONIFICA</button>
          </form>
          {scannerResult && (
            <button onClick={() => saveAs(scannerResult.blob, `${nameScannerExcel.replace('.xlsx', '')}_Lista_Bonificata.xlsx`)} className="btn-download bg-green-600 text-white mt-4 animate-pulse">SCARICA EXCEL ({scannerResult.count})</button>
          )}
        </section>

      </main>

      <footer className="mt-24 opacity-20 text-[8px] tracking-[0.8em] uppercase font-bold text-center">REALINDI®DEN SYSTEM © 2026</footer>

      <style jsx>{`
        .box-lavoro { @apply bg-black/40 backdrop-blur-md p-6 rounded-[32px] border border-white/10 flex flex-col h-full transition-all duration-500; }
        .input-file-style { @apply flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all; }
        .btn-main { @apply w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 cursor-pointer; }
        .btn-download { @apply w-full py-4 bg-red-500/10 border border-red-500/40 text-red-400 rounded-2xl font-black text-xs hover:bg-red-500/20 transition-all cursor-pointer; }
      `}</style>
    </div>
  );
}
