import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const runRpoScanner = async (txtFile, excelFile) => {
  try {
    const txtText = await txtFile.text();
    const lines = txtText.split(/\r?\n/);
    const targetNumbers = new Set();
    const outputTxtLines = [];

    // 1. Lettura TXT
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const parts = trimmedLine.split(',');
      if (parts.length >= 2) {
        const number = parts[0].replace(/\D/g, '').trim();
        const status = parts[1].trim();
        if (status.startsWith('1') && number.length >= 9) {
          targetNumbers.add(number);
          outputTxtLines.push(trimmedLine);
        }
      }
    }

    if (targetNumbers.size === 0) throw new Error("Nessun numero bloccato trovato.");

    const targetNumbersArray = Array.from(targetNumbers);
    const arrayBuffer = await excelFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    let matchCount = 0;

    workbook.worksheets.forEach((sheet) => {
      if (!sheet) return;

      // Prendiamo il numero reale di colonne usate, o almeno 25 per sicurezza
      const maxColumn = Math.max(sheet.actualColumnCount, 25);

      sheet.eachRow({ includeEmpty: true }, (row) => {
        let isMatch = false;

        // RICERCA
        row.eachCell({ includeEmpty: true }, (cell) => {
          if (isMatch) return;
          const cellText = cell.text ? String(cell.text) : (cell.value ? String(cell.value) : "");
          
          if (cellText.length >= 9) {
            const cleanCellValue = cellText.replace(/\D/g, '');
            for (const num of targetNumbersArray) {
              if (cleanCellValue.includes(num)) {
                isMatch = true;
                matchCount++;
                break;
              }
            }
          }
        });

        // COLORAZIONE TOTALE
        if (isMatch) {
          // Ciclo forzato su TUTTE le colonne possibili
          for (let i = 1; i <= maxColumn; i++) {
            const cell = row.getCell(i); // getCell la crea se non esiste!

            // Applichiamo lo stile direttamente all'oggetto cella
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF000000' }
            };
            cell.font = {
              color: { argb: 'FFFFFFFF' },
              bold: true
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
          }
        }
      });
    });

    const bufferExcel = await workbook.xlsx.writeBuffer();
    const nomeSenzaExt = excelFile.name.replace(/\.[^/.]+$/, "");
    const blobExcel = new Blob([bufferExcel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveAs(blobExcel, `LISTA_BONIFICATA_${nomeSenzaExt}.xlsx`);
    
    return {
      success: true,
      excelBonificato: blobExcel,
      numbersTxt: new Blob([outputTxtLines.join('\r\n')], { type: 'text/plain;charset=utf-8' }),
      foundCount: matchCount,
      fileName: nomeSenzaExt
    };

  } catch (error) {
    console.error("Errore Scanner:", error);
    alert(error.message);
    throw error;
  }
};