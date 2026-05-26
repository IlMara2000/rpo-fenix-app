import { InferenceClient } from "@huggingface/inference";

export const config = {
  maxDuration: 120,
};

const defaultModel = "Qwen/Qwen3-4B-Instruct-2507";
const defaultVisionModel = "Qwen/Qwen3-VL-4B-Instruct";
const defaultImageModels = [
  "black-forest-labs/FLUX.2-dev",
  "Qwen/Qwen-Image-Edit",
  "black-forest-labs/FLUX.1-Kontext-dev",
  "black-forest-labs/FLUX.2-klein-4B",
];
const defaultImageToImageModels = ["timbrooks/instruct-pix2pix", "lllyasviel/sd-controlnet-depth"];
const defaultTextToImageModels = ["black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0"];

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

const isImageDataUrl = (value) => /^data:image\/(?:png|jpe?g|webp);base64,/i.test(String(value || ""));

const buildUserPrompt = (body, hasImage) =>
  [
    `Prompt: ${body.prompt || "appartamento residenziale"}`,
    hasImage ? `Uploaded floor-plan image: ${body.imageName || "planimetria"} ${body.imageWidth || ""}x${body.imageHeight || ""}` : "",
    `Style: ${body.style || "premium"}`,
    `Approx area sqm: ${body.areaSqm || 90}`,
    `Desired room count: ${clamp(Number(body.roomCount) || 6, 4, 10)}`,
    "Task: infer a practical furnished relief layout from the uploaded image and notes. The browser will render a 3D relief overlay on top of the same 2D plan and export a final JPG.",
    "Return exactly one JSON object shaped like:",
    "{\"title\":\"...\",\"style\":\"premium\",\"width\":10,\"depth\":9,\"wallHeight\":2.75,\"wallThickness\":0.14,\"rooms\":[{\"id\":\"r1\",\"name\":\"Soggiorno\",\"type\":\"soggiorno\",\"x\":0,\"z\":0,\"width\":4,\"depth\":4,\"height\":0.08,\"color\":\"#293242\",\"furniture\":[{\"id\":\"f1\",\"type\":\"divano\",\"x\":0,\"z\":0,\"width\":1.8,\"depth\":0.75,\"height\":0.55,\"color\":\"#b94949\"}]}],\"notes\":[\"Layout AI\"],\"source\":\"hugging-face\"}",
  ]
    .filter(Boolean)
    .join("\n");

const buildMessages = (body, hasImage) => {
  const userPrompt = buildUserPrompt(body, hasImage);
  return [
    {
      role: "system",
      content: [
        "Return minified valid JSON only. No markdown. No explanation.",
        "Build a compact 3D real-estate floor-plan layout for a browser renderer.",
        "Coordinates are meters, centered on x/z 0. Rectangular adjacent rooms only.",
        "Root keys: title, style, width, depth, wallHeight, wallThickness, rooms, notes, source.",
        "Room keys: id, name, type, x, z, width, depth, height, color, furniture.",
        "Furniture keys: id, type, x, z, width, depth, height, color.",
        "Use short IDs, Italian room names, hex colors, max two furniture items per room.",
        "Do not include nulls, prose, measurements text, comments, duplicate keys, or trailing commas.",
      ].join(" "),
    },
    {
      role: "user",
      content: hasImage
        ? [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: body.image,
              },
            },
          ]
        : userPrompt,
    },
  ];
};

const buildRenderPrompt = (body) =>
  [
    "Create a single top-down floor-plan image in Italian real-estate style.",
    "Use the uploaded plan as fixed base layout: keep walls, openings and room labels geometry coherent.",
    "Apply a subtle 3D relief effect directly over the 2D plan (no perspective room scene, no free 3D environment).",
    "Add clean furniture hints proportional to room size, photoreal lighting not required.",
    "Output must be one high-quality JPG-ready image for brochure use.",
    `Style: ${body.style || "premium"}.`,
    `Notes: ${body.prompt || "Planimetria residenziale"}.`,
  ].join(" ");

const blobToDataUrl = async (blob) => {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const mime = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

const dataUrlToBlob = async (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Immagine base64 non valida.");
  }
  return new Blob([Buffer.from(match[2], "base64")], { type: match[1] });
};

const shortError = (error) => {
  const message = error instanceof Error ? error.message : String(error || "errore sconosciuto");
  return message.replace(/\s+/g, " ").slice(0, 260);
};

const renderErrorMessage = (error) => {
  const message = error instanceof Error ? error.message : String(error || "errore sconosciuto");
  return message.replace(/\s+/g, " ").slice(0, 1400);
};

