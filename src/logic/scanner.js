import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs'; 
import { runRpoConverter } from '../logic/converter';
import { runRpoDivider } from '../logic/divider'; 

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: 'FENIX GROUP REAL ESTATE ©', type: 'info' });
  
  // STATI SEZIONI 1 & 2
  const [tempFile, setTempFile] = useState(null);
  const [fileNameExcel, setFileNameExcel] = useState("nessun file selezionato");
  const [fileNameTxt, setFileNameTxt] = useState("nessun file selezionato");
  const [converterFiles, setConverterFiles] = useState(null);
  const [dividerFiles, setDividerFiles] = useState(null);

  // STATI SEZIONE 3 (SCANNER RIGOROSO)
  const [scannerTxt, setScannerTxt] = useState(null);
  const [scannerExcel, setScannerExcel] = useState(null);
  const [scannerResult, setScannerResult] = useState(null);
  const [nameScannerTxt, setNameScannerTxt] = useState("nessun file RPO");
  const [nameScannerExcel, setNameScannerExcel] = useState("nessun file Excel");

  // ==========================================
  // 🟣 LOGICA SCANNER: RIGHE INTERE & MATCH ESATTI
  // ==========================================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();
    if (!scannerTxt || !scannerExcel) return alert("Carica entrambi i file!");

    setLoading(true);
    setStatus({ msg: 'BONIFICA RIGHE IN CORSO...', type: 'red' });

    try {
      const txtContent = await scannerTxt.text();
      
      // Creiamo un Set di numeri "puliti" dal TXT per un confronto esatto e veloce
      const rpoSet = new Set(
        txtContent.split(/\r?\n/)
          .map(n => n.trim().replace(/\D/g, '')) // Teniamo solo le cifre
          .filter(n => n.length >= 6) // Evitiamo falsi positivi su stringhe troppo corte
      );

      const arrayBuffer = await scannerExcel.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let totalMatches = 0;

      workbook.eachSheet((sheet) => {
        sheet.eachRow((row) => {
          let rigaDaAnnerire = false;

          // 1. Cerchiamo il match esatto del numero in QUALSIASI cella della riga
          row.eachCell({ includeEmpty: false }, (cell) => {
            const valoreCellaPulito = String(cell.value || "").replace(/\D/g, '');
            
            // Verifichiamo se il valore della cella è ESATTAMENTE uno dei numeri nel Set RPO
            if (valoreCellaPulito.length >= 6 && rpoSet.has(valoreCellaPulito)) {
              rigaDaAnnerire = true;
            }
          });

          // 2. Se abbiamo trovato un match, anneriamo l'INTERA riga
          if (rigaDaAnnerire) {
            totalMatches++;
            row.eachCell({ includeEmpty: true }, (cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF000000' } // Nero pieno
              };
              cell.font = { color: { argb: 'FFFFFFFF' } }; // Testo bianco sotto il nero per sicurezza
            });
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setScannerResult({ blob, count: totalMatches });
      setStatus({ msg: `BONIFICA ULTIMATA: ${totalMatches} RIGHE OSCURATE`, type: 'yellow' });
    } catch (err) {
      console.error(err);
      setStatus({ msg: 'ERRORE DURANTE LA SCANSIONE', type: 'red' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #ee5556 0%, #000000 75%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | RPO TOOL SUITE</title>
      </Head>

      {/* HEADER CON LOGO XL */}
      <header className="w-full max-w-4xl mb-12 flex flex-col items-center text-center">
        <img src="/logo.png" alt="Logo Fenix" className="h-[156px] w-auto object-contain mb-6 drop-shadow-2xl" />
        <div className="status-badge bg-black/60 border border-white/20 p-4 rounded-2xl backdrop-blur-md">
          <span className="text-white font-bold uppercase tracking-widest">{status.msg}</span>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* SEZIONE 1: CONVERTER (Ripristinata) */}
        <section className="box-lavoro relative bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl overflow-hidden">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">01</div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 relative">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">1</span>
            RPO Converter
          </h2>
          <div className="space-y-4 relative">
            <label className="block bg-white/5 p-4 rounded-xl border border-white/10 cursor-pointer text-center hover:bg-white/10 transition-all">
              <input type="file" className="hidden" onChange={e => {setTempFile(e.target.files[0]); setFileNameExcel(e.target.files[0]?.name);}} />
              <span className="text-[10px] uppercase font-bold opacity-60">{fileNameExcel}</span>
            </label>
            <button onClick={async () => {
              setLoading(true);
              try { const res = await runRpoConverter(tempFile); setConverterFiles(res); setStatus({msg: "CONVERSIONE OK"}); } catch (e) { alert("Errore"); }
              setLoading(false);
            }} disabled={!tempFile} className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl hover:scale-[0.98] transition-transform">CREA FILE</button>
          </div>
        </section>

        {/* SEZIONE 2: DIVIDER (Ripristinata) */}
        <section className="box-lavoro relative bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl overflow-hidden">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">02</div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 relative">
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">2</span>
            RPO Divider
          </h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try { const res = await runRpoDivider(e.target.txtFile.files[0]); setDividerFiles(res); setStatus({msg: "DIVISIONE OK"}); } catch (e) { alert("Errore"); }
            setLoading(false);
          }} className="space-y-4 relative">
            <label className="block bg-white/5 p-4 rounded-xl border border-white/10 cursor-pointer text-center hover:bg-white/10 transition-all">
              <input type="file" name="txtFile" className="hidden" onChange={e => setFileNameTxt(e.target.files[0]?.name)} />
              <span className="text-[10px] uppercase font-bold opacity-60">{fileNameTxt}</span>
            </label>
            <button type="submit" className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl hover:scale-[0.98] transition-transform">DIVIDI LISTE</button>
          </form>
        </section>

        {/* SEZIONE 3: SCANNER - LOGICA CORRETTA */}
        <section className="box-lavoro relative bg-black/40 backdrop-blur-md border border-white/30 p-8 rounded-3xl overflow-hidden">
          <div className="absolute -top-6 -right-4 text-9xl font-black text-white/[0.05] select-none">03</div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 relative">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">3</span>
            RPO Scanner
          </h2>
          <p className="text-gray-400 text-[10px] mb-6 uppercase tracking-widest relative">Oscuramento Righe Match Esatto</p>
          
          <form onSubmit={handleScannerSubmit} className="space-y-4 relative">
            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
              <span className="text-[10px] font-bold uppercase">Risposta RPO:</span>
              <input type="file" accept=".txt" className="hidden" onChange={e => {setNameScannerTxt(e.target.files[0]?.name || ""); setScannerTxt(e.target.files[0]);}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerTxt}</span>
            </label>

            <label className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
              <span className="text-[10px] font-bold uppercase">Excel TMK:</span>
              <input type="file" accept=".xlsx" className="hidden" onChange={e => {setNameScannerExcel(e.target.files[0]?.name || ""); setScannerExcel(e.target.files[0]);}} />
              <span className="text-[10px] truncate max-w-[150px] opacity-40">{nameScannerExcel}</span>
            </label>

            <button type="submit" disabled={loading || !scannerTxt || !scannerExcel} className="w-full py-4 bg-white text-black font-black rounded-2xl hover:scale-95 transition-all shadow-2xl active:bg-gray-200">
              {loading ? "SCANSIONE IN CORSO..." : "AVVIA BONIFICA"}
            </button>
          </form>

          {scannerResult && (
            <div className="mt-4 animate-bounce relative">
              <button onClick={() => saveAs(scannerResult.blob, `BONIFICATO_${nameScannerExcel}`)} className="w-full py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg border-2 border-green-300">
                SCARICA EXCEL PULITO ({scannerResult.count})
              </button>
            </div>
          )}
        </section>

      </main>

      <footer className="mt-24 opacity-30 text-[9px] tracking-[0.5em] uppercase font-bold">
        FENIX GROUP RPO TOOL SUITE © 2026
      </footer>
    </div>
  );
}
