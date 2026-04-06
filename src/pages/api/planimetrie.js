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
      // 1. Lettura immagine caricata dall'utente e conversione in Base64
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // 2. Recupero dell'URL Ngrok aggiornato dal file creato dal Bottone 3
      const configPath = path.join(process.cwd(), 'ngrok_config.json');
      let ngrokUrl = "";
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        ngrokUrl = JSON.parse(configData).url;
      } catch (e) {
        throw new Error("Ngrok non configurato. Assicurati che il Bottone 3 sia attivo sul Mac Mini.");
      }

      const apiUrl = `${ngrokUrl}/sdapi/v1/img2img`;

      // 3. CONFIGURAZIONE PAYLOAD: ARCHITETTURA + ALTA RISOLUZIONE
      const payload = {
        "prompt": "photorealistic 3d render of a modern fully furnished apartment, top down view, professional interior design, luxury furniture, oak wood flooring, soft cinematic lighting, architectural photography, 8k, highly detailed, sharp focus",
        "negative_prompt": "text, labels, watermark, logo, signature, blurry, sketch, hand drawn, messy, deformed walls, lowres, bad quality, black and white, distorted furniture",
        "init_images": [base64Image],
        "denoising_strength": 0.75, // Permette all'AI di arredare mantenendo la coerenza
        "steps": 30,               // Numero di passaggi per la qualità
        "cfg_scale": 7,            // Fedeltà al prompt testuale
        
        // --- SEZIONE ALTA RISOLUZIONE (HIRES FIX) ---
        "enable_hr": true,               // Attiva l'ingrandimento e rifinitura
        "hr_scale": 1.5,                 // Ingrandisce l'immagine per renderla nitida
        "hr_upscaler": "R-ESRGAN 4x+",   // Algoritmo di pulizia dettagli
        "hr_second_pass_steps": 15,      // Passaggi extra per la nitidezza
        // --------------------------------------------

        "alwayson_scripts": {
          "controlnet": {
            "args": [
              {
                "input_image": base64Image,
                "model": "control_v11p_sd15_mlsd", // Il modello MLSD che abbiamo installato
                "module": "mlsd",                // Il preprocessore per le linee dritte
                "weight": 1.1,                   // Forza del controllo geometrico (muri immobili)
                "resize_mode": "Just Resize",
                "control_mode": "ControlNet is more important", // La geometria vince sull'immaginazione
                "processor_res": 512,
                "threshold_a": 0.1,
                "threshold_b": 0.1
              }
            ]
          }
        }
      };

      console.log("📡 Inviando richiesta al Mac Mini M4 (ControlNet + Hires Fix)...");

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
      
      // Stable Diffusion restituisce un array di immagini (prendiamo la prima)
      const finalImageUrl = `data:image/png;base64,${data.images[0]}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("ERRORE API PLANIMETRIE:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}