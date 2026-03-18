import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE ©', type: 'info' });

  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);
  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file TXT");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file Excel");

  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return alert("Carica entrambi i file!");

    setLoading(true);
    setStatus({ msg: 'SCANSIONE CHIRURGICA...', type: 'red' });

    try {
      const txtContent = await scannerTxt.text();
      
      // Creiamo un Set per una ricerca istantanea ed ESATTA
      // Puliamo i numeri del TXT (solo cifre)
      const rpoSet = new Set(
        txtContent.split(/\r?\n/)
          .map(n => n.trim().replace(/\D/g, ''))
          .filter(n => n.length >= 8) // Consideriamo solo numeri di telefono reali
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await scannerExcel.arrayBuffer());
      let totalMatches = 0;

      workbook.eachSheet((sheet) => {
        sheet.eachRow({ includeEmpty: true }, (row) => {
          let rigaDaAnnerire = false;

          // Controlliamo le celle della riga
          row.eachCell({ includeEmpty: false }, (cell) => {
            // Puliamo il valore della cella (togliamo spazi, +39, ecc.)
            let valoreCella = String(cell.value || "").replace(/\D/g, '');
            
            // Se il numero nell'Excel ha il prefisso 39, lo togliamo per il confronto
            if (valoreCella.startsWith('39') && valoreCella.length > 10) {
                valoreCella = valoreCella.substring(2);
            }

            // MATCH ESATTO: Il numero deve essere nel Set del TXT
            if (valoreCella.length >= 8 && rpoSet.has(valoreCella)) {
              rigaDaAnnerire = true;
            }
          });

          if (rigaDaAnnerire) {
            totalMatches++;
            // Anneriamo TUTTE le celle fino alla colonna 20 per sicurezza
            for (let i = 1; i <= 20; i++) {
              const cell = row.getCell(i);
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF000000' }
              };
              cell.font = { color: { argb: 'FF000000' } }; // Testo nero su fondo nero = invisibile
              cell.value = cell.value; // Mantiene il dato ma è coperto
            }
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      setScannerResult({ blob: new Blob([buffer]), count: totalMatches });
      setStatus({ msg: `BONIFICA COMPLETATA: ${totalMatches} RIGHE`, type: 'yellow' });

    } catch (err) {
      console.error(err);
      setStatus({ msg: 'ERRORE DURANTE LA SCANSIONE', type: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white"
         style={{ background: 'linear-gradient(180deg, #ee5556 0%, #000000 75%)' }}>
      <Head><title>FENIX GROUP | SCANNER</title></Head>

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-black mb-4 tracking-tighter">RPO SCANNER</h1>
        <div className="bg-black/60 border border-white/20 p-3 rounded-xl backdrop-blur-md uppercase text-[10px] font-bold tracking-widest">
          {status.msg}
        </div>
      </header>

      <main className="w-full max-w-md bg-black/40 p-8 rounded-3xl border border-white/10 backdrop-blur-lg shadow-2xl">
        <form onSubmit={handleScannerSubmit} className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold opacity-50 uppercase ml-2">Lista Nera (TXT)</span>
            <label className="block bg-white/5 p-4 rounded-2xl border border-white/10 cursor-pointer text-center hover:bg-white/10 transition-all">
              <input type="file" accept=".txt" className="hidden" onChange={(e) => { setScannerTxt(e.target.files[0]); setNameScannerTxt(e.target.files[0]?.name || ""); }} />
              <span className="text-xs font-medium truncate block">{nameScannerTxt}</span>
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold opacity-50 uppercase ml-2">Database (Excel)</span>
            <label className="block bg-white/5 p-4 rounded-2xl border border-white/10 cursor-pointer text-center hover:bg-white/10 transition-all">
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => { setScannerExcel(e.target.files[0]); setNameScannerExcel(e.target.files[0]?.name || ""); }} />
              <span className="text-xs font-medium truncate block">{nameScannerExcel}</span>
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl hover:scale-[0.98] transition-all disabled:opacity-50">
            {loading ? "ELABORAZIONE..." : "AVVIA BONIFICA"}
          </button>
        </form>

        {scannerResult && (
          <button onClick={() => saveAs(scannerResult.blob, `BONIFICATO_${nameScannerExcel}`)} className="mt-6 w-full py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg border-2 border-green-400 animate-pulse">
            SCARICA ({scannerResult.count} MATCH)
          </button>
        )}
      </main>
    </div>
  );
}
