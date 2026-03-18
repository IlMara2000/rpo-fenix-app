import ExcelJS from 'exceljs';

export const runRpoConverter = async (file) => {
  try {
    const workbook = new ExcelJS.Workbook();
    // Usiamo arrayBuffer per una lettura più stabile
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const numbers = new Set();
    [span_2](start_span)// Regex aggiornata: cattura solo numeri, ignorando prefissi nazione come richiesto[span_2](end_span)
    const phoneRegex = /(?:\+39|0039)?(\d{8,11})/g;

    workbook.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          try {
            let cellValue = "";
            
            // Gestione robusta del valore della cella
            if (cell.value !== null && cell.value !== undefined) {
              // Se è una formula o un oggetto, prendiamo il risultato testuale
              if (typeof cell.value === 'object' && cell.value.result !== undefined) {
                cellValue = cell.value.result.toString();
              } else {
                cellValue = cell.text ? cell.text.toString() : cell.value.toString();
              }
            }

            let match;
            // Pulizia e ricerca numeri
            const cleanText = cellValue.replace(/\s+/g, ''); // Rimuove spazi interni
            while ((match = phoneRegex.exec(cleanText)) !== null) {
              let num = match[1];
              [span_3](start_span)// Il sistema RPO vuole solo cifre decimali[span_3](end_span)
              [span_4](start_span)// e niente prefisso 0039[span_4](end_span)
              if (num.length >= 8 && num.length <= 11) {
                numbers.add(num);
              }
            }
          } catch (cellError) {
            console.warn("Cella saltata per errore formato:", cellError);
          }
        });
      });
    });

    if (numbers.size === 0) {
      throw new Error("Nessun numero di telefono valido trovato nel file.");
    }

    [span_5](start_span)[span_6](start_span)// Formattazione richiesta: ASCII, cifre decimali, terminate da CRLF (0x0D 0x0A)[span_5](end_span)[span_6](end_span)
    const finalContent = Array.from(numbers).join('\r\n') + '\r\n';

    [span_7](start_span)[span_8](start_span)// Nome file: minuscolo, max 100 char, simboli ammessi '.', '-', '_'[span_7](end_span)[span_8](end_span)
    let safeName = file.name.split('.')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 90);

    return {
      txt: new Blob([finalContent], { type: 'text/plain;charset=us-ascii' }),
      fileName: safeName
    };

  } catch (error) {
    console.error("Errore critico conversione:", error);
    throw new Error(`Errore durante la lettura dell'Excel: ${error.message}`);
  }
};
