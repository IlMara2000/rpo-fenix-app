import { IncomingForm } from 'formidable';
import fs from 'fs';
import axios from 'axios';

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
      // 1. GESTIONE FILE: Siccome Vercel blocca le librerie PDF, per ora forziamo solo immagini (PNG/JPG)
      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Formato non supportato su Vercel. Usa PNG o JPG (I PDF arriveranno presto!).' });
      }

      // 2. CONVERSIONE IN BASE64
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // 3. LA PAYLOAD API PER AUTOMATIC1111 CON CONTROLNET MLSD
      const sdPayload = {
        prompt: "Top-down view of a modern fully furnished apartment floor plan, photorealistic, 8k, interior design, highly detailed, architectural visualization, warm lighting",
        negative_prompt: "lowres, bad quality, sketchy, blurry, text, watermark, rough layout, empty room",
        steps: 25,
        width: 1024,
        height: 1024,
        cfg_scale: 7,
        alwayson_scripts: {
          controlnet: {
            args: [
              {
                input_image: base64Image,
                module: "mlsd", // Pre-processore MLSD (linee dritte, architettura)
                model: "control_v11p_sd15_mlsd", // <-- Assicurati che questo nome combaci con il tuo modello ControlNet
                weight: 1.0, // Fedeltà totale ai muri
                resize_mode: "Just Resize",
                control_mode: "Balanced"
              }
            ]
          }
        }
      };

      // 4. CHIAMATA ALL'API DI AUTOMATIC1111
      // ⚠️ ATTENZIONE: Dato che l'app gira in Cloud su Vercel, non può connettersi a 127.0.0.1.
      // Quando avvii Automatic1111 sul tuo PC, aggiungi gli argomenti: --api --share
      // Il terminale di Automatic1111 genererà un URL pubblico tipo: https://xxxxxx.gradio.live
      // INSERISCI QUEL LINK AL POSTO DI 127.0.0.1 (Lasciando /sdapi/v1/txt2img alla fine)
      const sdApiUrl = 'http://127.0.0.1:7860/sdapi/v1/txt2img'; 
      // Esempio: const sdApiUrl = 'https://12345abcdef.gradio.live/sdapi/v1/txt2img';

      const sdResponse = await axios.post(sdApiUrl, sdPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 // Timeout lungo (2 minuti) per dare tempo alla GPU di generare l'immagine
      });

      // 5. RESTITUZIONE AL FRONTEND
      // L'API restituisce un array 'images' con l'immagine finale in Base64
      const finalImageBase64 = sdResponse.data.images[0];

      res.status(200).json({ success: true, imageBase64: finalImageBase64 });

    } catch (error) {
      console.error("Errore Generazione:", error?.response?.data || error.message);
      res.status(500).json({ error: 'Errore di comunicazione con Automatic1111. Hai inserito il link Gradio e avviato il server locale?' });
    }
  });
}
