import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoDivider } from '../logic/divider'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE © 2026', type: 'info' });
  
  const [converterFiles, setConverterFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");

  const [dividerFiles, setDividerFiles] = useState(null);
  const [fileNameTxt, setFileNameTxt] = useState("nessun file selezionato");

  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);
  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file selezionato");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file selezionato");

  // ==========================================
  // 🔵 LOGICA 1: CONVERTER (CON DIAGNOSTICA)
  // ==========================================
  const handleConverterSubmit = async () => {
    if (!tempFile) return;
    setLoading(true);
    setStatus({ msg: "INVIO AL SERVER PYTHON...", type: 'red' });
    
    try {
      const formData = new FormData();
      formData.append('excel', tempFile);

      const response = await fetch('/api/converter', {
        method: 'POST',
        body: formData,
      });

      // Se il server risponde con un errore (es. 500 o 404)
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      if (blob.size < 10) throw new Error("Il file generato è vuoto!");

      const fileName = tempFile.name.split('.')[0].toLowerCase().replace(/\s/g, '_');
      
      setConverterFiles({ txt: blob, fileName: fileName });
      setStatus({ msg: "CONVERSIONE RIUSCITA!", type: 'yellow' });
    } catch (e) { 
      console.error(e);
      // SCRIVE L'ERRORE ESATTO SULLO SCHERMO
      setStatus({ msg: `ERRORE: ${e.message.substring(0, 40)}...`, type: 'red' });
      alert("DETTAGLI ERRORE: " + e.message); // Questo ti aiuta a capire dal cellulare
    }
    setLoading(false);
  };

  // ==========================================
  // 🟢 LOGICA 2: DIVIDER
  // ==========================================
  const handleDividerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    if (!txt) return;
    setLoading(true);
    try {
      const result = await runRpoDivider(txt);
      if (result?.success) {
        setDividerFiles(result);
        setStatus({ msg: `DIVISIONE COMPLETATA`, type: 'yellow' });
      }
    } catch (err) {
      setStatus({ msg: 'ERRORE DIVISIONE', type: 'red' });
    }
    setLoading(false);
  };

  // ==========================================
  // 🟣 LOGICA 3: SCANNER
  // ==========================================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return;
    setLoading(true);
    setStatus({ msg: 'BONIFICA IN CORSO...', type: 'red' });

    try {
      const formData = new FormData();
      formData.append('txt', scannerTxt);
      formData.append('excel', scannerExcel);

      const response = await fetch('/api/scanner', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore Scanner: ${errorText}`);
      }

      const blob = await response.blob();
      const matches = response.headers.get('X-Matches') || "0";

      setScannerResult({ blob, count: matches });
      setStatus({ msg: `PULIZIA COMPLETATA: ${matches} RIGHE`, type: 'yellow' });
    } catch (err) {
      setStatus({ msg: 'ERRORE SCANNER', type: 'red' });
      alert(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #ee5556 0%, #000000 75%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6" />
        <div className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-2xl shadow-black/40 text-center">
          <span className="font-bold uppercase tracking-widest block px-4">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* STEP 1 */}
        <section className="box-lavoro relative bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl overflow-hidden">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black">1</span>
            RPO Converter
          </h2>
          <p className="text-gray-200 text-xs mb-8">Inserisci la lista Excel e genera il file TXT pronto per l'invio.</p>
          <div className="space-y-4">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">Excel Base:</span>
              <input type="file" className="hidden" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{fileNameExcel}</span>
            </label>
            <button onClick={handleConverterSubmit} disabled={loading || !tempFile} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest disabled:opacity-50">
              {loading ? "ELABORAZIONE..." : "CREA FILE"}
            </button>
            {converterFiles && (
              <button onClick={() => saveAs(converterFiles.txt, `perinvio_${converterFiles.fileName}.txt`)} className="w-full py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-black text-xs">
                SCARICA TXT
              </button>
            )}
          </div>
        </section>

        {/* STEP 2 */}
        <section className="box-lavoro relative bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl overflow-hidden">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black">2</span>
            RPO Divider
          </h2>
          <p className="text-gray-200 text-xs mb-8">Separa il file txt in due 0 = numeri puliti e 1 = numeri nell'RPO.</p>
          <form onSubmit={handleDividerSubmit} className="space-y-4">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">File RPO:</span>
              <input type="file" name="txtFile" required onChange={e => setFileNameTxt(e.target.files[0]?.name || "nessun file")} className="hidden" />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{fileNameTxt}</span>
            </label>
            <button type="submit" disabled={loading} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest">
              DIVIDI LISTE
            </button>
            {dividerFiles && (
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => saveAs(dividerFiles.txtUno, `rpo_1.txt`)} className="py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-black text-xs">RPO (1)</button>
                <button type="button" onClick={() => saveAs(dividerFiles.txtZero, `ok_0.txt`)} className="py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-black text-xs">OK (0)</button>
              </div>
            )}
          </form>
        </section>

        {/* STEP 3 */}
        <section className="box-lavoro relative bg-black/40 backdrop-blur-md border border-white/30 p-8 rounded-3xl overflow-hidden">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black">3</span>
            RPO Scanner
          </h2>
          <p className="text-gray-200 text-xs mb-8">Bonifica l'Excel annerendo le righe.</p>
          <form onSubmit={handleScannerSubmit} className="space-y-4">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">TXT RPO:</span>
              <input type="file" accept=".txt" className="hidden" onChange={e => {setScannerTxt(e.target.files[0]); setNameScannerTxt(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerTxt}</span>
            </label>
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
              <span className="text-[10px] font-bold uppercase">Excel Base:</span>
              <input type="file" accept=".xlsx" className="hidden" onChange={e => {setScannerExcel(e.target.files[0]); setNameScannerExcel(e.target.files[0]?.name || "nessun file");}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerExcel}</span>
            </label>
            <button type="submit" disabled={loading || !scannerTxt || !scannerExcel} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-2xl">
              AVVIA SCANNER
            </button>
          </form>
          {scannerResult && (
            <button onClick={() => saveAs(scannerResult.blob, `PULITO.xlsx`)} className="w-full mt-4 py-4 bg-green-500 text-white font-black rounded-2xl animate-bounce text-sm">
              SCARICA ({scannerResult.count})
            </button>
          )}
        </section>

      </main>

      <footer className="mt-24 opacity-30 text-[9px] tracking-[0.5em] uppercase font-bold text-center">
        POWERED AND BUILDED BY REALINDI®DEN © 2026
      </footer>
    </div>
  );
}
