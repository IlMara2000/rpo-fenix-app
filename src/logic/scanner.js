import ExcelJS from 'exceljs';

export const runRpoScanner = async (txtFile, excelFile) => {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        
        const blacklistArray = []; // Per il file .txt finale
        const blacklistSet = new Set(); // Per il confronto veloce con l'Excel
        
        lines.forEach(line => {
          if (line.trim()) {
            // Parsing formato: numero,stato,data
            const parts = line.split(',');
            const phone = parts[0]?.trim();
            const status = parts[1]?.trim();
            
            // Filtriamo solo i numeri con stato "1" (Iscritti RPO)
            if (status === '1' && phone) {
              blacklistArray.push(phone);
              blacklistSet.add(phone);
            }
          }
        });

        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await excelFile.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        let matchCount = 0;

        workbook.worksheets.forEach((sheet) => {
          sheet.eachRow({ includeEmpty: false }, (row) => {
            let foundInRow = false;

            row.eachCell({ includeEmpty: false }, (cell) => {
              if (foundInRow) return;
              
              const cellValue = cell.text ? String(cell.text).replace(/\D/g, '') : "";
              
              if (cellValue.length >= 9 && blacklistSet.has(cellValue)) {
                foundInRow = true;
              }
            });

            if (foundInRow) {
              matchCount++;
              // Coloriamo l'intero rigo di nero con testo bianco
              row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FF000000' }
                };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
              });
            }
          });
        });

        const excelBuffer = await workbook.xlsx.writeBuffer();
        
        // Creiamo il file TXT con i numeri blacklistati (solo stato 1)
        const txtContent = blacklistArray.join('\n');

        resolve({
          success: true,
          excelBonificato: new Blob([excelBuffer]),
          txtBlacklist: new Blob([txtContent], { type: 'text/plain' }),
          foundCount: matchCount, // Match trovati nell'excel
          totalBlacklist: blacklistArray.length, // Totale numeri "1" nel file RPO
          fileName: excelFile.name.replace('.xlsx', '')
        });

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(txtFile);
  });
};
