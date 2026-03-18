import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE ©', type: 'info' });

  // FILE INPUT
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);

  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file TXT");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file Excel");

  // ==========================================
  // 🟣 SCANNER LOGIC (VERSIONE DEFINITIVA)
  // ==========================================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();

    if (!scannerTxt || !scannerExcel) {
      alert("Carica entrambi i file!");
      return;
    }

    setLoading(true);
    setStatus({ msg: 'SCANSIONE IN CORSO...', type: 'red' });

    try {
      // =========================
      // 📄 LETTURA TXT
      // =========================
      const txtContent = await scannerTxt.text();

      const rpoNumbers = txtContent
        .split(/\r?\n/)
        .map(n => n.trim().replace(/\D/g, ''))
        .filter(n => n.length >= 6);

      if (rpoNumbers.length === 0) {
        throw new Error("TXT vuoto o numeri non validi");
      }

      // =========================
      // 📊 LETTURA EXCEL
      // =========================
      const arrayBuffer = await scannerExcel.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let totalMatches = 0;

      // =========================
      // 🔍 SCANSIONE
      // =========================
      workbook.eachSheet((sheet) => {
        sheet.eachRow((row) => {

          let rigaDaAnnerire = false;

          row.eachCell({ includeEmpty: false }, (cell) => {
            const valoreCellaPulito = String(cell.value || "").replace(/\D/g, '');

            if (valoreCellaPulito.length >= 6) {

              const match = rpoNumbers.some(num => {
                const shortNum = num.length > 8 ? num.slice(-8) : num;
                return valoreCellaPulito.includes(shortNum);
              });

              if (match) {
                rigaDaAnnerire = true;
              }
            }
          });

          // =========================
          // 🎨 ANNERISCI RIGA
          // =========================
          if (rigaDaAnnerire) {
            totalMatches++;

            row.eachCell({ includeEmpty: true }, (cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF000000' }
              };

              cell.font = {
                color: { argb: 'FFFFFFFF' }
              };
            });
          }

        });
      });

      // =========================
      // 💾 OUTPUT FILE
      // =========================
      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob(
        [buffer],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      setScannerResult({
        blob,
        count: totalMatches
      });

      setStatus({
        msg: `BONIFICA COMPLETATA: ${totalMatches} RIGHE`,
        type: 'yellow'
      });

    } catch (err) {
      console.error(err);

      setStatus({
        msg: 'ERRORE DURANTE LA SCANSIONE',
        type: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white"
         style={{ background: 'linear-gradient(180deg, #ee5556 0%, #000000 75%)' }}>

      <Head>
        <title>FENIX GROUP | SCANNER</title>
      </Head>

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-black mb-4">RPO SCANNER</h1>
        <div className="bg-black/60 border border-white/20 p-3 rounded-xl">
          {status.msg}
        </div>
      </header>

      <main className="w-full max-w-md bg-black/40 p-6 rounded-2xl border border-white/20">

        <form onSubmit={handleScannerSubmit} className="space-y-4">

          {/* TXT */}
          <label className="block bg-white/10 p-3 rounded-xl cursor-pointer text-center">
            <input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                setScannerTxt(e.target.files[0]);
                setNameScannerTxt(e.target.files[0]?.name || "");
              }}
            />
            <span className="text-xs">{nameScannerTxt}</span>
          </label>

          {/* EXCEL */}
          <label className="block bg-white/10 p-3 rounded-xl cursor-pointer text-center">
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                setScannerExcel(e.target.files[0]);
                setNameScannerExcel(e.target.files[0]?.name || "");
              }}
            />
            <span className="text-xs">{nameScannerExcel}</span>
          </label>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black font-bold rounded-xl"
          >
            {loading ? "SCANSIONE..." : "AVVIA SCANNER"}
          </button>

        </form>

        {/* DOWNLOAD */}
        {scannerResult && (
          <button
            onClick={() => saveAs(scannerResult.blob, `BONIFICATO_${nameScannerExcel}`)}
            className="mt-4 w-full py-3 bg-green-500 text-white font-bold rounded-xl"
          >
            SCARICA ({scannerResult.count})
          </button>
        )}

      </main>

    </div>
  );
}