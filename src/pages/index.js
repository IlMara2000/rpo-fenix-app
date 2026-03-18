import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoDivider } from '../logic/divider'; 
import { runRpoSplitter } from '../logic/splitter'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE © 2026', type: 'info' });
  
  // STEP 1: Converter
  const [converterFiles, setConverterFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");

  // STEP 2: Divider
  const [dividerFiles, setDividerFiles] = useState(null);
  const [splitPoint, setSplitPoint] = useState("");
  const [nameDividerTxt, setNameDividerTxt] = useState("nessun file selezionato");

  // STEP 3: Splitter/Cleaner
  const [splitterResult, setSplitterResult] = useState(null);
  const [nameSplitterTxt, setNameSplitterTxt] = useState("nessun file selezionato");

  // STEP 4: Scanner
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
    } catch (e) { alert(e.message); }
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
      setStatus({ msg: "PULIZIA TXT COMPLETATA", type: 'yellow' });
    } catch (err) { setStatus({ msg: "ERRORE PULIZIA", type: 'red' }); }
    setLoading(false);
  };

  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('txt', scannerTxt);
      formData.append('excel', scannerExcel);
      const response = await fetch('/api/scanner', { method: 'POST', body: formData });
      const blob = await response.blob();
      setScannerResult({ blob, count: response.headers.get('X-Matches') || "0" });
      setStatus({ msg: "BONIFICA COMPLETATA", type: 'yellow' });
    } catch (err) { setStatus({ msg: "ERRORE SCANNER", type: 'red' }); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
      </Head>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[120px] mb-6" />
        <div className="bg-black/80 p-4 rounded-2xl border border-red-500/30 text-center">
          <span className="font-bold uppercase tracking-widest text-xs">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1600px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* STEP 1: CONVERTER */}
        <section className="box-lavoro">
          <h2 className="step-title"><span className="step-num">1</span> Converter</h2>
          <p className="step-desc">Genera lo ZIP. Occhio ai limiti di credito (Error 63).</p>
          <div className="space-y-3">
            <label className="input-file-label">
              <span>{fileNameExcel}</span>
              <input type="file" className="hidden" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name);}} />
            </label>
            <button onClick={handleConverterSubmit} className="btn-fenix">GENERA .ZIP</button>
            {converterFiles && <button onClick={() => saveAs(converterFiles.zip, `lista_${converterFiles.fileName}.zip`)} className="btn-download">SCARICA ZIP</button>}
          </div>
        </section>

        {/* STEP 2: DIVIDER */}
        <section className="box-lavoro border-yellow-500/20">
          <h2 className="step-title text-yellow-500"><span className="step-num bg-yellow-500/20">2</span> Divider</h2>
          <p className="step-desc">Spezza il TXT alla riga scelta per non superare i crediti.</p>
          <form onSubmit={handleDividerSubmit} className="space-y-3">
            <label className="input-file-label">
              <span>{nameDividerTxt}</span>
              <input type="file" name="txtToDivide" required className="hidden" onChange={e => setNameDividerTxt(e.target.files[0]?.name)} />
            </label>
            <input type="number" placeholder="Riga di taglio (es. 32000)" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs" value={splitPoint} onChange={e => setSplitPoint(e.target.value)} />
            <button type="submit" className="btn-fenix bg-yellow-600">TAGLIA LISTA</button>
            {dividerFiles && (
              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => saveAs(dividerFiles.fileA, `${dividerFiles.originalName}_PARTE_1.txt`)} className="btn-download text-[9px]">PARTE 1 ({dividerFiles.countA})</button>
                <button type="button" onClick={() => saveAs(dividerFiles.fileB, `${dividerFiles.originalName}_PARTE_2.txt`)} className="btn-download text-[9px]">PARTE 2 ({dividerFiles.countB})</button>
              </div>
            )}
          </form>
        </section>

        {/* STEP 3: CLEANER */}
        <section className="box-lavoro">
          <h2 className="step-title"><span className="step-num">3</span> Cleaner</h2>
          <p className="step-desc">Separa il file RPO in Numeri OK e Iscritti (Lista Nera).</p>
          <form onSubmit={handleSplitterSubmit} className="space-y-3">
            <label className="input-file-label">
              <span>{nameSplitterTxt}</span>
              <input type="file" name="txtToSplit" required className="hidden" onChange={e => setNameSplitterTxt(e.target.files[0]?.name)} />
            </label>
            <button type="submit" className="btn-fenix">PULISCI TXT</button>
            {splitterResult && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => saveAs(splitterResult.txtUno, `iscritti_rpo.txt`)} className="btn-download text-[9px] bg-red-900/40">ISCRITTI (1)</button>
                <button type="button" onClick={() => saveAs(splitterResult.txtZero, `numeri_ok.txt`)} className="btn-download text-[9px] bg-green-900/40">OK (0)</button>
              </div>
            )}
          </form>
        </section>

        {/* STEP 4: SCANNER */}
        <section className="box-lavoro border-red-500/40">
          <h2 className="step-title"><span className="step-num">4</span> Scanner</h2>
          <p className="step-desc">Annerisce le righe nell'Excel basandosi sulla Lista Nera.</p>
          <form onSubmit={handleScannerSubmit} className="space-y-3">
            <label className="input-file-label">
              <span>{nameScannerTxt}</span>
              <input type="file" className="hidden" onChange={e => {setScannerTxt(e.target.files[0]); setNameScannerTxt(e.target.files[0]?.name);}} />
            </label>
            <label className="input-file-label">
              <span>{nameScannerExcel}</span>
              <input type="file" className="hidden" onChange={e => {setScannerExcel(e.target.files[0]); setNameScannerExcel(e.target.files[0]?.name);}} />
            </label>
            <button type="submit" className="btn-fenix bg-red-600">AVVIA BONIFICA</button>
            {scannerResult && <button onClick={() => saveAs(scannerResult.blob, `EXCEL_BONIFICATO.xlsx`)} className="btn-download animate-pulse">SCARICA EXCEL ({scannerResult.count})</button>}
          </form>
        </section>

      </main>

      <style jsx>{`
        .box-lavoro { @apply bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col; }
        .step-title { @apply text-xl font-bold mb-3 flex items-center gap-2; }
        .step-num { @apply bg-red-500/20 px-3 py-1 rounded; }
        .step-desc { @apply text-[10px] text-gray-400 mb-4; }
        .btn-fenix { @apply w-full py-3 bg-white text-black font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all; }
        .btn-download { @apply w-full py-3 bg-green-500 text-white font-bold rounded-xl text-[10px] uppercase; }
        .input-file-label { @apply flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer text-[10px] overflow-hidden; }
        .input-file-label span { @apply truncate opacity-50; }
      `}</style>

      <footer className="mt-12 opacity-20 text-[8px] tracking-[0.8em] font-bold">REALINDI®DEN SYSTEM © 2026</footer>
    </div>
  );
}
