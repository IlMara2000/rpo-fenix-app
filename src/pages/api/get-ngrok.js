import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const configPath = path.join(process.cwd(), 'ngrok_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    res.status(200).json({ url: JSON.parse(configData).url });
  } catch (e) {
    res.status(500).json({ error: "Ngrok non configurato" });
  }
}