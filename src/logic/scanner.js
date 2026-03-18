const handleScannerSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setStatus({ msg: 'BONIFICA MANUALE COLONNA C...', type: 'red' });

  try {
    const txtContent = await scannerTxt.text();
    // Creiamo la lista nera: solo numeri puliti di almeno 7 cifre
    const rpoList = txtContent.split(/\r?\n/)
      .map(n => n.trim().replace(/\D/g, ''))
      .filter(n => n.length >= 7);

    const arrayBuffer = await scannerExcel.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    let totalMatches = 0;

    workbook.eachSheet((sheet) => {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Salta l'intestazione

        // PUNTA DIRETTO ALLA COLONNA C (il telefono nella tua foto)
        const cellTelefono = row.getCell(3); 
        const valoreTelefono = String(cellTelefono.value || "").replace(/\D/g, '');

        // Match esatto: il numero deve essere presente nella lista RPO
        if (valoreTelefono && rpoList.includes(valoreTelefono)) {
          totalMatches++;
          
          // ANNERISCI TUTTA LA RIGA DA A a K (o oltre)
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF000000' }
            };
            cell.font = { color: { argb: 'FF000000' } }; // Anche il testo diventa nero!
            cell.value = ""; // CANCELLA IL DATO per sicurezza totale
          });
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `PULITO_${scannerExcel.name}`);
    setStatus({ msg: `DONE: ${totalMatches} RIGHE ELIMINATE`, type: 'yellow' });
  } catch (err) {
    console.error("ERRORE CRITICO:", err);
    setStatus({ msg: 'ERRORE LOGICA', type: 'red' });
  }
  setLoading(false);
};
