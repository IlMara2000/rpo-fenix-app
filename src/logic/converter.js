import * as XLSX from 'xlsx';

/**
 * Funzione per trasformare l'Excel degli agenti in un file TXT per il Registro.
 * Pulisce i numeri da note, parentesi e corregge lo zero iniziale.
 */
export const runRpoConverter = async (file) => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    
    // Prendiamo il primo foglio dell'Excel
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Trasformiamo il foglio in una tabella di righe e colonne
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const validNumbers = [];

    rows.forEach(row => {
      row.forEach(cell => {
        if (cell) {
          // 1. Trasformiamo la cella in testo pulito
          let text = cell.toString().trim();
          
          // 2. Gestione casi sporchi (es: "02123456 (lavoro Claudia)" o "333 123 4567")
          // Prendiamo solo la prima parte prima di spazi o parentesi
          let firstPart = text.split(' ')[0].split('(')[0].trim();

          // 3. Teniamo SOLO i numeri (togliamo trattini, punti, slash)
          const onlyNumbers = firstPart.replace(/\D/g, '');

          // 4. Controllo validità: un numero deve avere almeno 6 cifre 
          // (per evitare di prendere anni, civici o codici interni)
          if (onlyNumbers.length >= 6) {
            let finalNum = onlyNumbers;
            
            // 5. Correzione Zero: Se non inizia con 0 e non è un cellulare (inizia con 3), aggiungiamo lo 0
            if (!finalNum.startsWith('0') && !finalNum.startsWith('3')) {
              finalNum = '0' + finalNum;
            }
            
            validNumbers.push(finalNum);
          }
        }
      });
    });

    // 6. Togliamo i numeri duplicati per non mandare file giganti al Registro
    const uniqueNumbers = [...new Set(validNumbers)];

    // 7. Creiamo il contenuto del file TXT con un numero per riga
    const txtContent = uniqueNumbers.join('\r\n');
    
    // Creiamo il file (Blob) pronto per il download
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    
    return { 
      txt: blob,
      fileName: file.name.replace(/\.[^/.]+$/, "") // Restituiamo il nome originale senza estensione
    };

  } catch (error) {
    console.error("Errore nel Converter:", error);
    throw new Error("Impossibile leggere il file Excel. Assicurati che non sia protetto da password.");
  }
};