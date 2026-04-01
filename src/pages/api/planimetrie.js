// src/pages/api/planimetrie.js
import { IncomingForm } from 'formidable';
import fs from 'fs';
import axios from 'axios';
import pdf2img from 'pdf-img-convert';

// Disabilitiamo il body parser predefinito di Next.js per poter gestire il file in ingresso
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Errore nel parsing del file' });

    const uploadedFile = files.file[0];
    if (!uploadedFile) return res.status(400).json({ error: 'Nessun file ricevuto' });

    try {
      let base64Image = '';

      // 1 & 2: GESTIONE FILE E CONVERSIONE IN BASE64
      if (uploadedFile.mimetype === 'application/pdf') {
        // Se è un PDF, convertiamo la prima pagina (page_numbers: [1]) in immagine
        const pdfArray = await pdf2img.convert(uploadedFile.filepath, {
          width: 1024,
          page_numbers: [1]
        });
        // Il risultato è un array di Uint8Array, lo trasformiamo in Base64
        base64Image = Buffer.from(pdfArray[0]).toString('base64');
      } else if (uploadedFile.mimetype.startsWith('image/')) {
        // Se è già un'immagine (PNG/JPG), leggiamo il file e lo convertiamo
        const fileData = fs.readFileSync(uploadedFile.filepath);
        base64Image = Buffer.from(fileData).toString('base64');
      } else {
        return res.status(400).json({ error: 'Formato file non supportato. Usa PDF, PNG o JPG.' });
      }

      // 3 & 4: LA PAYLOAD API PER AUTOMATIC1111 CON CONTROLNET MLSD
      const sdPayload = {
        prompt: "Top-down view of a modern fully furnished apartment floor plan, photorealistic, 8k, interior design, highly detailed, architectural visualization, warm lighting",
        negative_prompt": "lowres, bad quality, sketchy, blurry, text, watermark, rough layout, empty room",
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

      // 5: CHIAMATA ALL'API LOCALE DI AUTOMATIC1111 (http://127.0.0.1:7860)
      const sdResponse = await axios.post('http://127.0.0.1:7860/sdapi/v1/txt2img', sdPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 // Timeout lungo (2 minuti) per dare tempo alla scheda video di generare
      });

      // L'API restituisce un array 'images' con l'immagine finale in Base64
      const finalImageBase64 = sdResponse.data.images[0];

      // Restituiamo il Base64 al frontend
      res.status(200).json({ success: true, imageBase64: finalImageBase64 });

    } catch (error) {
      console.error("Errore Generazione:", error?.response?.data || error.message);
      res.status(500).json({ error: 'Errore durante la comunicazione con Automatic1111 o conversione file.' });
    }
  });
}
