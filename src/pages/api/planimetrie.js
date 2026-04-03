import { IncomingForm } from 'formidable';
import fs from 'fs';

// Disabilitiamo il body parser predefinito di Next.js per poter gestire il file in ingresso
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Errore nel parsing del file' });

    // Sicurezza: controlla che files.file esista
    const uploadedFile = files.file ? files.file[0] : null;
    if (!uploadedFile) return res.status(400).json({ error: 'Nessun file ricevuto' });

    try {
      // 1. GESTIONE FILE: Solo immagini (PNG/JPG)
      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Formato non supportato. Usa PNG o JPG.' });
      }

      // 2. CONVERSIONE IN BASE64 PURO (Per Getimg.ai)
      // Getimg non vuole il prefisso "data:image...", vuole solo il codice puro
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // 3. CHIAMATA A GETIMG.AI (La soluzione 100% gratuita, 100 crediti/mese)
      const response = await fetch("https://api.getimg.ai/v1/stable-diffusion/image-to-image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GETIMG_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "realistic-vision-v5-1", // Modello eccellente per il fotorealismo architettonico
          prompt: "Top-down view of a modern fully furnished apartment floor plan, photorealistic, 8k, interior design, highly detailed, architectural visualization, warm lighting, wooden floor, modern furniture",
          negative_prompt: "lowres, bad quality, sketchy, blurry, text, watermark, rough layout, empty room",
          image: base64Image, 
          strength: 0.75, // 0.75 mantiene l'ossatura originale della planimetria
          steps: 25,
          output_format: "jpeg"
        }),
      });

      // Gestione errori del server cloud
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore API Getimg: ${errorText}`);
      }

      const data = await response.json();
      
      // 4. RESTITUZIONE AL FRONTEND
      // Getimg restituisce l'immagine in base64 puro. La formattiamo come Data URI per il frontend
      const finalImageUrl = `data:image/jpeg;base64,${data.image}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("Errore Generazione Cloud:", error.message);
      res.status(500).json({ error: 'Errore durante la generazione della planimetria nel cloud.' });
    }
  });
}
