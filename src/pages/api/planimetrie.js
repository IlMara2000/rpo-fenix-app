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

    // Recuperiamo lo stile dal frontend (con fallback sul moderno in caso di errore)
    const styleChoice = Array.isArray(fields.style) ? fields.style[0] : fields.style || 'modern_luxury';

    try {
      // 1. Lettura immagine e conversione
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

      // 2. Recupero URL Ngrok dal file di configurazione
      const configPath = path.join(process.cwd(), 'ngrok_config.json');
      let ngrokUrl = "";
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        ngrokUrl = JSON.parse(configData).url;
      } catch (e) {
        throw new Error("Ngrok non configurato. Assicurati che il Bottone 3 sia attivo sul Mac Mini.");
      }

      const apiUrl = `${ngrokUrl}/sdapi/v1/img2img`;

      // 3. 🎨 DIZIONARIO DEGLI STILI (Il "Cervello" del Design)
      const stylePrompts = {
        modern_luxury: "luxurious modern apartment, scandinavian style, warm wooden oak floors, soft cinematic shadows",
        industrial_loft: "industrial loft, exposed brick walls, concrete floor, dark metal accents, dramatic moody lighting, leather furniture",
        classic_elegance: "classic elegant interior, polished marble floors, gold details, luxury classic furniture, bright natural light, ornate"
      };

      const selectedStylePrompt = stylePrompts[styleChoice] || stylePrompts['modern_luxury'];
      const basePrompt = "high-end 3d architectural floor plan, photorealistic, 8k, top-down view, fully furnished, professional interior design, high-quality textures, octane render, clean white walls";
      
      const fullPrompt = `${basePrompt}, ${selectedStylePrompt}`;

      // 4. PAYLOAD UNIFICATO: CANNY PRECISION + STILE DINAMICO + HIRES FIX
      const payload = {
        "prompt": fullPrompt,
        "negative_prompt": "text, letters, labels, watermark, low quality, deformed, blurry, bad anatomy, messy, hand drawn, sketch lines, background noise, door swings, window symbols, grainy",
        "init_images": [base64Image],
        "denoising_strength": 0.55, // Abbassato per non far inventare nuovi muri all'AI
        "steps": 45,               // Più passaggi per pulire le scritte dello schizzo
        "cfg_scale": 12,           // Più alto per forzare il look "fotorealistico"
        
        // --- SEZIONE ALTA RISOLUZIONE (HIRES FIX) ---
        "enable_hr": true,
        "hr_scale": 1.5,
        "hr_upscaler": "R-ESRGAN 4x+",
        "hr_second_pass_steps": 25,
        // --------------------------------------------

        "alwayson_scripts": {
          "controlnet": {
            "args": [
              {
                "input_image": base64Image,
                "model": "control_v11p_sd15_canny", // USIAMO CANNY: il migliore per ricalcare gli schizzi
                "module": "canny",                // Estrae i bordi esatti e ignora le sbavature
                "weight": 1.8,                    // Forza quasi doppia: i muri NON si devono muovere
                "control_mode": "ControlNet is more important", // Geometria assolutamente prioritaria
                "processor_res": 512,
                "threshold_a": 100,               // Filtra il rumore leggero (le scritte a penna)
                "threshold_b": 200,               // Mantiene solo le linee spesse dei muri
                "pixel_perfect": true
              }
            ]
          }
        }
      };

      console.log(`📡 Inviando richiesta al Mac M4 (Stile: ${styleChoice})...`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore dal Mac Mini: ${errorText}`);
      }

      const data = await response.json();
      
      // Estrazione della prima immagine dall'array restituito
      const finalImageUrl = `data:image/png;base64,${data.images[0]}`;

      res.status(200).json({ success: true, imageUrl: finalImageUrl });

    } catch (error) {
      console.error("ERRORE API PLANIMETRIE:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}