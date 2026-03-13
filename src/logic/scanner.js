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
        
        lines.forEach(line => {
          if (line.trim()) {
            const parts = line.split(',');
            const phone = parts[0]?.trim();
            const status = parts[1]?.trim();
            
            // Prendiamo SOLO i numeri con stato "1"
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

        // Controlliamo l'excel solo per darti il numero di match trovati
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

        // Generiamo il contenuto del TXT: solo numeri ,1,
        const txtContent = blacklistArray.join('\n');

        resolve({
          success: true,
          txtBlacklist: new Blob([txtContent], { type: 'text/plain' }),
          foundCount: matchCount, 
          fileName: excelFile.name.replace('.xlsx', '')
        });

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(txtFile);
  });
};
