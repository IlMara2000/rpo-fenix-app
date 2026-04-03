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

      // 1. LA TUA CHIAVE AL SICURO (La pesca da Vercel)
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Manca la GEMINI_API_KEY su Vercel!");
      }

      // 2. CHIAMATA A GOOGLE GEMINI API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "Act as an expert interior designer. I am providing a top-down floor plan. Please return a photorealistic, fully furnished, 8k, modern luxury interior design version of this exact same layout. Keep the walls exactly where they are." },
                {
                  inline_data: {
                    mime_type: uploadedFile.mimetype,
                    data: base64Image
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Errore API Google: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Catturiamo la risposta del modello
      const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // 3. CONTROLLO OUTPUT
      // Siccome le API gratuite di Google spesso rispondono a parole invece di restituire il file grafico puro,
      // controlliamo se il risultato è effettivamente un'immagine (Base64 o URL)
      if (!generatedContent.startsWith("data:image") && !generatedContent.startsWith("http")) {
         throw new Error("Il server di Google ha analizzato la planimetria ma ha risposto con del testo. L'API gratuita standard potrebbe non avere i permessi per sputare fuori il file grafico modificato.");
      }

      // RESTITUZIONE AL FRONTEND
      res.status(200).json({ success: true, imageUrl: generatedContent });

    } catch (error) {
      console.error("Errore Generazione Google:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}
