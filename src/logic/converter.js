import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export const runRpoConverter = async (file) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const numbers = new Set();
  const phoneRegex = /(?:\+39|0039)?(\d{8,11})/g;

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        const value = String(cell.value || "");
        let match;
        while ((match = phoneRegex.exec(value)) !== null) {
          numbers.add(match[1]);
        }
      });
    });
  });

  const finalContent = Array.from(numbers).join('\r\n') + '\r\n';
  const zip = new JSZip();
  const fileName = file.name.split('.')[0].toLowerCase().replace(/\s/g, '_');
  zip.file(`${fileName}.txt`, finalContent);
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  return {
    txt: new Blob([finalContent], { type: 'text/plain;charset=utf-8' }),
    zip: zipBlob,
    fileName: fileName
  };
};