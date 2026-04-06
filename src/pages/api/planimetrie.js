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
        throw new Error("Ngrok non configurato. Assicurati che il Bottone 3 sia attivo sul Mac.");
      }

      const apiUrl = `${ngrokUrl}/sdapi/v1/img2img`;

      // 3. PAYLOAD POTENZIATO CON CONTROLNET (MLSD)
      const payload = {
        "prompt": "photorealistic 3d render of a modern furnished apartment, top down view, professional interior design, high quality, highly detailed, octane render, 8k, architectural lighting, wooden floors",
        "negative_prompt": "text, labels, watermark, logo, blurry, sketch, hand drawn, messy, deformed walls, lowres, bad quality, black and white",
        "init_images": [base64Image],
        "denoising_strength": 0.75, // Bilanciamento tra originalità e ricalco
        "steps": 30,
        "cfg_scale": 7,
        "alwayson_scripts": {
          "controlnet": {
            "args": [
              {
                "input_image": base64Image,
                "model": "control_v11p_sd15_mlsd", // Il file .pth che hai appena messo nella cartella
                "module": "mlsd", // Il motore che estrae le linee dritte
                "weight": 1.1, // Forza dell'architetto (sopra 1.0 i muri sono blindati)
                "resize_mode": "Just Resize",
                "lowvram": false,
                "processor_res": 512,
                "threshold_a": 0.1,
                "threshold_b": 0.1,
                "guidance_start": 0.0,
                "guidance_end": 1.0,
                "control_mode": "ControlNet is more important" // Priorità assoluta alla geometria
              }
            ]
          }
        }
      };

      console.log("📡 Inviando richiesta con ControlNet al Mac Mini...");

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
        throw new Error(`Errore dal server locale: ${errorText}`);
      }

      const data = await response.json();
      const finalImageUrl = `data:image/png;base64,${data.images[0]}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("ERRORE API:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}