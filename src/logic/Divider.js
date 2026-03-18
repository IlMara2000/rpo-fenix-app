export const runRpoDivider = async (txtFile, splitLine) => {
  try {
    const text = await txtFile.text();
    // Dividiamo il file in righe e puliamo quelle vuote
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    
    const index = parseInt(splitLine);
    
    // Parte A: dalla riga 1 alla riga indicata
    const part1 = lines.slice(0, index);
    // Parte B: dalla riga indicata in poi
    const part2 = lines.slice(index);

    const blob1 = new Blob([part1.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' });
    const blob2 = new Blob([part2.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' });

    return {
      success: true,
      fileA: blob1,
      fileB: blob2,
      countA: part1.length,
      countB: part2.length,
      originalName: txtFile.name.replace('.txt', '')
    };
  } catch (err) {
    console.error("Errore Divider:", err);
    throw err;
  }
};