const generateRenderImage = async (client, body) => {
  const prompt = buildRenderPrompt(body);
  const parameters = {
    prompt,
    negative_prompt:
      "free camera 3d scene, first person view, blue technical wireframe, random boxes, unreadable plan, distorted floorplan, extra rooms, exterior render",
    num_inference_steps: 28,
    guidance_scale: 5.8,
    target_size: { width: 1280, height: 900 },
  };
  const errors = [];
  const preferredModel = process.env.HF_3D_IMAGE_MODEL;
  const imageTextModels = [preferredModel, ...defaultImageModels].filter(Boolean);

  for (const model of defaultTextToImageModels) {
    try {
      const blob = await client.textToImage({
        model,
        inputs: `${prompt} Top-down furnished real-estate floor plan, 2D plan relief overlay, clean architectural brochure image.`,
        parameters: {
          negative_prompt: parameters.negative_prompt,
          num_inference_steps: 24,
          guidance_scale: 4.5,
          width: 1280,
          height: 900,
        },
      });
      return { image: await blobToDataUrl(blob), model, task: "text-to-image" };
    } catch (error) {
      errors.push(`${model}: ${shortError(error)}`);
    }
  }

  const sourceBlob = await dataUrlToBlob(body.image);

  for (const model of imageTextModels) {
    try {
      const blob = await client.imageTextToImage({
        model,
        inputs: sourceBlob,
        parameters,
      });
      return { image: await blobToDataUrl(blob), model, task: "image-text-to-image" };
    } catch (error) {
      errors.push(`${model}: ${shortError(error)}`);
    }
  }

  for (const model of [...imageTextModels, ...defaultImageToImageModels]) {
    try {
      const blob = await client.imageToImage({
        provider: "replicate",
        model,
        inputs: sourceBlob,
        parameters,
      });
      return { image: await blobToDataUrl(blob), model, task: "image-to-image" };
    } catch (error) {
      errors.push(`${model}: ${shortError(error)}`);
    }
  }

  throw new Error(errors.slice(-4).join(" | "));
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const body = await readJsonBody(req);
    const token = process.env.HF_TOKEN;
    const hasImage = isImageDataUrl(body.image);
    const model = hasImage
      ? process.env.HF_3D_VISION_MODEL || defaultVisionModel
      : process.env.HF_3D_MODEL || defaultModel;

    if (!token) {
      return res.status(200).json({
        success: true,
        plan: createFallbackPlan(body),
        meta: {
          mode: "local-fallback",
          model: "fallback",
          usedImage: hasImage,
          reason: "HF_TOKEN assente",
        },
      });
    }

    const client = new InferenceClient(token);
    let activeModel = model;
    let plan = createFallbackPlan(body, "layout-fallback");
    let planError = null;
    let visionRetryError = null;

    try {
      let completion;
      try {
        completion = await client.chatCompletion({
          model: activeModel,
          messages: buildMessages(body, hasImage),
          max_tokens: 3200,
          temperature: 0.05,
        });
      } catch (error) {
        if (!hasImage) {
          throw error;
        }

        visionRetryError = shortError(error);
        activeModel = process.env.HF_3D_MODEL || defaultModel;
        completion = await client.chatCompletion({
          model: activeModel,
          messages: buildMessages(
            {
              ...body,
              prompt: [
                "L'utente ha caricato una planimetria immagine.",
                `Nome immagine: ${body.imageName || "planimetria"}.`,
                `Dimensioni immagine: ${body.imageWidth || "?"}x${body.imageHeight || "?"}.`,
                body.prompt || "Genera un layout residenziale coerente partendo dalle note disponibili.",
              ].join("\n"),
            },
            false,
          ),
          max_tokens: 3200,
          temperature: 0.05,
        });
      }

      const content = completion?.choices?.[0]?.message?.content || "";
      plan = {
        ...extractJson(content),
        source: "hugging-face",
      };
    } catch (error) {
      planError = shortError(error);
    }

    let renderImage = null;
    let renderError = null;
    let imageModel = null;
    let imageTask = null;
    if (hasImage) {
      try {
        const render = await generateRenderImage(client, body);
        renderImage = render.image;
        imageModel = render.model;
        imageTask = render.task;
      } catch (error) {
        renderError = renderErrorMessage(error);
      }
    }

    return res.status(200).json({
      success: true,
      plan,
      renderImage,
      meta: {
        mode: renderImage || plan.source === "hugging-face" ? "hugging-face" : "local-fallback",
        model: activeModel,
        imageModel,
        imageTask,
        renderError,
        planError,
        usedImage: hasImage,
        visionRetry: Boolean(visionRetryError),
        visionError: visionRetryError,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Errore generazione planimetria 3D.",
    });
  }
}
