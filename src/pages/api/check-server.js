import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // 1. Trova il file di ngrok
    const configPath = path.join(process.cwd(), 'ngrok_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const ngrokUrl = JSON.parse(configData).url;

    // 2. Bussa gentilmente al Mac Mini M4
    // Chiamiamo un endpoint leggerissimo solo per vedere se risponde
    const response = await fetch(`${ngrokUrl}/sdapi/v1/options`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (response.ok) {
      res.status(200).json({ isOnline: true });
    } else {
      res.status(200).json({ isOnline: false });
    }
  } catch (error) {
    // Se c'è un errore (file non trovato o Mac spento), è offline
    res.status(200).json({ isOnline: false });
  }
}