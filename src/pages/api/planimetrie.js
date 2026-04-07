import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp'; 

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Errore nel parsing del file' });

    const uploadedFile = files.file ? files.file[0] : null;
    if (!uploadedFile) return res.status(400).json({ error: 'Nessun file ricevuto' });

    // Recuperiamo lo stile se inviato, altrimenti forziamo il Top (modern_luxury)
    const styleChoice = Array.isArray(fields.style) ? fields.style[0] : fields.style || 'modern_luxury';

    try {
      // 1. Lettura immagine e conversione
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // 2. Recupero URL Ngrok
      const configPath = path.join(process.cwd(), 'ngrok_config.json');
      let ngrokUrl = "";
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        ngrokUrl = JSON.parse(configData).url;
      } catch (e) {
        throw new Error("Ngrok non configurato. Assicurati che il tunnel sia attivo sul Mac Mini.");
      }

      const apiUrl = `${ngrokUrl}/sdapi/v1/img2img`;

      // 3. DIZIONARIO DEGLI STILI (Il "Cervello" del Design)
      const stylePrompts = {
        modern_luxury: "luxurious modern apartment, scandinavian style, warm wooden oak floors, soft cinematic shadows",
        industrial_loft: "industrial loft, exposed brick walls, concrete floor, dark metal accents, dramatic moody lighting, leather furniture",
        classic_elegance: "classic elegant interior, polished marble floors, gold details, luxury classic furniture, bright natural light, ornate"
      };

      const selectedStylePrompt = stylePrompts[styleChoice] || stylePrompts['modern_luxury'];
      
      // PROMPT TOP DI GAMMA E NEGATIVE PROMPT BLINDATO
      const basePrompt = "high-end 3d architectural floor plan render, photorealistic, 8k, top-down view, fully furnished, professional interior design, clean white geometric walls, premium furniture, octane render";
      const fullPrompt = `${basePrompt}, ${selectedStylePrompt}`;
      
      const negativePrompt = "text, letters, labels, handwritten text, notes, dimensions, watermark, signature, logo, low quality, deformed walls, hand drawn sketch lines, background noise, door swings, window symbols, grainy, cluttered, messy, distorted furniture, open walls, black and white, lineart, drawing";

      // 4. PAYLOAD UNIFICATO: MASSIMO FOTOREALISMO + GABBIA CANNY 1.8
      const payload = {
        "prompt": fullPrompt,
        "negative_prompt": negativePrompt,
        "init_images": [base64Image],
        "denoising_strength": 0.95, // Massimo potere di trasformazione 3D
        "steps": 45,               
        "cfg_scale": 10,           
        "enable_hr": true,
        "hr_scale": 1.5,
        "hr_upscaler": "R-ESRGAN 4x+",
        "hr_second_pass_steps": 25,
        "alwayson_scripts": {
          "controlnet": {
            "args": [
              {
                "input_image": base64Image,
                "model": "control_v11p_sd15_canny", 
                "module": "canny",                
                "weight": 1.8, // Blindatura muri portanti                   
                "control_mode": "ControlNet is more important", 
                "processor_res": 512,
                "threshold_a": 100,               
                "threshold_b": 200,               
                "pixel_perfect": true
              }
            ]
          }
        }
      };

      console.log(`📡 Inviando richiesta 'Pure Photoreal' al Mac M4 (Mood: ${styleChoice})...`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore dal Mac Mini: ${errorText}`);
      }

      const data = await response.json();
      const baseImageBuffer = Buffer.from(data.images[0], 'base64');

      // 5. APPLICAZIONE WATERMARK AUTOMATICO CON SHARP
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      let finalBuffer;

      if (fs.existsSync(logoPath)) {
        console.log("🎨 Applicazione Watermark Fenix Group...");
        finalBuffer = await sharp(baseImageBuffer)
          .composite([{ 
            input: logoPath, 
            gravity: 'southeast', 
            blend: 'over',
            opacity: 0.5 
          }])
          .toBuffer();
      } else {
        console.warn("⚠️ Logo non trovato in public/logo.png - Procedo con render pulito.");
        finalBuffer = baseImageBuffer;
      }

      const finalImageUrl = `data:image/png;base64,${finalBuffer.toString('base64')}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("ERRORE API PLANIMETRIE:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}