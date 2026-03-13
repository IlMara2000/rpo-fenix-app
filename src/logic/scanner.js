import ExcelJS from 'exceljs';

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

        // Scansione celle della riga alla ricerca del numero
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

        // 2. SE TROVA IL MATCH: RIGA NERA, TESTO BIANCO
        if (isMatch) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            // Applica lo sfondo nero
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF000000' } // Nero
            };
            // Applica il testo bianco e grassetto
            cell.font = {
              color: { argb: 'FFFFFFFF' }, // Bianco
              bold: true
            };
            // Mantieni i bordi se presenti o aggiungi un bordo sottile per separare le celle nere
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
    
    return {
      success: true,
      excelBonificato: new Blob([bufferExcel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      numbersTxt: new Blob([outputTxtLines.join('\r\n')], { type: 'text/plain;charset=utf-8' }),
      foundCount: matchCount,
      fileName: excelFile.name.replace(/\.[^/.]+$/, "") // Nome senza estensione
    };

  } catch (error) {
    console.error("Errore Scanner:", error);
    throw error;
  }
};
