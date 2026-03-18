export const runRpoDivider = async (txtFile) => {
  try {
    // leggiamo il file txt
    const text = await txtFile.text();
    const lines = text.split(/\r?\n/);

    const listOne = []; // numeri con ,1,
    const listZero = []; // numeri con ,0,

    lines.forEach(line => {
      if (!line.trim()) return;

      const parts = line.split(',');

      const phone = parts[0]?.trim();
      const status = parts[1]?.trim();

      if (!phone || !status) return;

      if (status === '1') {
        listOne.push(phone);
      }

      if (status === '0') {
        listZero.push(phone);
      }
    });

    // creiamo i due txt
    const txtOneContent = listOne.join('\r\n');
    const txtZeroContent = listZero.join('\r\n');

    const blobOne = new Blob(
      [txtOneContent],
      { type: 'text/plain;charset=utf-8' }
    );

    const blobZero = new Blob(
      [txtZeroContent],
      { type: 'text/plain;charset=utf-8' }
    );

    return {
      success: true,
      txtUno: blobOne,
      txtZero: blobZero,
      foundCount: listOne.length,
      fileName: txtFile.name.replace('.txt','')
    };

  } catch (err) {
    console.error("Errore Divider:", err);
    throw err;
  }
};
