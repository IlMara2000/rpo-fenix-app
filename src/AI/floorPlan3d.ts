export type Plan3DStyle = "moderno" | "premium" | "essenziale" | "classico";

export type Furniture3D = {
  id: string;
  type: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  rotation?: number;
};

export type Room3D = {
  id: string;
  name: string;
  type: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  furniture: Furniture3D[];
};

export type FloorPlan3D = {
  title: string;
  style: string;
  width: number;
  depth: number;
  wallHeight: number;
  wallThickness: number;
  rooms: Room3D[];
  notes: string[];
  source: "hugging-face" | "local-fallback" | "browser-fallback";
};

export type FloorPlan3DRequest = {
  prompt: string;
  style: Plan3DStyle;
  areaSqm: number;
  roomCount: number;
};

const roomColors: Record<string, string> = {
  soggiorno: "#293242",
  cucina: "#3a2f27",
  camera: "#2b344f",
  bagno: "#203b3f",
  studio: "#332c49",
  ingresso: "#34343a",
  corridoio: "#303136",
  terrazzo: "#344535",
  lavanderia: "#273a36",
  ripostiglio: "#3d3330",
};

const furnitureColors: Record<string, string> = {
  divano: "#b94949",
  tavolo: "#d6b06d",
  letto: "#e7e3da",
  armadio: "#8f969f",
  cucina: "#c9c1b3",
  sanitari: "#f4f7f8",
  doccia: "#93c5fd",
  scrivania: "#d7b98d",
  verde: "#6fa878",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanId(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function furnitureForRoom(type: string): Furniture3D[] {
  if (type === "soggiorno") {
    return [
      { id: "divano", type: "divano", x: -0.8, z: -0.35, width: 1.8, depth: 0.75, height: 0.55, color: furnitureColors.divano },
      { id: "tavolo", type: "tavolino", x: 0.75, z: 0.35, width: 1.2, depth: 0.72, height: 0.42, color: furnitureColors.tavolo },
    ];
  }

  if (type === "cucina") {
    return [
      { id: "blocco-cucina", type: "cucina", x: -0.8, z: -0.6, width: 2.1, depth: 0.62, height: 0.9, color: furnitureColors.cucina },
      { id: "tavolo-pranzo", type: "tavolo", x: 0.65, z: 0.55, width: 1.25, depth: 0.82, height: 0.45, color: furnitureColors.tavolo },
    ];
  }

  if (type === "camera") {
    return [
      { id: "letto", type: "letto", x: -0.55, z: 0.15, width: 1.7, depth: 2.0, height: 0.45, color: furnitureColors.letto },
      { id: "armadio", type: "armadio", x: 1.08, z: -0.78, width: 0.68, depth: 1.7, height: 1.9, color: furnitureColors.armadio },
    ];
  }

  if (type === "bagno") {
    return [
      { id: "doccia", type: "doccia", x: -0.55, z: -0.45, width: 0.86, depth: 0.86, height: 1.95, color: furnitureColors.doccia },
      { id: "sanitari", type: "sanitari", x: 0.55, z: 0.48, width: 0.92, depth: 0.52, height: 0.48, color: furnitureColors.sanitari },
    ];
  }

  if (type === "studio") {
    return [
      { id: "scrivania", type: "scrivania", x: -0.35, z: -0.4, width: 1.35, depth: 0.72, height: 0.74, color: furnitureColors.scrivania },
      { id: "libreria", type: "libreria", x: 0.85, z: 0.55, width: 0.48, depth: 1.55, height: 1.9, color: furnitureColors.armadio },
    ];
  }

  if (type === "terrazzo") {
    return [
      { id: "verde", type: "verde", x: -0.8, z: 0.25, width: 0.72, depth: 0.72, height: 0.38, color: furnitureColors.verde },
      { id: "seduta", type: "seduta", x: 0.55, z: -0.25, width: 1.2, depth: 0.55, height: 0.44, color: furnitureColors.tavolo },
    ];
  }

  return [];
}

function roomTypesFromPrompt(prompt: string, requestedCount: number) {
  const text = prompt.toLowerCase();
  const rooms: string[] = ["ingresso", "soggiorno", "cucina", "bagno"];

  const bedrooms =
    text.includes("quadrilocale") || text.includes("4 locali")
      ? 3
      : text.includes("trilocale") || text.includes("3 locali")
        ? 2
        : text.includes("bilocale") || text.includes("2 locali")
          ? 1
          : Math.max(1, Math.min(3, Math.round(requestedCount / 3)));

  for (let index = 0; index < bedrooms; index += 1) {
    rooms.push("camera");
  }

  if (text.includes("studio")) rooms.push("studio");
  if (text.includes("lavanderia")) rooms.push("lavanderia");
  if (text.includes("ripostiglio")) rooms.push("ripostiglio");
  if (text.includes("terrazzo") || text.includes("balcone")) rooms.push("terrazzo");

  return rooms.slice(0, clamp(requestedCount, 1, 12));
}

export function createFallbackFloorPlan(request: FloorPlan3DRequest, source: FloorPlan3D["source"] = "browser-fallback"): FloorPlan3D {
  const area = clamp(Number(request.areaSqm) || 85, 35, 260);
  const roomTypes = roomTypesFromPrompt(request.prompt, request.roomCount);
  const totalWidth = clamp(Math.sqrt(area) * 1.22, 7.6, 22);
  const totalDepth = clamp(area / totalWidth, 6.2, 18);
  const topRowCount = Math.ceil(roomTypes.length / 2);
  const rows = [roomTypes.slice(0, topRowCount), roomTypes.slice(topRowCount)];
  const rowDepth = totalDepth / rows.filter(Boolean).length;

  const rooms = rows.flatMap((row, rowIndex) => {
    const roomWidth = totalWidth / Math.max(1, row.length);
    return row.map((type, colIndex) => {
      const width = roomWidth;
      const depth = rowDepth;
      const x = -totalWidth / 2 + roomWidth * colIndex + roomWidth / 2;
      const z = -totalDepth / 2 + rowDepth * rowIndex + rowDepth / 2;
      const suffix = roomTypes.filter((item) => item === type).length > 1 ? ` ${colIndex + rowIndex + 1}` : "";
      return {
        id: `${cleanId(type)}-${rowIndex}-${colIndex}`,
        name: `${type.charAt(0).toUpperCase()}${type.slice(1)}${suffix}`,
        type,
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        width: Number(Math.max(1.8, width - 0.18).toFixed(2)),
        depth: Number(Math.max(1.8, depth - 0.18).toFixed(2)),
        height: 0.08,
        color: roomColors[type] ?? "#303136",
        furniture: furnitureForRoom(type),
      };
    });
  });

  return {
    title: request.prompt.trim() ? "Planimetria 3D generata" : "Nuova planimetria 3D",
    style: request.style,
    width: Number(totalWidth.toFixed(2)),
    depth: Number(totalDepth.toFixed(2)),
    wallHeight: 2.75,
    wallThickness: 0.14,
    rooms,
    notes: [
      source === "hugging-face"
        ? "Layout normalizzato dopo generazione Hugging Face."
        : "Layout creato con fallback locale: collega HF_TOKEN per usare il modello Hugging Face.",
    ],
    source,
  };
}

export function normalizeFloorPlan3D(input: unknown, fallbackRequest: FloorPlan3DRequest): FloorPlan3D {
  if (!input || typeof input !== "object") {
    return createFallbackFloorPlan(fallbackRequest);
  }

  const raw = input as Partial<FloorPlan3D>;
  const rooms = Array.isArray(raw.rooms) ? raw.rooms : [];

  if (rooms.length === 0) {
    return createFallbackFloorPlan(fallbackRequest);
  }

  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "Planimetria 3D generata",
    style: typeof raw.style === "string" ? raw.style : fallbackRequest.style,
    width: clamp(Number(raw.width) || 10, 4, 40),
    depth: clamp(Number(raw.depth) || 8, 4, 40),
    wallHeight: clamp(Number(raw.wallHeight) || 2.75, 2.2, 4),
    wallThickness: clamp(Number(raw.wallThickness) || 0.14, 0.08, 0.4),
    rooms: rooms.slice(0, 14).map((room, index) => {
      const item = room as Partial<Room3D>;
      const type = typeof item.type === "string" ? item.type.toLowerCase() : "stanza";
      const furniture = Array.isArray(item.furniture) ? item.furniture : [];

      return {
        id: typeof item.id === "string" ? item.id : `room-${index + 1}`,
        name: typeof item.name === "string" ? item.name : `Stanza ${index + 1}`,
        type,
        x: clamp(Number(item.x) || 0, -20, 20),
        z: clamp(Number(item.z) || 0, -20, 20),
        width: clamp(Number(item.width) || 3, 1.4, 16),
        depth: clamp(Number(item.depth) || 3, 1.4, 16),
        height: clamp(Number(item.height) || 0.08, 0.04, 0.2),
        color: typeof item.color === "string" ? item.color : roomColors[type] ?? "#303136",
        furniture: furniture.slice(0, 12).map((furnitureItem, furnitureIndex) => {
          const piece = furnitureItem as Partial<Furniture3D>;
          return {
            id: typeof piece.id === "string" ? piece.id : `furniture-${index}-${furnitureIndex}`,
            type: typeof piece.type === "string" ? piece.type : "arredo",
            x: clamp(Number(piece.x) || 0, -7, 7),
            z: clamp(Number(piece.z) || 0, -7, 7),
            width: clamp(Number(piece.width) || 0.8, 0.2, 5),
            depth: clamp(Number(piece.depth) || 0.8, 0.2, 5),
            height: clamp(Number(piece.height) || 0.5, 0.05, 2.4),
            color: typeof piece.color === "string" ? piece.color : "#d7b98d",
            rotation: Number(piece.rotation) || 0,
          };
        }),
      };
    }),
    notes: Array.isArray(raw.notes) ? raw.notes.filter((note): note is string => typeof note === "string") : [],
    source: raw.source === "hugging-face" || raw.source === "local-fallback" ? raw.source : "browser-fallback",
  };
}
