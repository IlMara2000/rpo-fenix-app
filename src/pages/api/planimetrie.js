import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp'; 

export const config = {
  api: { bodyParser: false },
};

export const maxDuration = 60; 

const MAX_RENDER_SIDE = 768;
const MIN_RENDER_SIDE = 384;
const REQUEST_TIMEOUT_MS = 120000;

const firstValue = (value) => Array.isArray(value) ? value[0] : value;

const roundToMultiple = (value, multiple) => Math.max(
  MIN_RENDER_SIDE,
  Math.min(MAX_RENDER_SIDE, Math.round(value / multiple) * multiple)
);

const getRenderSize = (width, height) => {
  if (!width || !height) {
    return { width: MAX_RENDER_SIDE, height: MAX_RENDER_SIDE };
  }

  const ratio = width / height;
  if (ratio >= 1) {
    return {
      width: MAX_RENDER_SIDE,
      height: roundToMultiple(MAX_RENDER_SIDE / ratio, 64),
    };
  }

  return {
    width: roundToMultiple(MAX_RENDER_SIDE * ratio, 64),
    height: MAX_RENDER_SIDE,
  };
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const form = new IncomingForm({
    maxFileSize: 15 * 1024 * 1024,
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Errore nel parsing del file' });

    const uploadedFile = firstValue(files.file);
    if (!uploadedFile) return res.status(400).json({ error: 'Nessun file ricevuto' });

    const styleChoice = firstValue(fields.style) || 'modern_luxury';

    try {
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const metadata = await sharp(fileData).metadata();
      const renderSize = getRenderSize(metadata.width, metadata.height);

      const normalizedInput = await sharp(fileData)
        .resize({
          width: renderSize.width,
          height: renderSize.height,
          fit: 'fill',
        })
        .png()
        .toBuffer();

      const base64Image = normalizedInput.toString('base64');

      const configPath = path.join(process.cwd(), 'ngrok_config.json');
      let ngrokUrl = "";
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        ngrokUrl = JSON.parse(configData).url;
      } catch (e) {
        throw new Error("Ngrok non configurato. Assicurati che il tunnel sia attivo sul Mac Mini.");
      }

      const apiUrl = `${ngrokUrl}/sdapi/v1/img2img`;

      const stylePrompts = {
        modern_luxury: "modern premium apartment floor plan, warm oak floors, elegant neutral furniture, refined real estate presentation",
        industrial_loft: "industrial loft floor plan, concrete texture, black metal accents, leather furniture, refined moody interior design",
        classic_elegance: "classic elegant apartment floor plan, marble details, warm classic furniture, bright premium real estate presentation"
      };

      const selectedStylePrompt = stylePrompts[styleChoice] || stylePrompts['modern_luxury'];
      
      const basePrompt = "strictly 2D top-down architectural floor plan, preserve original room layout and wall geometry, fully furnished, clean real estate plan render, premium interior design, sharp walls, no perspective";
      const fullPrompt = `${basePrompt}, ${selectedStylePrompt}`;
      
      const negativePrompt = "3D, perspective, isometric, angled view, camera view, ceiling, sky, exterior photo, room photo, deformed walls, changed layout, extra rooms, missing rooms, text, labels, handwritten notes, dimensions, watermark, signature, logo, blurry, low quality, cluttered";

      const payload = {
        prompt: fullPrompt,
        negative_prompt: negativePrompt,
        init_images: [base64Image],
        sampler_name: "Euler",
        scheduler: "Automatic",
        denoising_strength: 0.58,
        steps: 32,
        cfg_scale: 7,
        width: renderSize.width,
        height: renderSize.height,
        resize_mode: 0,
        enable_hr: false,
        alwayson_scripts: {
          controlnet: {
            args: [
              {
                image: base64Image,
                model: "control_v11p_sd15_canny",
                module: "canny",
                weight: 1.35,
                control_mode: "ControlNet is more important",
                processor_res: Math.min(renderSize.width, renderSize.height),
                threshold_a: 80,
                threshold_b: 180,
                pixel_perfect: true
              }
            ]
          }
        }
      };

      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore dal Mac Mini: ${errorText}`);
      }

      const data = await response.json();
      if (!data.images?.[0]) {
        throw new Error("Il Mac Mini non ha restituito nessuna immagine.");
      }

      const baseImageBuffer = Buffer.from(data.images[0], 'base64');

      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      let finalBuffer;

      if (fs.existsSync(logoPath)) {
        const logoWidth = Math.max(120, Math.round(renderSize.width * 0.2));
        const resizedLogoBuffer = await sharp(logoPath)
          .resize({ width: logoWidth })
          .toBuffer();

        finalBuffer = await sharp(baseImageBuffer)
          .resize({
            width: renderSize.width,
            height: renderSize.height,
            fit: 'fill',
          })
          .composite([{ 
            input: resizedLogoBuffer, 
            gravity: 'southeast', 
            blend: 'over',
          }])
          .png()
          .toBuffer();
      } else {
        finalBuffer = await sharp(baseImageBuffer)
          .resize({
            width: renderSize.width,
            height: renderSize.height,
            fit: 'fill',
          })
          .png()
          .toBuffer();
      }

      const finalImageUrl = `data:image/png;base64,${finalBuffer.toString('base64')}`;

      res.status(200).json({
        success: true,
        imageUrl: finalImageUrl,
        meta: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          outputWidth: renderSize.width,
          outputHeight: renderSize.height,
          style: styleChoice
        }
      });

    } catch (error) {
      console.error("ERRORE API PLANIMETRIE:", error.message);
      const message = error.name === 'AbortError'
        ? 'Timeout: il Mac Mini non ha risposto in tempo.'
        : error.message;
      res.status(500).json({ error: message });
    }
  });
}
