import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const runRpoScanner = async (txtFile, excelFile) => {
  try {
    const txtText = await txtFile.text();
    const targetNumbers = new Set();
    const outputTxtLines = [];

    // 1. Lettura TXT (Match più preciso)
    txtText.split(/\r?\n/).forEach(line => {
      const parts = line.trim().split(',');
      if (parts.length >= 2 && parts[1].trim().startsWith('1')) {
        const num = parts[0].replace(/\D/g, '').trim();
        if (num.length >= 8) {
          targetNumbers.add(num);
          outputTxtLines.push(line.trim());
        }
      }
    });

    const targetNumbersArray = Array.from(targetNumbers);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await excelFile.arrayBuffer());
    
    let matchCount = 0;

    workbook.worksheets.forEach((sheet) => {
      if (!sheet) return;

      // Determiniamo la larghezza reale: usiamo il massimo tra le colonne dichiarate e quelle usate
      const colCount = Math.max(sheet.columnCount, 30); 

      sheet.eachRow({ includeEmpty: true }, (row) => {
        let isMatch = false;

        // RICERCA: Verifichiamo se il numero è presente in qualche cella
        row.eachCell({ includeEmpty: true }, (cell) => {
          if (isMatch) return;
          const cellValue = cell.text ? String(cell.text).replace(/\D/g, '') : "";
          if (cellValue.length >= 8) {
            for (const num of targetNumbersArray) {
              if (cellValue.includes(num)) {
                isMatch = true;
                matchCount++;
                break;
              }
            }
          }
        });

        // AZIONE: Se è un match, coloriamo la riga "A TAPPETO"
        if (isMatch) {
          // Cicliamo su ogni colonna fino alla fine del foglio
          for (let i = 1; i <= colCount; i++) {
            const cell = row.getCell(i);

            // Applichiamo lo stile FORZATO
            cell.value = cell.value; // Ri-assegniamo il valore per "svegliare" la cella
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF000000' }
            };
            cell.font = {
              color: { argb: 'FFFFFFFF' },
              bold: true,
              name: 'Arial',
              size: 10
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const nomeFile = excelFile.name.replace(/\.[^/.]+$/, "");
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveAs(blob, `LISTA_BONIFICATA_${nomeFile}.xlsx`);
    
    return {
      success: true,
      excelBonificato: blob,
      foundCount: matchCount,
      fileName: nomeFile
    };

  } catch (error) {
    console.error("Scanner Error:", error);
    alert("Errore: " + error.message);
    throw error;
  }
};