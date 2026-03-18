import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs'; // Ricordati: npm install exceljs
import { runRpoConverter } from '../logic/converter';
import { runRpoDivider } from '../logic/divider'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE ©', type: 'info' });
  
  // Stati Sezioni 1 e 2
  const [converterFiles, setConverterFiles] = useState(null);
  const [dividerFiles, setDividerFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);
  
  // Stati Sezione 3 (Scanner)
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);

  // Etichette file per la UI
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");
  const [fileNameTxt, setFileNameTxt] = useState("nessun file selezionato");
  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file selezionato");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file selezionato");

  // =========================
  // 🟢 LOGICA SCANNER (BLACK FILL)
  // =========================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return alert("Carica entrambi i file per lo Scanner!");

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
      setStatus({ msg: `SCANNER: ${totalMatches} RIGHE ELIMINATE`, type: 'yellow' });
    } catch (err) {
      console.error(err);
      setStatus({ msg: 'ERRORE SCANNER', type: 'red' });
    } finally { setLoading(false); }
  };

  // Handler Divider (Tuo originale)
  const handleDividerSubmit = async (e) => {
    e.preventDefault();
    const txt = e.target.txtFile.files[0];
    if (!txt) return;
    setLoading(true);
    setStatus({ msg: 'DIVISIONE IN CORSO...', type: 'red' });
    try {
      const result = await runRpoDivider(txt);
      if (result?.success) { setDividerFiles(result); setStatus({ msg: `DIVISIONE COMPLETATA`, type: 'yellow' }); }
    } catch (err) { setStatus({ msg: 'ERRORE', type: 'red' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #ee5556 0%, #000000 75%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* HEADER */}
      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[156px] w-auto object-contain drop-shadow-2xl mb-6" />
        <div className="status-badge bg-black/60 backdrop-blur-xl border-white/20">
          <span className="text-white font-bold">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* STEP 1 & 2: Rimangono come i tuoi, ma assicurati che siano h-full */}
        {/* ... (Ometto per brevità, sono identici al tuo codice) ... */}

        {/* STEP 3: SCANNER - ORA ATTIVO E ACCESO */}
        <section className="box-lavoro relative overflow-hidden h-full border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:border-white/30">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">03</div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-base font-black shadow-lg">3</span>
            <span>RPO Scanner</span>
          </h2>
          <p className="text-gray-200 text-xs leading-relaxed mb-8 pr-10">
            Confronta il TXT con l'Excel originale e annerisce le righe dei numeri trovati.
          </p>

          <form onSubmit={handleScannerSubmit} className="space-y-4">
            {/* Input TXT */}
            <div className="bg-white/[0.05] p-3 rounded-xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-4 py-2 rounded-lg text-[10px] font-black uppercase text-gray-900 bg-white/90 cursor-pointer">
                TXT
                <input type="file" accept=".txt" className="sr-only" onChange={e => {
                  setScannerTxt(e.target.files[0]);
                  setNameScannerTxt(e.target.files[0]?.name || "");
                }} />
              </label>
              <span className="flex-1 text-white text-[10px] truncate">{nameScannerTxt}</span>
            </div>

            {/* Input EXCEL */}
            <div className="bg-white/[0.05] p-3 rounded-xl border border-white/[0.1] flex items-center gap-3">
              <label className="px-4 py-2 rounded-lg text-[10px] font-black uppercase text-gray-900 bg-white/90 cursor-pointer">
                EXCEL
                <input type="file" accept=".xlsx" className="sr-only" onChange={e => {
                  setScannerExcel(e.target.files[0]);
                  setNameScannerExcel(e.target.files[0]?.name || "");
                }} />
              </label>
              <span className="flex-1 text-white text-[10px] truncate">{nameScannerExcel}</span>
            </div>

            <button type="submit" disabled={loading || !scannerTxt || !scannerExcel}
                    className="w-full py-4 rounded-2xl text-sm font-black tracking-widest uppercase text-gray-950 shadow-xl transition-all hover:bg-white active:scale-95 border border-white/50"
                    style={{ background: 'rgba(255, 255, 255, 0.9)' }}>
              {loading ? "ELABORAZIONE..." : "AVVIA SCANNER"}
            </button>
          </form>

          {scannerResult && (
            <div className="mt-6 animate-in fade-in">
              <button onClick={() => saveAs(scannerResult.blob, `BONIFICATO_${nameScannerExcel}`)}
                      className="bottone-download w-full font-bold" style={{ background: 'white', color: 'black' }}>
                ⬇️ SCARICA BONIFICATO ({scannerResult.count})
              </button>
            </div>
          )}
        </section>

      </main>

      <footer className="mt-24 text-center opacity-40">
        <p className="text-[9px] text-white uppercase tracking-[0.5em] font-medium">
          FENIX GROUP RPO TOOL SUITE © 2026
        </p>
      </footer>
    </div>
  );
}
