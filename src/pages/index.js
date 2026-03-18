import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs'; 
import { runRpoConverter } from '../logic/converter';
import { runRpoDivider } from '../logic/divider'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE © 2026', type: 'info' });
  
  // STATI SEZIONE 1 (Converter)
  const [converterFiles, setConverterFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");

  // STATI SEZIONE 2 (Divider)
  const [dividerFiles, setDividerFiles] = useState(null);
  const [fileNameTxt, setFileNameTxt] = useState("nessun file selezionato");

  // STATI SEZIONE 3 (Scanner)
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);
  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file selezionato");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file selezionato");

  // =========================
  // 🔵 LOGICA SEZIONE 1: CONVERTER
  // =========================
  const handleConverterSubmit = async () => {
    if (!tempFile) return;
    setLoading(true);
    setStatus({ msg: "ELABORAZIONE EXCEL...", type: 'red' });
    try {
      const res = await runRpoConverter(tempFile);
      setConverterFiles(res);
      setStatus({ msg: "FILE PRONTO PER L'RPO!", type: 'yellow' });
    } catch (e) { 
      alert("Errore nel file Excel"); 
      setStatus({ msg: "ERRORE CONVERSIONE", type: 'red' });
    }
    setLoading(false);
  };

  // =========================
  // 🟢 LOGICA SEZIONE 2: DIVIDER
  // =========================
  const handleDividerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    if (!txt) return;
    setLoading(true);
    setStatus({ msg: 'DIVISIONE LISTE IN CORSO...', type: 'red' });
    try {
      const result = await runRpoDivider(txt);
      if (result && result.success) {
        setDividerFiles(result);
        setStatus({ msg: `DIVISIONE COMPLETATA`, type: 'yellow' });
      }
    } catch (err) {
      setStatus({ msg: 'ERRORE DIVISIONE', type: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 🟣 LOGICA SEZIONE 3: SCANNER (ANNERIMENTO RIGHE)
  // =========================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return alert("Inserisci entrambi i file per lo Scanner!");

    setLoading(true);
    setStatus({ msg: 'ANNERIMENTO RIGHE MATCHATE...', type: 'red' });

    try {
      const txtContent = await scannerTxt.text();
      const rpoList = txtContent.split(/\r?\n/).map(n => n.trim()).filter(n => n !== "");

      const arrayBuffer = await scannerExcel.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let totalMatches = 0;

      workbook.eachSheet((sheet) => {
        sheet.eachRow((row) => {
          let isMatch = false;
          row.eachCell({ includeEmpty: false }, (cell) => {
            const val = String(cell.value || "");
            for (const num of rpoList) {
              if (val.includes(num)) { isMatch = true; break; }
            }
          });

          if (isMatch) {
            totalMatches++;
            row.eachCell({ includeEmpty: true }, (cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
              cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            });
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setScannerResult({ blob, count: totalMatches });
      setStatus({ msg: `SCANNER: ${totalMatches} MATCH TROVATI`, type: 'yellow' });
    } catch (err) {
      console.error(err);
      setStatus({ msg: 'ERRORE SCANNER', type: 'red' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #ee5556 0%, #000000 75%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico?v=2" />
      </Head>

      {/* HEADER */}
      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo" width="315" height="160" className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="status-badge shadow-2xl shadow-black/40 border-white/20 bg-black/60 backdrop-blur-xl mb-4">
          <span className="text-white font-bold">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* STEP 1: CONVERTER */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:border-white/30">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">01</div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-base font-black shadow-lg">1</span>
            <span>RPO Converter</span>
          </h2>
          <p className="text-gray-200 text-xs leading-relaxed mb-8 pr-10">Carica l'Excel duplicato per generare il TXT da inviare al Registro delle Opposizioni.</p>
          <div className="space-y-6">
            <div className="bg-white/[0.05] p-4 rounded-2xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-gray-900 bg-white/90 shadow-md cursor-pointer transition-all hover:bg-white border border-white/40">
                <input type="file" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name || "nessun file");}} className="sr-only" />
                Scegli File
              </label>
              <span className="flex-1 text-white text-xs truncate font-medium">{fileNameExcel}</span>
            </div>
            <button onClick={handleConverterSubmit} disabled={loading || !tempFile} className="w-full py-4 rounded-2xl text-base font-black tracking-widest uppercase text-gray-950 shadow-xl border border-white/50 transition-all hover:bg-white" style={{ background: 'rgba(255, 255, 255, 0.9)' }}>
              {loading ? "ELABORAZIONE..." : "CREA FILE"}
            </button>
            {converterFiles && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <button onClick={() => saveAs(converterFiles.txt, `perinvio${converterFiles.fileName}.txt`)} className="bottone-download text-[10px] border-white/30 text-white bg-white/10 backdrop-blur-sm">⬇️ TXT</button>
                <button onClick={() => saveAs(converterFiles.zip, `perinvio${converterFiles.fileName}.zip`)} className="bottone-download text-[10px] font-bold bg-white text-black">📦 ZIP</button>
              </div>
            )}
          </div>
        </section>

        {/* STEP 2: DIVIDER */}
        <section className="box-lavoro relative overflow-hidden group h-full border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:border-white/30">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">02</div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-base font-black shadow-lg">2</span>
            <span>RPO Divider</span>
          </h2>
          <p className="text-gray-200 text-xs leading-relaxed mb-8 pr-10">Carica il file TXT di risposta RPO e separa i numeri in due liste (RPO e OK).</p>
          <form onSubmit={handleDividerSubmit} className="space-y-6">
            <div className="bg-white/[0.05] p-4 rounded-2xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-gray-900 bg-white/90 shadow-md cursor-pointer border border-white/40">
                <input type="file" name="txtFile" required onChange={e => setFileNameTxt(e.target.files[0]?.name || "nessun file")} className="sr-only" />
                Scegli File
              </label>
              <span className="flex-1 text-white text-xs truncate font-medium">{fileNameTxt}</span>
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl text-base font-black tracking-widest uppercase text-gray-950 shadow-xl border border-white/50 transition-all hover:bg-white" style={{ background: 'rgba(255, 255, 255, 0.9)' }}>
              {loading ? "DIVISIONE..." : "DIVIDI LISTE"}
            </button>
            {dividerFiles && (
              <div className="pt-6 border-t border-white/20 mt-4 grid grid-cols-2 gap-4 animate-in fade-in">
                <button type="button" onClick={() => saveAs(dividerFiles.txtUno, `rpo_1_${dividerFiles.fileName}.txt`)} className="bottone-download text-[10px] py-3 border-white/30 text-white bg-white/10">📄 RPO (1)</button>
                <button type="button" onClick={() => saveAs(dividerFiles.txtZero, `rpo_0_${dividerFiles.fileName}.txt`)} className="bottone-download text-[10px] py-3 font-bold bg-white text-black">📄 OK (0)</button>
              </div>
            )}
          </form>
        </section>

        {/* STEP 3: SCANNER - ORA ATTIVO E ACCESO */}
        <section className="box-lavoro relative overflow-hidden h-full border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:border-white/30">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">03</div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-base font-black shadow-lg">3</span>
            <span>RPO Scanner</span>
          </h2>
          <p className="text-gray-200 text-xs leading-relaxed mb-8 pr-10">Confronta il TXT con l'Excel originale e annerisce le righe dei numeri già presenti in RPO.</p>
          <form onSubmit={handleScannerSubmit} className="space-y-4">
            <div className="bg-white/[0.05] p-3 rounded-xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-4 py-2 rounded-lg text-[10px] font-black uppercase text-gray-900 bg-white/90 cursor-pointer">
                TXT RPO
                <input type="file" accept=".txt" className="sr-only" onChange={e => {setScannerTxt(e.target.files[0]); setNameScannerTxt(e.target.files[0]?.name || "");}} />
              </label>
              <span className="flex-1 text-white text-[10px] truncate">{nameScannerTxt}</span>
            </div>
            <div className="bg-white/[0.05] p-3 rounded-xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-4 py-2 rounded-lg text-[10px] font-black uppercase text-gray-900 bg-white/90 cursor-pointer">
                EXCEL BASE
                <input type="file" accept=".xlsx" className="sr-only" onChange={e => {setScannerExcel(e.target.files[0]); setNameScannerExcel(e.target.files[0]?.name || "");}} />
              </label>
              <span className="flex-1 text-white text-[10px] truncate">{nameScannerExcel}</span>
            </div>
            <button type="submit" disabled={loading || !scannerTxt || !scannerExcel} className="w-full py-4 rounded-2xl text-sm font-black tracking-widest uppercase text-gray-950 shadow-xl border border-white/50 transition-all hover:bg-white" style={{ background: 'rgba(255, 255, 255, 0.9)' }}>
              {loading ? "ELABORAZIONE..." : "AVVIA SCANNER"}
            </button>
          </form>
          {scannerResult && (
            <div className="mt-6 animate-in fade-in">
              <button onClick={() => saveAs(scannerResult.blob, `BONIFICATO_${nameScannerExcel}`)} className="bottone-download w-full font-bold bg-white text-black">
                ⬇️ SCARICA ({scannerResult.count} MATCH)
              </button>
            </div>
          )}
        </section>

      </main>

      <footer className="mt-24 text-center opacity-40">
        <p className="text-[9px] text-white uppercase tracking-[0.5em] font-medium">BUILDED BY REALINDI®DEN © 2026</p>
      </footer>
    </div>
  );
}
