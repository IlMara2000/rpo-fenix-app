import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs'; // Fondamentale per colorare le celle di nero

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    msg: 'OFFICIAL FENIX RPO TOOL SUITE',
    type: 'info'
  });

  // Stati Sezione 1 e 2 (Mantieni i tuoi)
  const [tempFile, setTempFile] = useState(null);
  const [dividerTxt, setDividerTxt] = useState(null);

  // Stati Sezione 3: RPO Scanner
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);

  // =========================
  // 🔵 1. CONVERTER (Tua logica esistente)
  // =========================
  const handleConverter = async () => { /* La tua logica */ };

  // =========================
  // 🟠 2. DIVIDER (Tua logica esistente)
  // =========================
  const handleDivider = async () => { /* La tua logica */ };

  // =========================
  // 🟢 3. RPO SCANNER (LA NUOVA MAGIA)
  // =========================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();

    if (!scannerTxt || !scannerExcel) {
      return alert("Attenzione: Inserisci sia il file TXT che l'Excel.");
    }

    setLoading(true);
    setStatus({ msg: 'ANALISI E COLORAZIONE IN CORSO...', type: 'blue' });

    try {
      // 1. Estrai i numeri dal file TXT
      const txtText = await scannerTxt.text();
      // Divide per riga e pulisce gli spazi vuoti
      const rpoNumbers = txtText
        .split(/\r?\n/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

      // 2. Carica il file Excel con ExcelJS
      const arrayBuffer = await scannerExcel.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let matchCount = 0;

      // 3. Scansiona ogni foglio, riga e cella
      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          let rowHasMatch = false;

          // Controlla ogni cella della riga
          row.eachCell((cell) => {
            if (rowHasMatch) return; // Se la riga ha già matchato, salta il resto

            // Estrae il testo della cella in modo sicuro (gestisce anche formule e rich text)
            let cellText = '';
            if (cell.value && typeof cell.value === 'object') {
              cellText = cell.value.richText 
                ? cell.value.richText.map(rt => rt.text).join('') 
                : String(cell.value.result || cell.value);
            } else {
              cellText = String(cell.value || '');
            }

            // Cerca se uno qualsiasi dei numeri RPO è contenuto dentro questa cella
            for (const num of rpoNumbers) {
              if (cellText.includes(num)) {
                rowHasMatch = true;
                break;
              }
            }
          });

          // 4. Se c'è un match, colora tutta la riga di NERO
          if (rowHasMatch) {
            matchCount++;
            
            // Applica lo stile a tutte le celle della riga
            row.eachCell({ includeEmpty: true }, (c) => {
              c.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF000000' } // Sfondo Nero
              };
              // Imposta il testo bianco altrimenti non si legge nulla sul nero!
              c.font = { color: { argb: 'FFFFFFFF' } }; 
            });
          }
        });
      });

      // 5. Genera il nuovo file Excel modificato
      const outputBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outputBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      setScannerResult({ blob, count: matchCount, originalName: scannerExcel.name });
      setStatus({ msg: `SCANSIONE COMPLETATA: ${matchCount} TROVATI`, type: 'yellow' });

    } catch (err) {
      console.error(err);
      alert("Errore durante la scansione dei file.");
      setStatus({ msg: 'ERRORE DURANTE LA SCANSIONE', type: 'red' });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-6">
      <Head>
        <title>GR FENIX | RPO TOOL</title>
      </Head>

      <div className="max-w-xl w-full space-y-8">
        {/* HEADER */}
        <header className="text-center mb-10">
          <div className="status-badge mb-6">{status.msg}</div>
          {/* Il tuo logo qui */}
        </header>

        {/* ========================= */}
        {/* 1. RPO CONVERTER (Placeholder UI) */}
        {/* ========================= */}
        <section className="bg-[#2A1616] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
           {/* ... il tuo codice per la sezione 1 ... */}
           <h2 className="text-xl font-bold mb-2">1 RPO Converter</h2>
        </section>

        {/* ========================= */}
        {/* 2. RPO DIVIDER (Placeholder UI) */}
        {/* ========================= */}
        <section className="bg-[#2A1616] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
           {/* ... il tuo codice per la sezione 2 ... */}
           <h2 className="text-xl font-bold mb-2">2 RPO Divider</h2>
        </section>

        {/* ========================= */}
        {/* 🟢 3. RPO SCANNER (ACCESO E FUNZIONANTE) */}
        {/* ========================= */}
        <section className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/10 px-3 py-1 rounded-lg text-sm font-bold text-white/80">3</div>
            <h2 className="text-xl font-bold text-white/90">RPO Scanner</h2>
          </div>
          
          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            Incrocia il TXT dell'RPO con il tuo Excel. Le righe contenenti i numeri trovati verranno evidenziate di nero per essere scartate.
          </p>

          <form onSubmit={handleScannerSubmit} className="space-y-4">
            
            {/* Input TXT */}
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
              <label className="bg-white text-black font-bold text-xs py-3 px-6 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                TXT RPO
                <input 
                  type="file" 
                  accept=".txt" 
                  className="hidden" 
                  onChange={e => setScannerTxt(e.target.files[0])} 
                />
              </label>
              <span className="text-xs text-white/50 truncate">
                {scannerTxt ? scannerTxt.name : "Nessun TXT selezionato"}
              </span>
            </div>

            {/* Input EXCEL */}
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
              <label className="bg-white text-black font-bold text-xs py-3 px-6 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                EXCEL BASE
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  onChange={e => setScannerExcel(e.target.files[0])} 
                />
              </label>
              <span className="text-xs text-white/50 truncate">
                {scannerExcel ? scannerExcel.name : "Nessun Excel selezionato"}
              </span>
            </div>

            {/* Bottone Azione */}
            <button
              type="submit"
              disabled={loading || !scannerTxt || !scannerExcel}
              className="w-full bg-white text-black font-extrabold text-sm py-4 rounded-xl mt-2 disabled:opacity-50 hover:bg-gray-200 transition"
            >
              {loading ? "SCANSIONE IN CORSO..." : "AVVIA SCANNER"}
            </button>
          </form>

          {/* Area Download Risultato */}
          {scannerResult && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
              <p className="text-green-400 text-sm font-bold mb-3">
                {scannerResult.count} Match Trovati e Anneriti!
              </p>
              <button
                onClick={() => saveAs(scannerResult.blob, `SCARTATI_${scannerResult.originalName}`)}
                className="w-full bg-green-500 text-white font-bold text-sm py-3 rounded-lg shadow-lg shadow-green-500/30"
              >
                SCARICA EXCEL AGGIORNATO
              </button>
            </div>
          )}

        </section>

        {/* FOOTER */}
        <footer className="text-center opacity-40 mt-10">
          <p className="text-xs tracking-widest uppercase">
            Fenix Group RPO Tool Suite © 2026
          </p>
        </footer>

      </div>
    </div>
  );
}
