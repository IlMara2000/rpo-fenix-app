import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export const runRpoConverter = async (file) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const numbers = new Set();
  
  // Regex per catturare i numeri (ignora +39 o 0039)
  const phoneRegex = /(?:\+39|0039)?(\d{8,11})/g;

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        // Gestione robusta del valore della cella
        let cellValue = "";
        if (cell.value !== null && cell.value !== undefined) {
          cellValue = cell.text ? cell.text.toString() : cell.value.toString();
        }

        let match;
        while ((match = phoneRegex.exec(cellValue)) !== null) {
          let cleanNumber = match[1];

          // --- LOGICA AGGIUNTA DELLO "0" IN TESTA ---
          // Se il primo numero NON è '0' e NON è '3'
          if (cleanNumber[0] !== '0' && cleanNumber[0] !== '3') {
            cleanNumber = '0' + cleanNumber;
          }
          
          numbers.add(cleanNumber);
        }
      });
    });
  });

  const finalContent = Array.from(numbers).join('\r\n') + '\r\n';
  const zip = new JSZip();
  const fileName = file.name.split('.')[0].toLowerCase().replace(/\s/g, '_');
  
  // Creazione file .txt dentro lo ZIP
  zip.file(`${fileName}.txt`, finalContent);
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  return {
    txt: new Blob([finalContent], { type: 'text/plain;charset=utf-8' }),
    zip: zipBlob,
    fileName: fileName
  };
};
