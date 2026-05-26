import { useEffect, useRef } from "react";
import type { FloorPlan3D, Room3D } from "./floorPlan3d";

type FloorPlan3DViewerProps = {
  plan: FloorPlan3D;
  baseImageUrl?: string;
  finalImageUrl?: string;
  fallbackLabel?: string;
  generated?: boolean;
};

type CanvasRenderState = {
  ctx: CanvasRenderingContext2D;
  scale: number;
  offsetX: number;
  offsetY: number;
};

const wallColor = "#4a4a48";
const wallEdge = "#242424";
const woodBase = "#caa477";
const tileBase = "#c7b9a6";
const balconyBase = "#b9b0a2";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function toRect(room: Room3D, state: CanvasRenderState) {
  const x = state.offsetX + (room.x - room.width / 2) * state.scale;
  const y = state.offsetY + (room.z - room.depth / 2) * state.scale;
  return {
    x,
    y,
    width: room.width * state.scale,
    height: room.depth * state.scale,
  };
}

function addNoise(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.globalAlpha = 0.045;
  for (let index = 0; index < 1800; index += 1) {
    const shade = 120 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }
  ctx.restore();
}

function drawWood(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#d8b98b");
  gradient.addColorStop(0.5, woodBase);
  gradient.addColorStop(1, "#b98454");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  ctx.save();
  ctx.strokeStyle = "rgba(92, 58, 34, 0.24)";
  ctx.lineWidth = 1;
  const plank = Math.max(12, Math.min(24, width / 10));
  for (let px = x + plank; px < x + width; px += plank) {
    ctx.beginPath();
    ctx.moveTo(px + Math.sin(px) * 1.4, y);
    ctx.lineTo(px + Math.cos(px) * 1.2, y + height);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.26;
  for (let py = y + 18; py < y + height; py += 34) {
    ctx.beginPath();
    ctx.moveTo(x + 8, py);
    ctx.bezierCurveTo(x + width * 0.35, py - 5, x + width * 0.64, py + 7, x + width - 8, py);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTiles(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = tileBase;
  ctx.fillRect(x, y, width, height);
  ctx.save();
  ctx.strokeStyle = "rgba(80, 70, 62, 0.2)";
  ctx.lineWidth = 1;
  const tile = Math.max(26, Math.min(42, Math.min(width, height) / 3));
  for (let px = x; px <= x + width; px += tile) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + height);
    ctx.stroke();
  }
  for (let py = y; py <= y + height; py += tile) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + width, py);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoomFloor(ctx: CanvasRenderingContext2D, room: Room3D, rect: ReturnType<typeof toRect>) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  if (room.type.includes("bagno") || room.type.includes("lavanderia")) {
    drawTiles(ctx, rect.x, rect.y, rect.width, rect.height);
  } else if (room.type.includes("terrazzo") || room.type.includes("balcone")) {
    ctx.fillStyle = balconyBase;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  } else {
    drawWood(ctx, rect.x, rect.y, rect.width, rect.height);
  }

  ctx.restore();
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#795a38";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  for (let index = 0; index < 14; index += 1) {
    const angle = (Math.PI * 2 * index) / 14;
    ctx.rotate(angle);
    ctx.fillStyle = index % 2 ? "#456d30" : "#5f8a3f";
    ctx.beginPath();
    ctx.ellipse(radius * 0.42, 0, radius * 0.58, radius * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-angle);
  }
  ctx.restore();
}

