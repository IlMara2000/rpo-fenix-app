import ExcelJS from 'exceljs';

/**
 * 🔵 CONVERTER RPO (Conforme a Procedura Versione 2.10 - 01/04/2025)
 */
export const runRpoConverter = async (file) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const numbers = new Set();
  // Regex per catturare il numero e opzionalmente il prefisso 39/0039 da scartare
  const phoneRegex = /(?:\+39|0039)?(\d{8,11})/g;

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        let cellValue = "";
        if (cell.value !== null && cell.value !== undefined) {
          // Usiamo cell.text per evitare formati scientifici o date
          cellValue = cell.text ? cell.text.toString().trim() : cell.value.toString().trim();
        }

        let match;
        while ((match = phoneRegex.exec(cellValue)) !== null) {
          let cleanNumber = match[1]; 
          [span_10](start_span)[span_11](start_span)// Il sistema accetta 06... o 338... senza prefisso nazione[span_10](end_span)[span_11](end_span)
          // Rimuoviamo eventuali spazi o caratteri non numerici rimasti
          cleanNumber = cleanNumber.replace(/\D/g, '');
          
          if (cleanNumber.length >= 8) {
            numbers.add(cleanNumber);
          }
        }
      });
    });
  });

  [span_12](start_span)[span_13](start_span)// Costruiamo il contenuto con terminazione CRLF (0x0D 0x0A) come richiesto[span_12](end_span)[span_13](end_span)
  // La sequenza \r\n in JS corrisponde esattamente a 0x0D 0x0A
  const finalContent = Array.from(numbers).join('\r\n') + '\r\n';

  [span_14](start_span)[span_15](start_span)// Il nome del file deve iniziare con lettera minuscola[span_14](end_span)[span_15](end_span)
  let rawName = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = rawName.substring(0, 96); // Sicurezza per stare sotto i 100 char inclusa estensione

  return {
    txt: new Blob([finalContent], { type: 'text/plain;charset=us-ascii' }),
    fileName: fileName
  };
};
