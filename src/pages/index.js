import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs'; 
import { runRpoConverter } from '../logic/converter';
import { runRpoDivider } from '../logic/divider'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE ©', type: 'info' });
  
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");
  const [converterFiles, setConverterFiles] = useState(null);

  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);

  // =========================
  // 🟣 SCANNER BLINDATO
  // =========================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: 'BONIFICA INTEGRALE IN CORSO...', type: 'red' });

    try {
      const txtContent = await scannerTxt.text();
      const rpoSet = new Set(
        txtContent.split(/\r?\n/).map(n => n.trim().replace(/\D/g, '')).filter(n => n.length >= 7)
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await scannerExcel.arrayBuffer());
      let totalMatches = 0;

      workbook.eachSheet((sheet) => {
        sheet.eachRow({ includeEmpty: true }, (row) => {
          let hasMatch = false;
          row.eachCell({ includeEmpty: false }, (cell) => {
            const val = String(cell.value || "").replace(/\D/g, '');
            if (val.length >= 7 && rpoSet.has(val)) hasMatch = true;
          });

          if (hasMatch) {
            totalMatches++;
            // Coloriamo a tappeto fino alla colonna 25 per evitare l'effetto "macchia"
            for (let i = 1; i <= 25; i++) {
              const cell = row.getCell(i);
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
              cell.font = { color: { argb: 'FF000000' } };
              cell.value = cell.value; // Mantiene il dato ma invisibile
            }
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      setScannerResult({ blob: new Blob([buffer]), count: totalMatches });
      setStatus({ msg: `BONIFICA COMPLETATA: ${totalMatches} RIGHE`, type: 'yellow' });
    } catch (err) { setStatus({ msg: 'ERRORE SCANNER', type: 'red' }); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white bg-gradient-to-b from-[#ee5556] to-black">
      <Head><title>FENIX GROUP | RPO TOOL</title></Head>

      <header className="mb-12 flex flex-col items-center">
        <img src="/logo.png" className="h-[156px] mb-6" alt="Logo" />
        <div className="bg-black/60 p-4 rounded-2xl border border-white/20">
          <span className="font-bold uppercase tracking-widest">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SEZIONE 1: CONVERTER */}
        <section className="bg-black/40 p-8 rounded-3xl border border-white/10 relative">
          <h2 className="text-2xl font-bold mb-4">1. RPO Converter</h2>
          <label className="block bg-white/5 p-4 rounded-xl border border-white/10 cursor-pointer text-center mb-4">
            <input type="file" className="hidden" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name);}} />
            <span className="text-[10px] uppercase font-bold">{fileNameExcel}</span>
          </label>
          <button onClick={async () => {
            setLoading(true);
            const res = await runRpoConverter(tempFile);
            setConverterFiles(res);
            setLoading(false);
          }} disabled={!tempFile} className="w-full py-4 bg-white text-black font-black rounded-2xl mb-4">CREA FILE</button>
          
          {converterFiles && (
            <button onClick={() => saveAs(converterFiles.txt, `perinvio_${converterFiles.fileName}.txt`)} 
                    className="w-full py-3 bg-white/10 border border-white/20 rounded-xl font-bold">⬇️ SCARICA TXT</button>
          )}
        </section>

        {/* SEZIONE 2: DIVIDER (Semplificata) */}
        <section className="bg-black/40 p-8 rounded-3xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">2. RPO Divider</h2>
            {/* ... logica divider simile a sopra ... */}
        </section>

        {/* SEZIONE 3: SCANNER */}
        <section className="bg-black/40 p-8 rounded-3xl border border-white/30">
          <h2 className="text-2xl font-bold mb-4 text-white">3. RPO Scanner</h2>
          <form onSubmit={handleScannerSubmit} className="space-y-4">
            <input type="file" onChange={e => setScannerTxt(e.target.files[0])} className="w-full text-xs" />
            <input type="file" onChange={e => setScannerExcel(e.target.files[0])} className="w-full text-xs" />
            <button type="submit" className="w-full py-4 bg-white text-black font-black rounded-2xl">AVVIA BONIFICA</button>
          </form>
          {scannerResult && (
            <button onClick={() => saveAs(scannerResult.blob, "BONIFICATO.xlsx")} className="w-full mt-4 py-3 bg-green-500 rounded-xl font-bold">SCARICA EXCEL ({scannerResult.count})</button>
          )}
        </section>
      </main>
    </div>
  );
}
