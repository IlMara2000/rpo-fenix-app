import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

// Disabilitiamo il body parser predefinito di Next.js
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
      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Formato non supportato. Usa PNG o JPG.' });
      }

      // 1. Convertiamo l'immagine in Base64
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // 2. LEGGIAMO IL LINK FRESCO DI NGROK CREATO DAL BOTTONE 3
      // process.cwd() assicura che trovi il file json partendo dalla root del progetto
      const configPath = path.join(process.cwd(), 'ngrok_config.json');
      let ngrokUrl = "";
      
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        ngrokUrl = JSON.parse(configData).url;
      } catch (e) {
        throw new Error("File ngrok_config.json non trovato. Hai premuto il Bottone 3?");
      }

      const apiUrl = `${ngrokUrl}/sdapi/v1/img2img`;
      console.log(`🚀 Inviando lavoro al Mac Mini M4: ${apiUrl}`);

      // 3. CHIAMATA DIRETTA AL TUO MAC (Niente più Prodia o Getimg!)
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          prompt: "Top-down view of a modern fully furnished apartment floor plan, photorealistic, 8k, interior design, highly detailed, architectural visualization, warm lighting, wooden floor, modern furniture",
          negative_prompt: "lowres, bad quality, sketchy, blurry, text, watermark, rough layout, empty room",
          init_images: [base64Image],
          denoising_strength: 0.75, // Mantiene i muri e cambia i mobili
          steps: 25
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Il Mac Mini ha risposto con un errore: ${errorText}`);
      }

      // 4. PRENDIAMO IL RISULTATO DAL MAC E LO MANDIAMO ALL'APP
      const data = await response.json();
      const finalImageUrl = `data:image/png;base64,${data.images[0]}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("Errore Generazione AI Locale:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}