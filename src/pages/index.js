import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoDivider } from '../logic/divider'; 
import { runRpoSplitter } from '../logic/splitter'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE © 2026', type: 'info' });
  const [tutorialStep, setTutorialStep] = useState(0);

  // Stati per i file (rimangono invariati)
  const [converterFiles, setConverterFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");
  const [dividerFiles, setDividerFiles] = useState(null);
  const [splitPoint, setSplitPoint] = useState("");
  const [nameDividerTxt, setNameDividerTxt] = useState("nessun file selezionato");
  const [splitterResult, setSplitterResult] = useState(null);
  const [nameSplitterTxt, setNameSplitterTxt] = useState("nessun file selezionato");
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);
  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file selezionato");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file selezionato");

  // Logica funzioni (rimane invariata)
  const handleConverterSubmit = async () => { /* ... logica esistente ... */ };
  const handleDividerSubmit = async (e) => { /* ... logica esistente ... */ };
  const handleSplitterSubmit = async (e) => { /* ... logica esistente ... */ };
  const handleScannerSubmit = async (e) => { /* ... logica esistente ... */ };

  const tutorialData = [
    { title: "Fase 1: Excel Converter", desc: "Questa fase pulisce il tuo Excel originale lasciando solo i numeri di telefono. Genera un file .ZIP per il portale RPO." },
    { title: "Fase 2: TXT Divider", desc: "Taglia il file TXT a una riga specifica per gestire al meglio i tuoi crediti sul portale." },
    { title: "Fase 3: TXT Cleaner", desc: "Separa l'esito del Registro in 'Lista Nera' (iscritti) e 'Numeri OK' (chiamabili)." },
    { title: "Fase 4: Excel Scanner", desc: "Annerisce automaticamente le righe degli iscritti nel tuo Excel originale." }
  ];

  // Funzione per gestire le classi CSS dinamiche dei box
  const getBoxClass = (stepNumber) => {
    let base = "box-lavoro ";
    if (tutorialStep === 0) return base; // Tutorial spento, tutto normale
    if (tutorialStep === stepNumber) return base + "tutorial-active"; // Box evidenziato
    return base + "tutorial-dimmed"; // Altri box oscurati
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* OVERLAY TUTORIAL (Il popup centrale) */}
      {tutorialStep > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-zinc-900/90 border border-red-600/50 p-8 rounded-[35px] max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,1)] relative pointer-events-auto">
            <button onClick={() => setTutorialStep(0)} className="absolute top-6 right-8 text-white/20 hover:text-white transition-all text-2xl font-light">✕</button>
            <span className="text-red-500 font-black text-[10px] tracking-[0.3em] uppercase block mb-2">Step {tutorialStep} di 4</span>
            <h3 className="text-2xl font-bold mb-4">{tutorialData[tutorialStep - 1].title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-10">{tutorialData[tutorialStep - 1].desc}</p>
            <div className="flex justify-between items-center">
              <button onClick={() => setTutorialStep(prev => prev > 1 ? prev - 1 : prev)} className={`text-[10px] font-bold uppercase tracking-widest ${tutorialStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-40 hover:opacity-100 transition-all cursor-pointer'}`}>Indietro</button>
              <button onClick={() => tutorialStep < 4 ? setTutorialStep(tutorialStep + 1) : setTutorialStep(0)} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 cursor-pointer">
                {tutorialStep === 4 ? "Ho capito" : "Avanti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTONE TUTORIAL VOLANTE */}
      <div className="fixed bottom-8 right-8 z-[90] group flex items-center">
        <div className="mr-4 bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-2xl translate-x-2 group-hover:translate-x-0">Tutorial</div>
        <button onClick={() => setTutorialStep(1)} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-[0_10px_30px_rgba(220,38,38,0.5)] hover:scale-110 active:scale-90 transition-all border-2 border-white/10 cursor-pointer">?</button>
      </div>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-red-500/30 shadow-2xl text-center">
          <span className="font-bold uppercase tracking-widest block px-4 text-xs md:text-sm">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-stretch relative">
        
        {/* STEP 1 */}
        <section className={getBoxClass(1)}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">1</span>
            Excel Converter
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Estrae i numeri e genera lo <b>.ZIP</b>.</p>
          <div className="space-y-4">
            <label className="input-file-label">
              <span className="text-[10px] font-bold uppercase">Excel Base:</span>
              <input type="file" className="hidden" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{fileNameExcel}</span>
            </label>
            <button onClick={handleConverterSubmit} disabled={loading || !tempFile} className="btn-fenix">{loading ? "ELABORAZIONE..." : "GENERA .ZIP"}</button>
          </div>
        </section>

        {/* STEP 2 */}
        <section className={getBoxClass(2)}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">2</span>
            TXT Divider
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Spezza il file per gestire i crediti.</p>
          <form className="space-y-4">
            <label className="input-file-label">
              <span className="text-[10px] font-bold uppercase">File TXT:</span>
              <input type="file" className="hidden" onChange={e => setNameDividerTxt(e.target.files[0]?.name || "nessun file")} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameDividerTxt}</span>
            </label>
            <input type="number" placeholder="RIGA DI TAGLIO" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs text-white" />
            <button type="button" className="btn-fenix">DIVIDI LISTA</button>
          </form>
        </section>
        
        {/* STEP 3 */}
        <section className={getBoxClass(3)}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">3</span>
            TXT Cleaner
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Separa <b>OK</b> e <b>RPO</b>.</p>
          <form className="space-y-4">
            <label className="input-file-label">
              <span className="text-[10px] font-bold uppercase">File RPO:</span>
              <input type="file" className="hidden" onChange={e => setNameSplitterTxt(e.target.files[0]?.name || "nessun file")} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameSplitterTxt}</span>
            </label>
            <button type="button" className="btn-fenix">SEPARA LISTA</button>
          </form>
        </section>

        {/* STEP 4 */}
        <section className={getBoxClass(4)}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/40 flex items-center justify-center font-black">4</span>
            Excel Scanner
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">Bonifica l'Excel originale.</p>
          <form className="space-y-4">
            <label className="input-file-label"><span className="text-[10px] font-bold uppercase">TXT RPO:</span><input type="file" className="hidden" /></label>
            <label className="input-file-label"><span className="text-[10px] font-bold uppercase">Excel Originale:</span><input type="file" className="hidden" /></label>
            <button type="button" className="btn-fenix bg-red-500 hover:bg-red-600">AVVIA BONIFICA</button>
          </form>
        </section>

      </main>

      <footer className="mt-24 opacity-20 text-[8px] tracking-[0.8em] uppercase font-bold text-center">REALINDI®DEN SYSTEM © 2026</footer>

      <style jsx>{`
        .box-lavoro {
          @apply bg-black/40 backdrop-blur-md p-6 rounded-[32px] border border-white/10 flex flex-col h-full transition-all duration-500 ease-in-out;
        }
        
        /* EFFETTI PC SPECIFICI PER IL TUTORIAL */
        @media (min-width: 1024px) {
          .tutorial-active {
            @apply z-[110] scale-[1.05] border-red-500 bg-black/80 shadow-[0_0_40px_rgba(239,68,68,0.3)];
            transform: translateY(-10px);
          }
          
          .tutorial-dimmed {
            @apply opacity-20 grayscale-[0.5] scale-[0.95] pointer-events-none;
          }
        }

        .btn-fenix { @apply w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 cursor-pointer; }
        .input-file-label { @apply flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all; }
      `}</style>
    </div>
  );
}
