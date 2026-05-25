import { InferenceClient } from "@huggingface/inference";

export const config = {
  maxDuration: 120,
};

const defaultModel = "Qwen/Qwen3-4B-Instruct-2507";

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const furnitureByRoom = (type) => {
  if (type === "soggiorno") {
    return [
      { id: "divano", type: "divano", x: -0.8, z: -0.35, width: 1.8, depth: 0.75, height: 0.55, color: "#b94949" },
      { id: "tavolo", type: "tavolino", x: 0.75, z: 0.35, width: 1.2, depth: 0.72, height: 0.42, color: "#d6b06d" },
    ];
  }
  if (type === "cucina") {
    return [
      { id: "blocco-cucina", type: "cucina", x: -0.8, z: -0.6, width: 2.1, depth: 0.62, height: 0.9, color: "#c9c1b3" },
      { id: "tavolo-pranzo", type: "tavolo", x: 0.65, z: 0.55, width: 1.25, depth: 0.82, height: 0.45, color: "#d6b06d" },
    ];
  }
  if (type === "camera") {
    return [
      { id: "letto", type: "letto", x: -0.55, z: 0.15, width: 1.7, depth: 2.0, height: 0.45, color: "#e7e3da" },
      { id: "armadio", type: "armadio", x: 1.08, z: -0.78, width: 0.68, depth: 1.7, height: 1.9, color: "#8f969f" },
    ];
  }
  if (type === "bagno") {
    return [
      { id: "doccia", type: "doccia", x: -0.55, z: -0.45, width: 0.86, depth: 0.86, height: 1.95, color: "#93c5fd" },
      { id: "sanitari", type: "sanitari", x: 0.55, z: 0.48, width: 0.92, depth: 0.52, height: 0.48, color: "#f4f7f8" },
    ];
  }
  if (type === "studio") {
    return [
      { id: "scrivania", type: "scrivania", x: -0.35, z: -0.4, width: 1.35, depth: 0.72, height: 0.74, color: "#d7b98d" },
    ];
  }
  return [];
};

const createFallbackPlan = (body, source = "local-fallback") => {
  const prompt = String(body.prompt || "");
  const text = prompt.toLowerCase();
  const area = clamp(Number(body.areaSqm) || 90, 35, 260);
  const roomCount = clamp(Number(body.roomCount) || 6, 4, 12);
  const rooms = ["ingresso", "soggiorno", "cucina", "bagno"];
  const bedrooms = text.includes("quadrilocale") ? 3 : text.includes("trilocale") ? 2 : 1;

  for (let index = 0; index < bedrooms; index += 1) rooms.push("camera");
  if (text.includes("studio")) rooms.push("studio");
  if (text.includes("lavanderia")) rooms.push("lavanderia");
  if (text.includes("terrazzo") || text.includes("balcone")) rooms.push("terrazzo");

  const selectedRooms = rooms.slice(0, roomCount);
  const totalWidth = clamp(Math.sqrt(area) * 1.22, 7.6, 22);
  const totalDepth = clamp(area / totalWidth, 6.2, 18);
  const firstRow = Math.ceil(selectedRooms.length / 2);
  const rows = [selectedRooms.slice(0, firstRow), selectedRooms.slice(firstRow)].filter((row) => row.length);
  const rowDepth = totalDepth / rows.length;
  const colors = {
    ingresso: "#34343a",
    soggiorno: "#293242",
    cucina: "#3a2f27",
    bagno: "#203b3f",
    camera: "#2b344f",
    studio: "#332c49",
    terrazzo: "#344535",
    lavanderia: "#273a36",
  };

  return {
    title: prompt.trim() ? "Planimetria 3D generata" : "Nuova planimetria 3D",
    style: body.style || "premium",
    width: Number(totalWidth.toFixed(2)),
    depth: Number(totalDepth.toFixed(2)),
    wallHeight: 2.75,
    wallThickness: 0.14,
    rooms: rows.flatMap((row, rowIndex) => {
      const roomWidth = totalWidth / row.length;
      return row.map((type, colIndex) => ({
        id: `${type}-${rowIndex}-${colIndex}`,
        name: `${type.charAt(0).toUpperCase()}${type.slice(1)}`,
        type,
        x: Number((-totalWidth / 2 + roomWidth * colIndex + roomWidth / 2).toFixed(2)),
        z: Number((-totalDepth / 2 + rowDepth * rowIndex + rowDepth / 2).toFixed(2)),
        width: Number(Math.max(1.8, roomWidth - 0.18).toFixed(2)),
        depth: Number(Math.max(1.8, rowDepth - 0.18).toFixed(2)),
        height: 0.08,
        color: colors[type] || "#303136",
        furniture: furnitureByRoom(type),
      }));
    }),
    notes: ["Fallback locale attivo: configura HF_TOKEN per abilitare Hugging Face."],
    source,
  };
};

const extractJson = (text) => {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Il modello non ha restituito JSON valido.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
};

const buildMessages = (body) => [
  {
    role: "system",
    content: [
      "You generate structured JSON for a real-estate 3D floor plan renderer.",
      "Return only valid JSON. No markdown. No comments.",
      "Coordinates are meters, centered around 0 on x/z. Keep rooms rectangular and adjacent.",
      "Use Italian room names. Max 12 rooms. Furniture coordinates are relative to the room center.",
      "Required root fields: title, style, width, depth, wallHeight, wallThickness, rooms, notes, source.",
      "Each room needs: id, name, type, x, z, width, depth, height, color, furniture.",
      "Each furniture item needs: id, type, x, z, width, depth, height, color, optional rotation.",
    ].join(" "),
  },
  {
    role: "user",
    content: `Create a practical 3D floor plan layout for this Italian real-estate request:
Prompt: ${body.prompt || "appartamento residenziale"}
Style: ${body.style || "premium"}
Approx area sqm: ${body.areaSqm || 90}
Desired room count: ${body.roomCount || 6}`,
  },
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const body = await readJsonBody(req);
    const token = process.env.HF_TOKEN;
    const model = process.env.HF_3D_MODEL || defaultModel;

    if (!token) {
      return res.status(200).json({
        success: true,
        plan: createFallbackPlan(body),
        meta: {
          mode: "local-fallback",
          model: "fallback",
          reason: "HF_TOKEN assente",
        },
      });
    }

    try {
      const client = new InferenceClient(token);
      const completion = await client.chatCompletion({
        model,
        messages: buildMessages(body),
        max_tokens: 1600,
        temperature: 0.18,
      });
      const content = completion?.choices?.[0]?.message?.content || "";
      const plan = extractJson(content);

      return res.status(200).json({
        success: true,
        plan: {
          ...plan,
          source: "hugging-face",
        },
        meta: {
          mode: "hugging-face",
          model,
        },
      });
    } catch (error) {
      return res.status(200).json({
        success: true,
        plan: createFallbackPlan(body),
        meta: {
          mode: "local-fallback",
          model,
          error: error instanceof Error ? error.message : "Errore Hugging Face",
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Errore generazione planimetria 3D.",
    });
  }
}
