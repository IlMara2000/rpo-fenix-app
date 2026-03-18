import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoDivider } from '../logic/divider'; 
import { runRpoSplitter } from '../logic/splitter'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE © 2026', type: 'info' });
  
  // STEP 1
  const [converterFiles, setConverterFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");

  // STEP 2 (Divider nuovo)
  const [dividerFiles, setDividerFiles] = useState(null);
  const [splitPoint, setSplitPoint] = useState("");
  const [nameDividerTxt, setNameDividerTxt] = useState("nessun file selezionato");

  // STEP 3 (Splitter vecchio)
  const [splitterResult, setSplitterResult] = useState(null);
  const [nameSplitterTxt, setNameSplitterTxt] = useState("nessun file selezionato");

  // STEP 4 (Scanner)
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

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-red-500/30 shadow-2xl text-center">
          <span className="font-bold uppercase tracking-widest block px-4 text-xs md:text-sm">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-stretch">
        
        {/* STEP 1 */}
        <section className="box-lavoro relative overflow-hidden">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">1</span>
            Excel Converter
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">
            Estrae i numeri dall'Excel e genera automaticamente l'archivio <b>.ZIP</b> pronto per il portale RPO. 
          </p>
          <div className="space-y-4">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">Excel Base:</span>
              <input type="file" className="hidden" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{fileNameExcel}</span>
            </label>
            <button onClick={handleConverterSubmit} disabled={loading || !tempFile} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50">
              {loading ? "ELABORAZIONE..." : "GENERA .ZIP"}
            </button>
            {converterFiles && (
              <button onClick={() => saveAs(converterFiles.zip, `lista_${converterFiles.fileName}.zip`)} className="w-full py-4 bg-red-500/10 border border-red-500/40 text-red-400 rounded-2xl font-black text-xs hover:bg-red-500/20 transition-all">
                SCARICA .ZIP
              </button>
            )}
          </div>
        </section>

        {/* STEP 2 - IL NUOVO DIVIDER */}
        <section className="box-lavoro relative overflow-hidden">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">2</span>
            TXT Divider
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">
            Taglia il file TXT dalla riga scelta in poi per evitare l'<b>Error 63</b>.
          </p>
          <form onSubmit={handleDividerSubmit} className="space-y-4">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">File TXT:</span>
              <input type="file" name="txtToDivide" required className="hidden" onChange={e => setNameDividerTxt(e.target.files[0]?.name || "nessun file")} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameDividerTxt}</span>
            </label>
            <input 
              type="number" 
              placeholder="RIGA DI TAGLIO (es. 32335)" 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-red-500"
              value={splitPoint}
              onChange={(e) => setSplitPoint(e.target.value)}
            />
            <button type="submit" disabled={loading} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all">
              DIVIDI LISTA
            </button>
            {dividerFiles && (
              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => saveAs(dividerFiles.fileA, `${dividerFiles.originalName}_PARTE1.txt`)} className="py-3 bg-black border border-red-500/40 text-red-500 rounded-2xl font-black text-[10px]">PARTE 1 ({dividerFiles.countA})</button>
                <button type="button" onClick={() => saveAs(dividerFiles.fileB, `${dividerFiles.originalName}_PARTE2.txt`)} className="py-3 bg-black border border-red-500/40 text-red-500 rounded-2xl font-black text-[10px]">PARTE 2 ({dividerFiles.countB})</button>
              </div>
            )}
          </form>
        </section>
        
        {/* STEP 3 - EX STEP 2 (CLEANER) */}
        <section className="box-lavoro relative overflow-hidden">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center font-black">3</span>
            TXT Cleaner
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">
            Separa i numeri in <b>OK (chiamabili)</b> e <b>RPO (iscritti)</b> caricando il file restituito dal Registro.
          </p>
          <form onSubmit={handleSplitterSubmit} className="space-y-4">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">File RPO:</span>
              <input type="file" name="txtToSplit" required className="hidden" onChange={e => setNameSplitterTxt(e.target.files[0]?.name || "nessun file")} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameSplitterTxt}</span>
            </label>
            <button type="submit" disabled={loading} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all">
              SEPARA LISTA
            </button>
            {splitterResult && (
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => saveAs(splitterResult.txtUno, `iscritti_rpo.txt`)} className="py-4 bg-black border border-red-500/40 text-red-500 rounded-2xl font-black text-[10px]">LISTA NERA (1)</button>
                <button type="button" onClick={() => saveAs(splitterResult.txtZero, `numeri_ok.txt`)} className="py-4 bg-green-500/20 border border-green-500/40 text-green-400 rounded-2xl font-black text-[10px]">LISTA OK (0)</button>
              </div>
            )}
          </form>
        </section>

        {/* STEP 4 - EX STEP 3 (SCANNER) */}
        <section className="box-lavoro relative overflow-hidden border-red-500/40">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/40 flex items-center justify-center font-black">4</span>
            Excel Scanner
          </h2>
          <p className="text-gray-300 text-[11px] mb-8 leading-relaxed">
            Confronta l'Excel originale con il file degli iscritti. Le righe corrispondenti verranno <b>annerite</b>.
          </p>
          <form onSubmit={handleScannerSubmit} className="space-y-4">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">TXT RPO:</span>
              <input type="file" accept=".txt" className="hidden" onChange={e => {setScannerTxt(e.target.files[0]); setNameScannerTxt(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerTxt}</span>
            </label>
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">Excel Originale:</span>
              <input type="file" accept=".xlsx" className="hidden" onChange={e => {setScannerExcel(e.target.files[0]); setNameScannerExcel(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerExcel}</span>
            </label>
            <button type="submit" disabled={loading || !scannerTxt || !scannerExcel} className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-2xl hover:bg-red-600 transition-all">
              AVVIA BONIFICA
            </button>
          </form>
          {scannerResult && (
            <button onClick={() => saveAs(scannerResult.blob, `EXCEL_BONIFICATO.xlsx`)} className="w-full mt-4 py-4 bg-green-600 text-white font-black rounded-2xl animate-pulse text-sm">
              SCARICA EXCEL ({scannerResult.count})
            </button>
          )}
        </section>

      </main>

      <footer className="mt-24 opacity-20 text-[8px] tracking-[0.8em] uppercase font-bold text-center">
        REALINDI®DEN SYSTEM © 2026
      </footer>
    </div>
  );
}
