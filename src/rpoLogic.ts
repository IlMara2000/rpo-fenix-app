export type DividerResult = {
  fileA: Blob;
  fileB: Blob;
  countA: number;
  countB: number;
  originalName: string;
};

export type SplitterResult = {
  txtUno: Blob;
  txtZero: Blob;
  foundCount: number;
  cleanCount: number;
  originalName: string;
};

export type PreparedImagePayload = {
  dataUrl: string;
  width: number;
  height: number;
};

export async function runRpoDivider(txtFile: File, splitLine: string): Promise<DividerResult> {
  const text = await txtFile.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const index = Number.parseInt(splitLine, 10);

  if (!Number.isFinite(index) || index <= 0) {
    throw new Error("Inserisci una riga di taglio valida.");
  }

  const part1 = lines.slice(0, index);
  const part2 = lines.slice(index);

  return {
    fileA: new Blob([`${part1.join("\r\n")}\r\n`], { type: "text/plain;charset=utf-8" }),
    fileB: new Blob([`${part2.join("\r\n")}\r\n`], { type: "text/plain;charset=utf-8" }),
    countA: part1.length,
    countB: part2.length,
    originalName: txtFile.name.replace(/\.txt$/i, ""),
  };
}

export async function runRpoSplitter(txtFile: File): Promise<SplitterResult> {
  const text = await txtFile.text();
  const listOne: string[] = [];
  const listZero: string[] = [];

  text.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) {
      return;
    }

    const [phone, status] = line.split(",").map((part) => part?.trim());
    if (!phone || !status) {
      return;
    }

    if (status === "1") {
      listOne.push(phone);
    }
    if (status === "0") {
      listZero.push(phone);
    }
  });

  return {
    txtUno: new Blob([listOne.join("\r\n")], { type: "text/plain;charset=utf-8" }),
    txtZero: new Blob([listZero.join("\r\n")], { type: "text/plain;charset=utf-8" }),
    foundCount: listOne.length,
    cleanCount: listZero.length,
    originalName: txtFile.name.replace(/\.txt$/i, ""),
  };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function prepareImagePayload(file: File): Promise<PreparedImagePayload> {
  const image = await loadImage(file);
  const maxSide = 1536;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas non disponibile nel browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Immagine non leggibile."));
    };
    image.src = url;
  });
}
