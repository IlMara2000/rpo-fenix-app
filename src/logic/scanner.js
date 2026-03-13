import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const runRpoScanner = async (txtFile, excelFile) => {
  try {
    const txtText = await txtFile.text();
    const lines = txtText.split(/\r?\n/);
    const targetNumbers = new Set();
    const outputTxtLines = [];

    // 1. Lettura TXT: Filtra solo quelli con ",1"
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const parts = trimmedLine.split(',');
      if (parts.length >= 2) {
        const number = parts[0].trim();
        const status = parts[1].trim();
        if (status.startsWith('1')) {
          targetNumbers.add(number);
          outputTxtLines.push(trimmedLine);
        }
      }
    }

    if (targetNumbers.size === 0) {
      throw new Error("Nessun numero bloccato (',1') trovato nel file TXT.");
    }

    const targetNumbersArray = Array.from(targetNumbers);
    const arrayBuffer = await excelFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    let matchCount = 0;

    workbook.worksheets.forEach((sheet) => {
      if (!sheet) return;

      sheet.eachRow({ includeEmpty: true }, (row) => {
        let isMatch = false;

        row.eachCell({ includeEmpty: true }, (cell) => {
          if (isMatch) return;
          try {
            let cellValue = "";
            if (cell && cell.value !== null && cell.value !== undefined) {
              if (typeof cell.value === 'object') {
                cellValue = cell.text ? cell.text.toString() : 
                            (cell.value.result ? cell.value.result.toString() : "");
              } else {
                cellValue = cell.value.toString();
              }
            }

            if (cellValue.length >= 6) {
              for (const num of targetNumbersArray) {
                if (cellValue.includes(num)) {
                  isMatch = true;
                  matchCount++;
                  break;
                }
              }
            }
          } catch (e) { console.warn("Errore cella:", cell?.address); }
        });

        if (isMatch) {
          row.eachCell({ includeEmpty: true }, (cell) => {
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
              top: {style:'thin', color: {argb:'FF333333'}},
              left: {style:'thin', color: {argb:'FF333333'}},
              bottom: {style:'thin', color: {argb:'FF333333'}},
              right: {style:'thin', color: {argb:'FF333333'}}
            };
          });
        }
      });
    });

    const bufferExcel = await workbook.xlsx.writeBuffer();
    const nomeSenzaExt = excelFile.name.replace(/\.[^/.]+$/, "");
    const blobExcel = new Blob([bufferExcel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // --- DOWNLOAD IMMEDIATO APPENA PRONTO ---
    console.log("Salvataggio file in corso...");
    saveAs(blobExcel, `LISTA_MODIFICATA_${nomeSenzaExt}.xlsx`);
    
    return {
      success: true,
      excelBonificato: blobExcel,
      numbersTxt: new Blob([outputTxtLines.join('\r\n')], { type: 'text/plain;charset=utf-8' }),
      foundCount: matchCount,
      fileName: nomeSenzaExt
    };

  } catch (error) {
    console.error("Errore Scanner:", error);
    alert("Errore durante la scansione: " + error.message);
    throw error;
  }
};