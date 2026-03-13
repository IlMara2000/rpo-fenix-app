import ExcelJS from 'exceljs';

export const runRpoScanner = async (txtFile, excelFile) => {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        
        const blacklistArray = []; 
        const blacklistSet = new Set(); 
        
        // 1. Leggiamo il file TXT del Registro
        lines.forEach(line => {
          if (line.trim()) {
            const parts = line.split(',');
            const phone = parts[0]?.trim();
            const status = parts[1]?.trim();
            
            // Prendiamo solo i numeri con stato "1" (iscritti)
            if (status === '1' && phone) {
              blacklistArray.push(phone);
              blacklistSet.add(phone);
            }
          }
        });

        // 2. Leggiamo l'Excel solo per contare i match nell'anagrafica
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
                matchCount++;
              }
            });
          });
        });

        // 3. Creiamo il file TXT finale (solo numeri ,1,)
        const txtContent = blacklistArray.join('\r\n');
        const blob = new Blob([txtContent], { type: 'text/plain' });

        resolve({
          success: true,
          txtBlacklist: blob,
          foundCount: matchCount, 
          fileName: excelFile.name.replace('.xlsx', '')
        });

      } catch (err) {
        console.error("Errore Scanner:", err);
        reject(err);
      }
    };
    reader.readAsText(txtFile);
  });
};
