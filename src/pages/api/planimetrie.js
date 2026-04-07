import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

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

    try {
      // 1. Lettura immagine e conversione
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // 2. Recupero URL Ngrok dal file di configurazione
      const configPath = path.join(process.cwd(), 'ngrok_config.json');
      let ngrokUrl = "";
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        ngrokUrl = JSON.parse(configData).url;
      } catch (e) {
        throw new Error("Ngrok non configurato. Assicurati che il Bottone 3 sia attivo sul Mac Mini.");
      }

      const apiUrl = `${ngrokUrl}/sdapi/v1/img2img`;

      // 3. PAYLOAD UNIFICATO: "LUXURY RENDER" + CONTROLLO MURI + HIRES FIX
      const payload = {
        "prompt": "high-end 3d floor plan render, luxurious modern apartment, fully furnished, architectural visualization, top-down view, soft natural sunlight, warm interior lighting, photorealistic, 8k resolution, cinematic lighting, scandinavian design, oak parquet flooring, marble kitchen counters, plush rugs, ultra-detailed furniture, professional photography style, v-ray render, unreal engine 5 style",
        "negative_prompt": "text, labels, letters, watermark, logo, signature, blurry, sketch, hand drawn, messy, deformed walls, lowres, bad quality, black and white, distorted furniture, cartoon, 2d, illustration, dark, grainy, noisy, cluttered, ugly curtains",
        "init_images": [base64Image],
        "denoising_strength": 0.60, // Bilanciamento per arredare senza distorcere i muri
        "steps": 40,               // Più passaggi per ombre e texture pulite
        "cfg_scale": 11,           // Maggiore fedeltà al look "Luxury" richiesto
        
        // --- SEZIONE ALTA RISOLUZIONE (HIRES FIX) ---
        "enable_hr": true,
        "hr_scale": 1.5,
        "hr_upscaler": "R-ESRGAN 4x+",
        "hr_second_pass_steps": 20, // Rifinitura extra per i portali immobiliari
        // --------------------------------------------

        "alwayson_scripts": {
          "controlnet": {
            "args": [
              {
                "input_image": base64Image,
                "model": "control_v11p_sd15_mlsd", 
                "module": "mlsd", 
                "weight": 1.5, // Forza massima sui muri originali
                "resize_mode": "Just Resize",
                "processor_res": 512,
                "control_mode": "ControlNet is more important", // Geometria prioritaria
                "pixel_perfect": true,
                "threshold_a": 0.1,
                "threshold_b": 0.1
              }
            ]
          }
        }
      };

      console.log("📡 Inviando richiesta 'Luxury Render' al Mac Mini M4...");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore dal Mac Mini: ${errorText}`);
      }

      const data = await response.json();
      
      // Estrazione della prima immagine dall'array restituito
      const finalImageUrl = `data:image/png;base64,${data.images[0]}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("ERRORE API PLANIMETRIE:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}