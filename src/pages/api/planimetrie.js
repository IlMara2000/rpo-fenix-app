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
      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Formato non supportato. Usa PNG o JPG.' });
      }

      // Convertiamo l'immagine caricata in Base64
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // Prendiamo la chiave magica di Hugging Face da Vercel
      const hfToken = process.env.HF_TOKEN;
      if (!hfToken) {
        throw new Error("Manca l'HF_TOKEN su Vercel!");
      }

      // CHIAMATA A HUGGING FACE (Nuovo server Router aggiornato!)
      const response = await fetch("https://router.huggingface.co/hf-inference/models/timbrooks/instruct-pix2pix", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "turn this floor plan into a photorealistic modern fully furnished apartment layout, 8k, interior design, warm lighting",
          image: base64Image
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Gestione del "Cold Start" (Server addormentato per risparmiare energia)
        if (errorData.error && errorData.error.includes("is currently loading")) {
          throw new Error("Il server AI si stava riposando e si sta accendendo ora. Riprova tra 30 secondi!");
        }
        throw new Error(`Errore Hugging Face: ${errorData.error || response.statusText}`);
      }

      // Hugging Face restituisce l'immagine "fisica" (buffer binario), la trasformiamo per il frontend
      const arrayBuffer = await response.arrayBuffer();
      const finalBase64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUri = `data:image/jpeg;base64,${finalBase64}`;

      // RESTITUZIONE AL FRONTEND
      res.status(200).json({ success: true, imageUrl: dataUri });

    } catch (error) {
      console.error("Errore Generazione Hugging Face:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}
