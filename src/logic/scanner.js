import ExcelJS from 'exceljs';

export const runRpoScanner = async (txtFile, excelFile) => {
  const txtText = await txtFile.text();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await excelFile.arrayBuffer());

  // 1. Estraiamo e puliamo i numeri dalla blacklist (quelli con ",1")
  const blacklistedNumbers = txtText
    .split(/\r?\n/)
    .filter(line => line.includes(',1'))
    .map(line => {
      // Prende la parte prima della virgola, toglie spazi e prefissi comuni
      const rawNum = line.split(',')[0].trim();
      return rawNum.replace(/^(\+39|0039)/, '');
    })
    .filter(num => num.length >= 6); // Sicurezza: ignora frammenti troppo corti

  const foundNumbers = [];

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row, rowNumber) => {
      // Saltiamo le intestazioni (solitamente riga 1 o le prime 2)
      if (rowNumber < 2) return;

      let rowShouldBeColored = false;

      // Cerchiamo il match esatto del numero in qualunque cella della riga
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (rowShouldBeColored) return; // Se abbiamo già deciso di colorare, passa oltre

        const cellValue = String(cell.value || "").trim();
        if (!cellValue || cellValue.length < 6) return;

        for (const rpoNum of blacklistedNumbers) {
          // Se il numero pulito dell'RPO è contenuto nel valore della cella
          if (cellValue.includes(rpoNum)) {
            rowShouldBeColored = true;
            if (!foundNumbers.includes(rpoNum)) {
              foundNumbers.push(rpoNum);
            }
            break; 
          }
        }
      });

      // 2. Se c'è un match, applichiamo lo stile "Fenix Red" a tutta la riga
      if (rowShouldBeColored) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          // Sfondo Rosso Scuro
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF8B0000' }
          };
          // Testo Bianco Bold
          cell.font = {
            color: { argb: 'FFFFFFFF' },
            bold: true,
            size: 10,
            name: 'Arial'
          };
          // Bordi neri sottili per definire la riga
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      }
    });
  });

  // Generazione del buffer finale
  const buffer = await workbook.xlsx.writeBuffer();
  
  return {
    excel: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    numbersTxt: new Blob([foundNumbers.join('\r\n')], { type: 'text/plain;charset=utf-8' }),
    foundCount: foundNumbers.length
  };
};