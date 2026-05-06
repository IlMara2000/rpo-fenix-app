export const config = {
  maxDuration: 120,
};

const buildPrompt = () => `
Transform the uploaded real-estate floor plan into a clean, professionally furnished 2D architectural floor plan.

Critical requirements:
- Preserve the original apartment layout, room count, wall positions, doors, windows, and overall proportions.
- Do not invent new rooms and do not remove existing rooms.
- Keep a top-down 2D floor-plan view, not 3D, not perspective, not isometric.
- Furnish each room coherently according to visible Italian labels when present.
- Furniture must stay inside the correct rooms and must not cover structural walls, measurements, or room labels when avoidable.
- Remove messy scanning artifacts and make the presentation polished, modern, readable, and suitable for a real-estate listing.
- Use elegant neutral materials, subtle floor textures, thin clean black or charcoal walls, and tasteful colored furniture.
- Final result should look like a high quality furnished 2D real-estate plan based on the uploaded plan.
`.trim();

const getOutputSize = (width = 1, height = 1) => {
  const ratio = width / height;
  if (ratio > 1.18) return "1536x1024";
  if (ratio < 0.85) return "1024x1536";
  return "1024x1024";
};

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

const dataUrlToBuffer = (dataUrl) => {
  const match = /^data:image\/(?:png|jpeg|jpg|webp);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) {
    throw new Error("Formato immagine non valido.");
  }
  return Buffer.from(match[1], "base64");
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Manca OPENAI_API_KEY nelle variabili ambiente Vercel.",
    });
  }

  try {
    const body = await readJsonBody(req);
    const imageBuffer = dataUrlToBuffer(body.image);
    const width = Number(body.width) || 1024;
    const height = Number(body.height) || 1024;
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
    const quality = process.env.OPENAI_IMAGE_QUALITY || "high";
    const requestedSize = getOutputSize(width, height);
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });

    formData.append("model", model);
    formData.append("prompt", buildPrompt());
    formData.append("image[]", imageBlob, "planimetria.png");
    formData.append("size", requestedSize);
    formData.append("quality", quality);
    formData.append("output_format", "png");
    formData.append("background", "opaque");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Risposta OpenAI non valida: ${text.slice(0, 300)}`);
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || text);
    }

    const base64 = data?.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("OpenAI non ha restituito un PNG.");
    }

    return res.status(200).json({
      success: true,
      imageUrl: `data:image/png;base64,${base64}`,
      meta: {
        originalWidth: width,
        originalHeight: height,
        mode: "openai-image-edit",
        model,
        quality,
        requestedSize,
        usage: data.usage || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Errore generazione planimetria.",
    });
  }
}
