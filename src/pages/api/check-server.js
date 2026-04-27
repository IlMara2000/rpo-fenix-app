import fs from 'fs';
import path from 'path';

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export default async function handler(req, res) {
  try {
    const configPath = path.join(process.cwd(), 'ngrok_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const ngrokUrl = JSON.parse(configData).url;

    const response = await fetchWithTimeout(`${ngrokUrl}/sdapi/v1/options`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    });

    const contentType = response.headers.get('content-type') || '';
    res.status(200).json({
      isOnline: response.ok && contentType.includes('application/json'),
      status: response.status
    });
  } catch (error) {
    res.status(200).json({ isOnline: false, error: error.message });
  }
}
