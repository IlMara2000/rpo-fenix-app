export const runRpoSplitter = async (txtFile) => {
  try {
    const text = await txtFile.text();
    const lines = text.split(/\r?\n/);

    const listOne = []; // Iscritti (1)
    const listZero = []; // OK (0)

    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(',');
      const phone = parts[0]?.trim();
      const status = parts[1]?.trim();

      if (!phone || !status) return;
      if (status === '1') listOne.push(phone);
      if (status === '0') listZero.push(phone);
    });

    const blobOne = new Blob([listOne.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const blobZero = new Blob([listZero.join('\r\n')], { type: 'text/plain;charset=utf-8' });

    return {
      success: true,
      txtUno: blobOne,
      txtZero: blobZero,
      foundCount: listOne.length
    };
  } catch (err) {
    console.error("Errore Splitter:", err);
    throw err;
  }
};
