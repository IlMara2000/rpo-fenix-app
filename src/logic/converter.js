import ExcelJS from 'exceljs';

// ===============================
// 🔵 1. CONVERTER (SOLO TXT)
// ===============================
export const runRpoConverter = async (file) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const numbers = new Set();

  // Regex numeri telefono
  const phoneRegex = /(?:\+39|0039)?(\d{8,11})/g;

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        let cellValue = "";

        if (cell.value !== null && cell.value !== undefined) {
          cellValue = cell.text
            ? cell.text.toString()
            : cell.value.toString();
        }

        let match;
        while ((match = phoneRegex.exec(cellValue)) !== null) {
          let cleanNumber = match[1];

          // Correzione prefisso
          if (cleanNumber[0] !== '0' && cleanNumber[0] !== '3') {
            cleanNumber = '0' + cleanNumber;
          }

          numbers.add(cleanNumber);
        }
      });
    });
  });

  const finalContent = Array.from(numbers).join('\r\n') + '\r\n';

  const fileName = file.name
    .split('.')[0]
    .toLowerCase()
    .replace(/\s/g, '_');

  return {
    txt: new Blob([finalContent], {
      type: 'text/plain;charset=utf-8'
    }),
    fileName
  };
};


// ===============================
// 🟢 2. SCANNER (MATCH + EXCEL)
// ===============================
export const runRpoScanner = async (txtFile, excelFile) => {
  // ===== TXT =====
  const txtData = await txtFile.text();

  const numbers = txtData
    .split(/\r?\n|,|\s+/)
    .map(n => n.trim())
    .filter(n => n !== '');

  const numberSet = new Set(numbers);

  // ===== EXCEL =====
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await excelFile.arrayBuffer());

  const worksheet = workbook.worksheets[0];

  let foundCount = 0;

  worksheet.eachRow((row) => {
    let matchFound = false;

    // Controllo celle
    row.eachCell((cell) => {
      if (numberSet.has(String(cell.value).trim())) {
        matchFound = true;
      }
    });

    if (matchFound) {
      foundCount++;

      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF000000' }
        };

        cell.font = {
          color: { argb: 'FFFFFFFF' }
        };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    success: true,
    foundCount,
    excelBonificato: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }),
    fileName: excelFile.name
      .split('.')[0]
      .toLowerCase()
      .replace(/\s/g, '_')
  };
};