function drawBed(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 9;
  roundedRect(ctx, x, y, width, height, 10);
  ctx.fillStyle = "#d8c8ae";
  ctx.fill();
  ctx.shadowColor = "transparent";
  roundedRect(ctx, x + width * 0.08, y + height * 0.06, width * 0.38, height * 0.2, 8);
  ctx.fillStyle = "#f2eee5";
  ctx.fill();
  roundedRect(ctx, x + width * 0.54, y + height * 0.06, width * 0.38, height * 0.2, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(x + width * 0.08, y + height * 0.34, width * 0.84, height * 0.54);
  ctx.restore();
}

function drawWardrobe(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, "#7d5838");
  gradient.addColorStop(0.5, "#a36f43");
  gradient.addColorStop(1, "#6e4a2e");
  ctx.fillStyle = gradient;
  roundedRect(ctx, x, y, width, height, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(45, 28, 17, 0.35)";
  ctx.lineWidth = 1.5;
  const parts = Math.max(2, Math.floor(width / 40));
  for (let i = 1; i < parts; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + (width / parts) * i, y + 5);
    ctx.lineTo(x + (width / parts) * i, y + height - 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSofa(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = "#b38d70";
  roundedRect(ctx, x, y, width, height, 12);
  ctx.fill();
  ctx.fillStyle = "#d6beaa";
  roundedRect(ctx, x + 8, y + 8, width - 16, height - 16, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(79, 54, 42, 0.28)";
  ctx.strokeRect(x + width / 2, y + 9, 1, height - 18);
  ctx.restore();
}

function drawBathroom(ctx: CanvasRenderingContext2D, rect: ReturnType<typeof toRect>) {
  const unit = Math.min(rect.width, rect.height);
  ctx.save();
  roundedRect(ctx, rect.x + 12, rect.y + 12, unit * 0.32, unit * 0.32, 3);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fill();
  ctx.strokeStyle = "#7c7c78";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rect.x + rect.width * 0.58, rect.y + rect.height * 0.24, unit * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "#f7f5ef";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(rect.x + rect.width * 0.78, rect.y + rect.height * 0.25, unit * 0.11, unit * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  roundedRect(ctx, rect.x + rect.width * 0.48, rect.y + rect.height * 0.68, unit * 0.28, unit * 0.16, 6);
  ctx.fill();
  ctx.stroke();
  drawPlant(ctx, rect.x + rect.width * 0.22, rect.y + rect.height * 0.76, unit * 0.1);
  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, rect: ReturnType<typeof toRect>, side: "bottom" | "right") {
  ctx.save();
  ctx.strokeStyle = "#554a3f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (side === "bottom") {
    const x = rect.x + rect.width * 0.55;
    const y = rect.y + rect.height;
    const r = Math.min(42, rect.width * 0.18);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - r);
    ctx.arc(x, y, r, -Math.PI / 2, 0);
  } else {
    const x = rect.x + rect.width;
    const y = rect.y + rect.height * 0.52;
    const r = Math.min(42, rect.height * 0.18);
    ctx.moveTo(x, y);
    ctx.lineTo(x - r, y);
    ctx.arc(x, y, r, Math.PI, Math.PI / 2, true);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFurniture(ctx: CanvasRenderingContext2D, room: Room3D, rect: ReturnType<typeof toRect>) {
  const pad = Math.max(10, Math.min(rect.width, rect.height) * 0.08);
  if (room.type.includes("bagno")) {
    drawBathroom(ctx, rect);
    return;
  }

  if (room.type.includes("camera")) {
    drawBed(ctx, rect.x + pad, rect.y + rect.height * 0.22, rect.width * 0.58, rect.height * 0.45);
    drawWardrobe(ctx, rect.x + rect.width * 0.78, rect.y + pad, rect.width * 0.14, rect.height - pad * 2);
    drawPlant(ctx, rect.x + rect.width * 0.82, rect.y + rect.height * 0.86, Math.min(18, rect.width * 0.06));
    return;
  }

  if (room.type.includes("cucina")) {
    drawWardrobe(ctx, rect.x + pad, rect.y + pad, rect.width - pad * 2, Math.min(34, rect.height * 0.18));
    roundedRect(ctx, rect.x + rect.width * 0.34, rect.y + rect.height * 0.42, rect.width * 0.32, rect.height * 0.2, 8);
    ctx.fillStyle = "#c7a36f";
    ctx.fill();
    return;
  }

  if (room.type.includes("terrazzo") || room.type.includes("balcone")) {
    drawPlant(ctx, rect.x + rect.width * 0.18, rect.y + rect.height * 0.48, Math.min(18, rect.height * 0.18));
    drawPlant(ctx, rect.x + rect.width * 0.82, rect.y + rect.height * 0.48, Math.min(18, rect.height * 0.18));
    ctx.fillStyle = "#6d7f45";
    roundedRect(ctx, rect.x + rect.width * 0.28, rect.y + rect.height * 0.68, rect.width * 0.44, rect.height * 0.16, 10);
    ctx.fill();
    return;
  }

  if (room.type.includes("soggiorno")) {
    drawSofa(ctx, rect.x + pad, rect.y + rect.height * 0.25, rect.width * 0.48, rect.height * 0.24);
    roundedRect(ctx, rect.x + rect.width * 0.6, rect.y + rect.height * 0.42, rect.width * 0.2, rect.height * 0.16, 8);
    ctx.fillStyle = "#b98952";
    ctx.fill();
    drawPlant(ctx, rect.x + rect.width * 0.82, rect.y + rect.height * 0.24, Math.min(18, rect.width * 0.06));
    return;
  }

  drawWardrobe(ctx, rect.x + rect.width * 0.72, rect.y + pad, rect.width * 0.16, rect.height - pad * 2);
}

function drawLabel(ctx: CanvasRenderingContext2D, room: Room3D, rect: ReturnType<typeof toRect>) {
  const label = room.name.replace(/\s+\d+$/, "").toUpperCase();
  const fontSize = Math.max(13, Math.min(28, Math.min(rect.width, rect.height) * 0.13));
  ctx.save();
  ctx.fillStyle = "rgba(26, 24, 22, 0.84)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${fontSize}px Arial, sans-serif`;
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height * 0.7);
  if (!room.type.includes("terrazzo") && !room.type.includes("balcone")) {
    ctx.font = `500 ${Math.max(11, fontSize * 0.68)}px Arial, sans-serif`;
    ctx.fillText("H 2.80", rect.x + rect.width / 2, rect.y + rect.height * 0.7 + fontSize * 0.92);
  }
  ctx.restore();
}

function renderMarketingPlan(canvas: HTMLCanvasElement, plan: FloorPlan3D) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cssWidth = Math.max(360, canvas.clientWidth || 900);
  const cssHeight = Math.max(520, canvas.clientHeight || 680);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(cssWidth * pixelRatio);
  canvas.height = Math.floor(cssHeight * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  addNoise(ctx, cssWidth, cssHeight);

  const margin = Math.max(42, Math.min(cssWidth, cssHeight) * 0.08);
  const scale = Math.min((cssWidth - margin * 2) / plan.width, (cssHeight - margin * 2) / plan.depth);
  const offsetX = cssWidth / 2 - (plan.width * scale) / 2;
  const offsetY = cssHeight / 2 - (plan.depth * scale) / 2;
  const state = { ctx, scale, offsetX, offsetY };

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(offsetX, offsetY, plan.width * scale, plan.depth * scale);
  ctx.restore();

  plan.rooms.forEach((room) => drawRoomFloor(ctx, room, toRect(room, state)));
  plan.rooms.forEach((room) => {
    const rect = toRect(room, state);
    ctx.save();
    ctx.strokeStyle = wallColor;
    ctx.lineWidth = Math.max(12, plan.wallThickness * scale * 4.6);
    ctx.lineJoin = "miter";
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = wallEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  });
  plan.rooms.forEach((room, index) => {
    const rect = toRect(room, state);
    drawFurniture(ctx, room, rect);
    drawDoor(ctx, rect, index % 2 === 0 ? "bottom" : "right");
    drawLabel(ctx, room, rect);
  });
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Immagine non leggibile"));
    image.src = src;
  });
}

function drawWoodWash(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.globalAlpha = 0.34;
  drawWood(ctx, x, y, width, height);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#f7f0e5";
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function renderFaithfulUploadedPlan(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const cssWidth = Math.max(360, canvas.clientWidth || 900);
  const cssHeight = Math.max(520, canvas.clientHeight || 680);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(cssWidth * pixelRatio);
  canvas.height = Math.floor(cssHeight * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  addNoise(ctx, cssWidth, cssHeight);

  const margin = Math.max(34, Math.min(cssWidth, cssHeight) * 0.055);
  const scale = Math.min((cssWidth - margin * 2) / image.naturalWidth, (cssHeight - margin * 2) / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = (cssWidth - drawWidth) / 2;
  const drawY = (cssHeight - drawHeight) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 14;
  drawWoodWash(ctx, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  const sample = document.createElement("canvas");
  const maxSampleSide = 900;
  const sampleScale = Math.min(1, maxSampleSide / Math.max(image.naturalWidth, image.naturalHeight));
  sample.width = Math.max(1, Math.round(image.naturalWidth * sampleScale));
  sample.height = Math.max(1, Math.round(image.naturalHeight * sampleScale));
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) return;

  sampleCtx.drawImage(image, 0, 0, sample.width, sample.height);
  const imageData = sampleCtx.getImageData(0, 0, sample.width, sample.height);
  const data = imageData.data;
  const mask = new Uint8Array(sample.width * sample.height);

  for (let y = 1; y < sample.height - 1; y += 1) {
    for (let x = 1; x < sample.width - 1; x += 1) {
      const index = (y * sample.width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];
      const luma = red * 0.299 + green * 0.587 + blue * 0.114;
      const contrast =
        Math.abs(luma - (data[index - 4] * 0.299 + data[index - 3] * 0.587 + data[index - 2] * 0.114)) +
        Math.abs(luma - (data[index + 4] * 0.299 + data[index + 5] * 0.587 + data[index + 6] * 0.114)) +
        Math.abs(luma - (data[index - sample.width * 4] * 0.299 + data[index - sample.width * 4 + 1] * 0.587 + data[index - sample.width * 4 + 2] * 0.114)) +
        Math.abs(luma - (data[index + sample.width * 4] * 0.299 + data[index + sample.width * 4 + 1] * 0.587 + data[index + sample.width * 4 + 2] * 0.114));

      if (alpha > 40 && (luma < 118 || (luma < 185 && contrast > 95))) {
        mask[y * sample.width + x] = 1;
      }
    }
  }

  const lineCanvas = document.createElement("canvas");
  lineCanvas.width = sample.width;
  lineCanvas.height = sample.height;
  const lineCtx = lineCanvas.getContext("2d");
  if (!lineCtx) return;

  lineCtx.fillStyle = "rgba(62, 63, 62, 0.88)";
  const point = Math.max(1, Math.round(sample.width / 560));
  for (let y = 0; y < sample.height; y += point) {
    for (let x = 0; x < sample.width; x += point) {
      if (!mask[y * sample.width + x]) continue;
      lineCtx.fillRect(x - point, y - point, point * 3, point * 3);
    }
  }

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  ctx.save();
  ctx.filter = "drop-shadow(0 2px 2px rgba(0,0,0,0.22))";
  ctx.drawImage(lineCanvas, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.26;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.78)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

export function FloorPlan3DViewer({ plan, baseImageUrl, finalImageUrl, fallbackLabel, generated = false }: FloorPlan3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || finalImageUrl || !generated) return undefined;
    let cancelled = false;

    const render = async () => {
      if (baseImageUrl) {
        try {
          const image = await loadCanvasImage(baseImageUrl);
          if (!cancelled) renderFaithfulUploadedPlan(canvas, image);
          return;
        } catch {
          if (cancelled) return;
        }
      }
      renderMarketingPlan(canvas, plan);
    };

    void render();
    const observer = new ResizeObserver(() => {
      void render();
    });
    observer.observe(canvas);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [plan, baseImageUrl, finalImageUrl]);

  function downloadSnapshot() {
    if (!generated) return;

    if (finalImageUrl) {
      const link = document.createElement("a");
      link.href = finalImageUrl;
      link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-rilievo-ai.jpg`;
      link.click();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.94);
    link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-planimetria-arredata.jpg`;
    link.click();
  }

  return (
    <div className="plan-3d-viewer-shell plan-relief-viewer-shell">
      {finalImageUrl ? (
        <img className="plan-ai-final-image" src={finalImageUrl} alt="Rilievo AI su planimetria" />
      ) : generated ? (
        <div className="plan-local-render" aria-label="Planimetria arredata generata localmente">
          <canvas ref={canvasRef} />
          <span>{fallbackLabel || "Render locale gratuito"}</span>
        </div>
      ) : (
        <div className="plan-render-empty" aria-label="Anteprima vuota">
          <span>Carica una planimetria e premi genera</span>
        </div>
      )}
      {generated ? (
        <button className="plan-3d-snapshot" type="button" onClick={downloadSnapshot}>
          Scarica JPG finale
        </button>
      ) : null}
    </div>
  );
}
