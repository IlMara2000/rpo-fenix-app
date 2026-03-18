import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    msg: 'OFFICIAL FENIX RPO TOOL SUITE',
    type: 'info'
  });

  // Stati Sezione 1 e 2
  const [tempFile, setTempFile] = useState(null);
  const [dividerTxt, setDividerTxt] = useState(null);

  // Stati Sezione 3: RPO Scanner
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);

  // =========================
  // 🟢 LOGICA SEZIONE 3: SCANNER & BLACK FILL
  // =========================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return alert("Carica entrambi i file!");

    setLoading(true);
    setStatus({ msg: 'ANALISI INCROCIATA E ANNERIMENTO...', type: 'blue' });

    try {
      // 1. Leggiamo i numeri dal TXT
      const txtContent = await scannerTxt.text();
      const rpoList = txtContent.split(/\r?\n/).map(n => n.trim()).filter(n => n !== "");

      // 2. Carichiamo l'Excel
      const arrayBuffer = await scannerExcel.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let totalMatches = 0;

      workbook.eachSheet((sheet) => {
        sheet.eachRow((row) => {
          let isMatch = false;

          // Controlliamo ogni cella della riga
          row.eachCell({ includeEmpty: false }, (cell) => {
            const cellValue = String(cell.value || "");
            
            // Verifica se uno dei numeri RPO è contenuto nella cella
            for (const rpoNum of rpoList) {
              if (cellValue.includes(rpoNum)) {
                isMatch = true;
                break;
              }
            }
          });

          // 3. Se troviamo il match, coloriamo TUTTA la riga di NERO
          if (isMatch) {
            totalMatches++;
            row.eachCell({ includeEmpty: true }, (cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF000000' } // Nero Assoluto
              };
              cell.font = {
                color: { argb: 'FFFFFFFF' }, // Testo Bianco per leggibilità
                bold: true
              };
            });
          }
        });
      });

      // 4. Generiamo il file in uscita
      const buffer = await workbook.xlsx.writeBuffer();
      const finalBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setScannerResult({ blob: finalBlob, count: totalMatches });
      setStatus({ msg: `MATCH TROVATI: ${totalMatches}. RIGHE ANNERITE.`, type: 'yellow' });

    } catch (err) {
      console.error(err);
      setStatus({ msg: 'ERRORE DURANTE LA SCANSIONE', type: 'red' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-6 bg-[#0f0f0f] text-white">
      <Head>
        <title>GR FENIX | RPO TOOL</title>
      </Head>

      <div className="max-w-xl w-full space-y-10">
        
        {/* HEADER */}
        <header className="text-center">
          <div className="status-badge mb-6">{status.msg}</div>
          <img src="/logo.png" alt="logo" className="h-16 mx-auto brightness-0 invert" />
        </header>

        {/* SEZIONE 1 & 2 (Contratte per brevità) */}
        <section className="box-lavoro opacity-50">
           <h2 className="text-xl font-bold">1. RPO Converter</h2>
        </section>

        <section className="box-lavoro opacity-50">
           <h2 className="text-xl font-bold">2. RPO Divider</h2>
        </section>

        {/* ========================= */}
        {/* 🟣 SEZIONE 3: RPO SCANNER (ATTIVA) */}
        {/* ========================= */}
        <section className="box-lavoro relative group !opacity-100 border-white/20">
          <div className="absolute -top-6 -right-4 text-9xl text-white/[0.03] font-black">03</div>
          
          <div className="flex items-center gap-3 mb-4">
             <span className="bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg font-bold">3</span>
             <h2 className="text-2xl font-bold">RPO Scanner</h2>
          </div>

          <p className="text-sm text-white/40 mb-6">
            Confronta il TXT con l'Excel originale. Le righe corrispondenti ai numeri RPO verranno completamente annerite.
          </p>

          <form onSubmit={handleScannerSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase opacity-50 font-bold">Carica Risposta TXT</label>
              <input type="file" accept=".txt" onChange={e => setScannerTxt(e.target.files[0])} className="w-full" />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase opacity-50 font-bold">Carica Excel Originale</label>
              <input type="file" accept=".xlsx" onChange={e => setScannerExcel(e.target.files[0])} className="w-full" />
            </div>

            <button
              type="submit"
              disabled={loading || !scannerTxt || !scannerExcel}
              className="bottone-blu w-full py-4 text-lg"
            >
              {loading ? "ANALISI IN CORSO..." : "AVVIA SCANNER"}
            </button>
          </form>

          {scannerResult && (
            <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 animate-pulse">
              <p className="text-center text-sm mb-4">Scansione ultimata: <b>{scannerResult.count}</b> match trovati.</p>
              <button
                onClick={() => saveAs(scannerResult.blob, `EXCEL_ANNERITO_${new Date().getTime()}.xlsx`)}
                className="w-full py-3 bg-green-600 rounded-xl font-bold hover:bg-green-500 transition"
              >
                SCARICA EXCEL BONIFICATO
              </button>
            </div>
          )}
        </section>

        <footer className="text-center opacity-30 pt-10 border-t border-white/5">
          <p className="text-[10px] tracking-[0.2em] uppercase">
            FENIX GROUP RPO TOOL SUITE — LOCKED & PRIVATE BY REALINDI®DEN © 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
