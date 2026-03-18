import ExcelJS from 'exceljs';

// ===============================
// 🔵 1. CONVERTER (SOLO TXT)
// ===============================
export const runRpoConverter = async (file) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const numbers = new Set();
  const phoneRegex = /(?:\+39|0039)?(\d{8,11})/g;

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        let cellValue = "";
        if (cell.value !== null && cell.value !== undefined) {
          cellValue = cell.text ? cell.text.toString() : cell.value.toString();
        }

        let match;
        while ((match = phoneRegex.exec(cellValue)) !== null) {
          let cleanNumber = match[1];
          if (cleanNumber[0] !== '0' && cleanNumber[0] !== '3') {
            cleanNumber = '0' + cleanNumber;
          }
          numbers.add(cleanNumber);
        }
      });
    });
  });

  const finalContent = Array.from(numbers).join('\r\n') + '\r\n';
  const fileName = file.name.split('.')[0].toLowerCase().replace(/\s/g, '_');

  return {
    txt: new Blob([finalContent], { type: 'text/plain;charset=utf-8' }),
    fileName
  };
};
