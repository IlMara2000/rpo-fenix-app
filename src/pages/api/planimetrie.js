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

      // 2. CONVERSIONE IN DATA URI (Per Fal.ai)
      // Fal.ai ha bisogno che il base64 sia formattato come "Data URI" per capire che è un'immagine
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');
      const dataUri = `data:${uploadedFile.mimetype};base64,${base64Image}`;

      // 3. CHIAMATA A FAL.AI (Il nostro nuovo super computer nel cloud)
      // Uso fal.run invece di queue.fal.run per avere la risposta diretta (sincrona)
      const response = await fetch("https://fal.run/fal-ai/controlnet-general", {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Top-down view of a modern fully furnished apartment floor plan, photorealistic, 8k, interior design, highly detailed, architectural visualization, warm lighting",
          negative_prompt: "lowres, bad quality, sketchy, blurry, text, watermark, rough layout, empty room",
          control_image_url: dataUri, // L'immagine formattata passata al cloud
          control_net_name: "mlsd",   // Il modulo magico per le linee dritte dei muri
          image_size: "square_hd",
          num_inference_steps: 30,
          guidance_scale: 7.5,
        }),
      });

      // Gestione errori del server cloud
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore API Fal.ai: ${errorText}`);
      }

      const data = await response.json();
      
      // 4. RESTITUZIONE AL FRONTEND
      // Fal.ai ci restituisce un link pubblico (URL) dell'immagine finale
      const finalImageUrl = data.images[0].url;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("Errore Generazione Cloud:", error.message);
      res.status(500).json({ error: 'Errore durante la generazione della planimetria nel cloud.' });
    }
  });
}
