import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const runRpoScanner = async (txtFile, excelFile) => {
  try {
    const txtText = await txtFile.text();
    const lines = txtText.split(/\r?\n/);
    const targetNumbers = new Set();
    const outputTxtLines = [];

    // 1. Lettura TXT: Solo i numeri con ",1"
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const parts = trimmedLine.split(',');
      if (parts.length >= 2) {
        // Puliamo il numero da cercare: solo cifre
        const number = parts[0].replace(/\D/g, '').trim();
        const status = parts[1].trim();
        if (status.startsWith('1') && number.length >= 8) {
          targetNumbers.add(number);
          outputTxtLines.push(trimmedLine);
        }
      }
    }

    if (targetNumbers.size === 0) throw new Error("Nessun numero ',1' trovato.");

    const targetNumbersArray = Array.from(targetNumbers);
    const arrayBuffer = await excelFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    let matchCount = 0;

    workbook.worksheets.forEach((sheet) => {
      if (!sheet) return;

      // Calcoliamo la larghezza massima del foglio per colorare TUTTA la riga
      let maxColumn = sheet.columnCount;
      if (maxColumn < 20) maxColumn = 20; // Sicurezza per fogli piccoli

      sheet.eachRow({ includeEmpty: true }, (row) => {
        let isMatch = false;

        // 2. RICERCA: Cerchiamo il numero pulito dentro la cella
        row.eachCell({ includeEmpty: true }, (cell) => {
          if (isMatch) return;
          
          let cellText = "";
          if (cell && cell.value !== null && cell.value !== undefined) {
            cellText = cell.text ? cell.text.toString() : cell.value.toString();
          }

          if (cellText.length >= 8) {
            // Puliamo il valore della cella per il confronto (solo numeri)
            const cleanCellValue = cellText.replace(/\D/g, '');
            
            for (const num of targetNumbersArray) {
              // Verifichiamo se il numero pulito è contenuto nel valore pulito della cella
              if (cleanCellValue.includes(num)) {
                isMatch = true;
                matchCount++;
                break;
              }
            }
          }
        });

        // 3. COLORAZIONE: Se match, riga NERA totale e testo BIANCO
        if (isMatch) {
          // Usiamo un ciclo for sulla riga per non lasciare "buchi" bianchi
          for (let i = 1; i <= maxColumn; i++) {
            const cell = row.getCell(i);
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF000000' } // Nero
            };
            cell.font = {
              color: { argb: 'FFFFFFFF' }, // Bianco
              bold: true,
              size: 10
            };
            cell.border = {
              top: {style:'thin', color: {argb:'FF000000'}},
              left: {style:'thin', color: {argb:'FF000000'}},
              bottom: {style:'thin', color: {argb:'FF000000'}},
              right: {style:'thin', color: {argb:'FF000000'}}
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