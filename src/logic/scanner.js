import ExcelJS from 'exceljs';

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
        const number = parts[0].trim();
        const status = parts[1].trim();
        if (status.startsWith('1')) {
          targetNumbers.add(number);
          outputTxtLines.push(trimmedLine);
        }
      }
    }

    if (targetNumbers.size === 0) {
      throw new Error("Nessun numero ',1' trovato nel file TXT.");
    }

    const targetNumbersArray = Array.from(targetNumbers);
    const arrayBuffer = await excelFile.arrayBuffer();
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const censoredWorkbook = new ExcelJS.Workbook();
    await censoredWorkbook.xlsx.load(arrayBuffer);

    let matchCount = 0;

    workbook.worksheets.forEach((sheet, sheetIndex) => {
      const censoredSheet = censoredWorkbook.worksheets[sheetIndex];
      if (!sheet || !censoredSheet) return;

      // Crea colonna per i risultati
      sheet.spliceColumns(1, 0, []);
      sheet.getColumn(1).width = 25;
      censoredSheet.spliceColumns(1, 0, []);
      censoredSheet.getColumn(1).width = 25;

      sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        let foundCellAddress = null;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          // Salta la prima colonna (quella nuova) e celle già trovate
          if (colNumber === 1 || foundCellAddress) return;

          try {
            let cellValue = "";

            // --- PROTEZIONE MASSIMA CONTRO IL NULL ---
            if (cell && cell.value !== null && cell.value !== undefined) {
              
              if (typeof cell.value === 'object') {
                // Se è un oggetto (RichText, Formula, Hyperlink)
                // Usiamo .text che è la rappresentazione visiva più sicura
                cellValue = cell.text ? cell.text.toString() : 
                            (cell.value.result ? cell.value.result.toString() : "");
              } else {
                // Se è un valore semplice (stringa, numero)
                cellValue = cell.value.toString();
              }
            }

            const cleanVal = cellValue.trim();
            if (cleanVal.length >= 6) {
              for (const num of targetNumbersArray) {
                if (cleanVal.includes(num)) {
                  foundCellAddress = cell.address;
                  matchCount++;
                  break;
                }
              }
            }
          } catch (e) {
            // Se una cella è proprio illeggibile, la ignoriamo invece di crashare
            console.warn("Cella saltata:", cell?.address);
          }
        });

        if (foundCellAddress) {
          // File Elaborato (Evidenziazione)
          const infoCell = row.getCell(1);
          infoCell.value = `MATCH: ${foundCellAddress}`;
          infoCell.font = { color: { argb: 'FF000000' }, bold: true };
          
          row.eachCell({ includeEmpty: false }, (cell, col) => {
            if (col === 1) return;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          });

          // File Censurato (Copertura totale)
          const censoredRow = censoredSheet.getRow(rowNumber);
          censoredRow.getCell(1).value = "RPO NEGATIVO";
          censoredRow.eachCell({ includeEmpty: true }, (c) => {
            c.value = "CENSURATO";
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
            c.font = { color: { argb: 'FF000000' } };
          });
        }
      });
    });

    const bufferExcel = await workbook.xlsx.writeBuffer();
    const bufferCensored = await censoredWorkbook.xlsx.writeBuffer();
    
    return {
      success: true,
      excel: new Blob([bufferExcel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      excelCensored: new Blob([bufferCensored], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      numbersTxt: new Blob([outputTxtLines.join('\r\n')], { type: 'text/plain;charset=utf-8' }),
      foundCount: matchCount,
      originalName: excelFile.name
    };

  } catch (error) {
    console.error("Errore Scanner:", error);
    throw error;
  }
};