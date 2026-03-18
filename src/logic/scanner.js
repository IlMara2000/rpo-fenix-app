import React, { useState } from 'react';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import { runRpoConverter, runRpoScanner } from '../logic/excel';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    msg: 'OFFICIAL FENIX RPO TOOL SUITE',
    type: 'info'
  });

  const [converterFiles, setConverterFiles] = useState(null);
  const [scannerFiles, setScannerFiles] = useState(null);
  const [tempFile, setTempFile] = useState(null);

  // =========================
  // 🔵 CONVERTER
  // =========================
  const handleConverter = async () => {
    if (!tempFile) return;

    setLoading(true);
    setStatus({ msg: "ELABORAZIONE FILE EXCEL...", type: 'blue' });

    try {
      const res = await runRpoConverter(tempFile);

      setConverterFiles(res);
      setStatus({ msg: "FILE PRONTO PER L'RPO!", type: 'yellow' });

    } catch (err) {
      console.error(err);
      alert("Errore nel file Excel");
      setStatus({ msg: "ERRORE CONVERSIONE", type: 'red' });
    }

    setLoading(false);
  };

  // =========================
  // 🟢 SCANNER
  // =========================
  const handleScannerSubmit = async (e) => {
    e.preventDefault();

    const txt = e.target.txtFile.files[0];
    const excel = e.target.excelFile.files[0];

    if (!txt || !excel) {
      return alert("Seleziona entrambi i file!");
    }

    setLoading(true);
    setStatus({ msg: 'ANALISI INCROCIATA DEI DATI...', type: 'blue' });

    try {
      const result = await runRpoScanner(txt, excel);

      if (result && result.success) {
        setScannerFiles(result);

        setStatus({
          msg: `COMPLETATO: ${result.foundCount} MATCH TROVATI`,
          type: 'yellow'
        });
      }

    } catch (err) {
      console.error(err);
      alert("Errore durante la scansione");
      setStatus({ msg: 'ERRORE SCANNER', type: 'red' });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-6">
      <Head>
        <title>GR FENIX | RPO TOOL</title>
      </Head>

      <div className="max-w-xl w-full space-y-12">

        {/* HEADER */}
        <header className="text-center">
          <div className="mb-6">
            <div className="status-badge">
              {status.msg}
            </div>
          </div>

          <div className="flex justify-center mb-2">
            <img
              src="/logo.png"
              alt="logo"
              className="h-24"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </header>

        {/* ========================= */}
        {/* 🔵 CONVERTER */}
        {/* ========================= */}
        <section className="box-lavoro relative group">

          <div className="absolute -top-6 -right-4 text-9xl text-white/[0.02] font-black">
            01
          </div>

          <h2 className="text-2xl font-bold mb-4">RPO Converter</h2>

          <input
            type="file"
            onChange={e => setTempFile(e.target.files[0])}
            className="mb-4"
          />

          <button
            onClick={handleConverter}
            disabled={loading || !tempFile}
            className="bottone-blu"
          >
            {loading ? "Elaborazione..." : "Crea File"}
          </button>

          {converterFiles && (
            <div className="mt-6 space-y-2">
              <button
                onClick={() =>
                  saveAs(converterFiles.txt, `${converterFiles.fileName}.txt`)
                }
                className="bottone-download"
              >
                Scarica TXT
              </button>

              <button
                onClick={() =>
                  saveAs(converterFiles.zip, `${converterFiles.fileName}.zip`)
                }
                className="bottone-download"
              >
                Scarica ZIP
              </button>
            </div>
          )}
        </section>

        {/* ========================= */}
        {/* 🟢 SCANNER */}
        {/* ========================= */}
        <section className="box-lavoro relative group">

          <div className="absolute -top-6 -right-4 text-9xl text-white/[0.02] font-black">
            02
          </div>

          <h2 className="text-2xl font-bold mb-4">RPO Scanner</h2>

          <form onSubmit={handleScannerSubmit} className="space-y-4">

            <input type="file" name="txtFile" required />
            <input type="file" name="excelFile" required />

            <button
              type="submit"
              disabled={loading}
              className="bottone-blu"
            >
              {loading ? "Scansione..." : "Avvia Controllo"}
            </button>

          </form>

          {scannerFiles && (
            <div className="mt-6 space-y-2">

              <button
                onClick={() =>
                  saveAs(
                    scannerFiles.excelBonificato,
                    `LISTA_CONTROLLATA_${scannerFiles.fileName}.xlsx`
                  )
                }
                className="bottone-download"
                style={{ background: '#22c55e', color: 'white' }}
              >
                Scarica Excel
              </button>

              <p className="text-sm">
                Match trovati: {scannerFiles.foundCount}
              </p>

            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="text-center opacity-50 mt-10">
          <p className="text-xs">
            GR FENIX RPO Tool Suite © 2026
          </p>
        </footer>

      </div>
    </div>
  );
}