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

    const uploadedFile = files.file ? files.file[0] : null;
    if (!uploadedFile) return res.status(400).json({ error: 'Nessun file ricevuto' });

    try {
      // 1. CONTROLLO FORMATO
      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Formato non supportato. Usa PNG o JPG.' });
      }

      // Convertiamo l'immagine caricata in Base64 puro
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // Prendiamo la chiave magica di Prodia da Vercel
      const prodiaKey = process.env.PRODIA_KEY;
      if (!prodiaKey) {
        throw new Error("Manca la PRODIA_KEY su Vercel!");
      }

      // 2. INVIO DEL LAVORO A PRODIA (1.000 generazioni gratis)
      const createJobResponse = await fetch("https://api.prodia.com/v1/sd/transform", {
        method: "POST",
        headers: {
          "X-Prodia-Key": prodiaKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "realisticVisionV51_v51VAE.safetensors [38a1dba3]", 
          prompt: "Top-down view of a modern fully furnished apartment floor plan, photorealistic, 8k, interior design, highly detailed, architectural visualization, warm lighting, wooden floor, modern furniture",
          negative_prompt: "lowres, bad quality, sketchy, blurry, text, watermark, rough layout, empty room",
          imageData: base64Image,
          denoising_strength: 0.75, // 0.75 è il valore magico: mantiene l'ossatura originale e arreda
          steps: 25,
          cfg_scale: 7
        }),
      });

      if (!createJobResponse.ok) {
        const errorText = await createJobResponse.text();
        throw new Error(`Errore API Prodia: ${errorText}`);
      }

      const jobData = await createJobResponse.json();
      const jobId = jobData.job;

      // 3. ATTESA (Polling): Chiediamo a Prodia ogni 3 secondi se ha finito di generare
      let status = "queued";
      let finalImageUrl = null;

      while (status !== "succeeded" && status !== "failed") {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Aspetta 3 secondi

        const checkResponse = await fetch(`https://api.prodia.com/v1/job/${jobId}`, {
          headers: { "X-Prodia-Key": prodiaKey }
        });
        
        const checkData = await checkResponse.json();
        status = checkData.status;

        if (status === "succeeded") {
          finalImageUrl = checkData.imageUrl;
        }
      }

      if (status === "failed") {
        throw new Error("Il server di Prodia ha fallito la generazione dell'immagine.");
      }

      // 4. RESTITUZIONE AL FRONTEND: Mandiamo l'immagine finita alla tua app Fenix
      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("Errore Generazione Prodia:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}
