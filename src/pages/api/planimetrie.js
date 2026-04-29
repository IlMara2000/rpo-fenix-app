import { IncomingForm } from 'formidable';
import fs from 'fs';
import sharp from 'sharp';

export const config = {
  api: { bodyParser: false },
};

export const maxDuration = 120;

const firstValue = (value) => Array.isArray(value) ? value[0] : value;

const getOutputSize = (width = 1, height = 1) => {
  const ratio = width / height;
  if (ratio > 1.18) return '1536x1024';
  if (ratio < 0.85) return '1024x1536';
  return '1024x1024';
};

const normalizeInput = async (fileBuffer) => sharp(fileBuffer)
  .rotate()
  .resize({
    width: 1536,
    height: 1536,
    fit: 'inside',
    withoutEnlargement: true,
    background: '#ffffff',
  })
  .flatten({ background: '#ffffff' })
  .png()
  .toBuffer();

const buildPrompt = () => `
Transform the uploaded real-estate floor plan into a clean, professionally furnished 2D architectural floor plan.

Critical requirements:
- Preserve the original apartment layout, room count, wall positions, doors, windows, and overall proportions.
- Do not invent new rooms and do not remove existing rooms.
- Keep a top-down 2D floor-plan view, not 3D, not perspective, not isometric.
- Furnish each room coherently according to visible Italian labels when present:
  sala/living -> sofa, coffee table, TV unit, rug;
  cucina -> kitchen counter, sink, hob, table if space allows;
  camera matrimoniale -> double bed, bedside tables, wardrobe;
  cameretta -> single bed or small desk and wardrobe;
  bagno -> sanitary fixtures, sink, shower or tub;
  ingresso/corridoio -> minimal console, runner, storage only if coherent.
- Furniture must stay inside the correct rooms and must not cover structural walls, measurements, or room labels when avoidable.
- Remove messy scanning artifacts and make the presentation polished, modern, readable, and suitable for a real-estate listing.
- Use elegant neutral materials, subtle floor textures, thin clean black/charcoal walls, and tasteful colored furniture.
- Final result should look like a high quality furnished 2D real-estate plan based on the uploaded plan.
`.trim();

const callOpenAIImageEdit = async ({ apiKey, imageBuffer, metadata }) => {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const quality = process.env.OPENAI_IMAGE_QUALITY || 'high';
  const size = getOutputSize(metadata.width, metadata.height);
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/png' });

  formData.append('model', model);
  formData.append('prompt', buildPrompt());
  formData.append('image[]', blob, 'planimetria.png');
  formData.append('size', size);
  formData.append('quality', quality);
  formData.append('output_format', 'png');
  formData.append('background', 'opaque');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
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
    const message = data?.error?.message || text;
    throw new Error(`OpenAI Images API: ${message}`);
  }

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI non ha restituito un PNG.');
  }

  return {
    buffer: Buffer.from(b64, 'base64'),
    model,
    quality,
    size,
    usage: data.usage || null,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Manca OPENAI_API_KEY. Aggiungila in .env.local e riavvia npm run dev.',
    });
  }

  const form = new IncomingForm({
    maxFileSize: 20 * 1024 * 1024,
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Errore nel caricamento del file' });
    }

    const uploadedFile = firstValue(files.file);
    if (!uploadedFile) {
      return res.status(400).json({ error: 'Nessun file ricevuto' });
    }

    try {
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const metadata = await sharp(fileData).metadata();
      const normalizedInput = await normalizeInput(fileData);
      const result = await callOpenAIImageEdit({
        apiKey,
        imageBuffer: normalizedInput,
        metadata,
      });

      const outputMetadata = await sharp(result.buffer).metadata();

      return res.status(200).json({
        success: true,
        imageUrl: `data:image/png;base64,${result.buffer.toString('base64')}`,
        meta: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          outputWidth: outputMetadata.width,
          outputHeight: outputMetadata.height,
          mode: 'openai-image-edit',
          model: result.model,
          quality: result.quality,
          requestedSize: result.size,
          usage: result.usage,
        },
      });
    } catch (error) {
      console.error('ERRORE API PLANIMETRIE:', error.message);
      return res.status(500).json({ error: error.message });
    }
  });
}
