import { IncomingForm } from 'formidable';
import fs from 'fs';

// Disabilitiamo il body parser predefinito
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

      // Convertiamo l'immagine in Base64 (codice puro per Getimg)
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // Chiamiamo la chiave di Getimg da Vercel
      const getimgKey = process.env.GETIMG_KEY;
      if (!getimgKey) {
        throw new Error("Manca la GETIMG_KEY su Vercel!");
      }

      // CHIAMATA UFFICIALE A GETIMG.AI
      const response = await fetch("https://api.getimg.ai/v1/stable-diffusion/image-to-image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getimgKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "realistic-vision-v5-1", // Modello eccellente per l'architettura
          prompt: "Top-down view of a modern fully furnished apartment floor plan, photorealistic, 8k, interior design, highly detailed, architectural visualization, warm lighting, wooden floor, modern furniture",
          negative_prompt: "lowres, bad quality, sketchy, blurry, text, watermark, rough layout, empty room",
          image: base64Image, 
          strength: 0.75, // Mantiene i muri e cambia i mobili
          steps: 25,
          output_format: "jpeg"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore Server Getimg: ${errorText}`);
      }

      const data = await response.json();
      
      // Getimg restituisce l'immagine in base64. La formattiamo per la tua app.
      const finalImageUrl = `data:image/jpeg;base64,${data.image}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("Errore Generazione AI:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}
