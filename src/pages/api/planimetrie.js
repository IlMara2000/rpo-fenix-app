import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export const config = {
  api: { bodyParser: false },
};

export const maxDuration = 60;

const MAX_OUTPUT_SIDE = 1800;
const MIN_OUTPUT_SIDE = 720;

const firstValue = (value) => Array.isArray(value) ? value[0] : value;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getOutputSize = (width, height) => {
  if (!width || !height) {
    return { width: 1200, height: 1200 };
  }

  const ratio = width / height;
  if (ratio >= 1) {
    return {
      width: MAX_OUTPUT_SIDE,
      height: Math.round(clamp(MAX_OUTPUT_SIDE / ratio, MIN_OUTPUT_SIDE, MAX_OUTPUT_SIDE)),
    };
  }

  return {
    width: Math.round(clamp(MAX_OUTPUT_SIDE * ratio, MIN_OUTPUT_SIDE, MAX_OUTPUT_SIDE)),
    height: MAX_OUTPUT_SIDE,
  };
};

const makePaper = async (size) => sharp({
  create: {
    width: size.width,
    height: size.height,
    channels: 4,
    background: '#f7f3ea',
  },
})
  .png()
  .toBuffer();

const makeGridOverlay = (size) => Buffer.from(`
  <svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="small" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d6cbbc" stroke-width="1" opacity="0.28"/>
      </pattern>
      <pattern id="large" width="160" height="160" patternUnits="userSpaceOnUse">
        <rect width="160" height="160" fill="url(#small)"/>
        <path d="M 160 0 L 0 0 0 160" fill="none" stroke="#cabca8" stroke-width="1.5" opacity="0.22"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#large)"/>
    <rect x="24" y="24" width="${size.width - 48}" height="${size.height - 48}" rx="14" fill="none" stroke="#251f1d" stroke-width="2" opacity="0.12"/>
  </svg>
`);

const makeTitleOverlay = (size, originalName) => {
  const label = String(originalName || 'planimetria')
    .replace(/[<>&"]/g, '')
    .slice(0, 64);

  return Buffer.from(`
    <svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="34" y="${size.height - 78}" width="${Math.min(size.width - 68, 520)}" height="44" rx="10" fill="#111111" opacity="0.72"/>
      <text x="54" y="${size.height - 50}" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2">${label}</text>
    </svg>
  `);
};

const addWatermark = async (buffer, size) => {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const overlays = [{
    input: makeTitleOverlay(size, 'FENIX PLANIMETRIA'),
    top: 0,
    left: 0,
  }];

  if (fs.existsSync(logoPath)) {
    const logoWidth = Math.round(clamp(size.width * 0.16, 150, 300));
    const logo = await sharp(logoPath)
      .resize({ width: logoWidth })
      .png()
      .toBuffer();

    overlays.push({
      input: logo,
      gravity: 'southeast',
      left: size.width - logoWidth - 36,
      top: size.height - Math.round(logoWidth * 0.45) - 34,
      blend: 'over',
    });
  }

  return sharp(buffer)
    .resize({ width: size.width, height: size.height, fit: 'fill' })
    .composite(overlays)
    .png()
    .toBuffer();
};

const findRoomZones = async (lineBuffer, size) => {
  const { data } = await sharp(lineBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cols = 4;
  const rows = 3;
  const cellW = size.width / cols;
  const cellH = size.height / rows;
  const candidates = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = Math.round(col * cellW + cellW * 0.14);
      const y0 = Math.round(row * cellH + cellH * 0.14);
      const x1 = Math.round((col + 1) * cellW - cellW * 0.14);
      const y1 = Math.round((row + 1) * cellH - cellH * 0.14);
      let dark = 0;
      let total = 0;

      for (let y = y0; y < y1; y += 4) {
        for (let x = x0; x < x1; x += 4) {
          total += 1;
          if (data[y * size.width + x] < 100) dark += 1;
        }
      }

      const density = total ? dark / total : 1;
      if (density < 0.12) {
        candidates.push({
          x: col * cellW + cellW / 2,
          y: row * cellH + cellH / 2,
          width: cellW * 0.72,
          height: cellH * 0.62,
          density,
        });
      }
    }
  }

  const ordered = candidates.sort((a, b) => a.density - b.density);
  const selected = [];

  ordered.forEach((candidate) => {
    const tooClose = selected.some(item => {
      const dx = item.x - candidate.x;
      const dy = item.y - candidate.y;
      return Math.sqrt((dx * dx) + (dy * dy)) < Math.min(cellW, cellH) * 0.85;
    });
    if (!tooClose && selected.length < 6) selected.push(candidate);
  });

  const fallback = [
    { x: size.width * 0.25, y: size.height * 0.28, width: size.width * 0.28, height: size.height * 0.22, density: 0 },
    { x: size.width * 0.72, y: size.height * 0.30, width: size.width * 0.30, height: size.height * 0.22, density: 0 },
    { x: size.width * 0.28, y: size.height * 0.70, width: size.width * 0.28, height: size.height * 0.22, density: 0 },
    { x: size.width * 0.72, y: size.height * 0.70, width: size.width * 0.30, height: size.height * 0.22, density: 0 },
  ];

  return (selected.length ? selected : fallback).map((candidate, index) => ({
    ...candidate,
    type: ['bedroom', 'living', 'kitchen', 'dining', 'office', 'green'][index],
  }));
};

const makeFurnitureOverlay = (size, zones) => {
  const draw = (zone) => {
    const x = zone.x - zone.width / 2;
    const y = zone.y - zone.height / 2;
    const w = zone.width;
    const h = zone.height;

    if (zone.type === 'bedroom') {
      return `
        <g>
          <rect x="${x + w * 0.08}" y="${y + h * 0.12}" width="${w * 0.5}" height="${h * 0.66}" rx="18" fill="#d5ad78" stroke="#654326" stroke-width="6"/>
          <rect x="${x + w * 0.15}" y="${y + h * 0.18}" width="${w * 0.16}" height="${h * 0.18}" rx="8" fill="#f6ead8" stroke="#8a725b" stroke-width="3"/>
          <rect x="${x + w * 0.35}" y="${y + h * 0.18}" width="${w * 0.16}" height="${h * 0.18}" rx="8" fill="#f6ead8" stroke="#8a725b" stroke-width="3"/>
          <rect x="${x + w * 0.66}" y="${y + h * 0.16}" width="${w * 0.22}" height="${h * 0.55}" rx="10" fill="#bda98b" stroke="#6b5945" stroke-width="5"/>
          <line x1="${x + w * 0.77}" y1="${y + h * 0.18}" x2="${x + w * 0.77}" y2="${y + h * 0.68}" stroke="#6b5945" stroke-width="4"/>
          <circle cx="${x + w * 0.06}" cy="${y + h * 0.73}" r="${Math.min(w, h) * 0.08}" fill="#6c8b58"/>
        </g>`;
    }

    if (zone.type === 'living') {
      return `
        <g>
          <rect x="${x + w * 0.12}" y="${y + h * 0.18}" width="${w * 0.62}" height="${h * 0.58}" rx="22" fill="#d9d0bd" opacity="0.65"/>
          <rect x="${x + w * 0.12}" y="${y + h * 0.30}" width="${w * 0.48}" height="${h * 0.28}" rx="18" fill="#78908c" stroke="#304743" stroke-width="6"/>
          <rect x="${x + w * 0.12}" y="${y + h * 0.12}" width="${w * 0.48}" height="${h * 0.22}" rx="16" fill="#91aaa6" stroke="#304743" stroke-width="5"/>
          <rect x="${x + w * 0.68}" y="${y + h * 0.24}" width="${w * 0.08}" height="${h * 0.46}" rx="7" fill="#665446"/>
          <ellipse cx="${x + w * 0.43}" cy="${y + h * 0.68}" rx="${w * 0.18}" ry="${h * 0.11}" fill="#c99d63" stroke="#5f4124" stroke-width="5"/>
        </g>`;
    }

    if (zone.type === 'kitchen') {
      return `
        <g>
          <rect x="${x + w * 0.08}" y="${y + h * 0.12}" width="${w * 0.78}" height="${h * 0.20}" rx="10" fill="#d8d2c6" stroke="#5f625d" stroke-width="6"/>
          <rect x="${x + w * 0.08}" y="${y + h * 0.32}" width="${w * 0.22}" height="${h * 0.42}" rx="10" fill="#d8d2c6" stroke="#5f625d" stroke-width="6"/>
          <rect x="${x + w * 0.14}" y="${y + h * 0.17}" width="${w * 0.18}" height="${h * 0.10}" rx="5" fill="#8ea2a7" stroke="#5f625d" stroke-width="3"/>
          <circle cx="${x + w * 0.55}" cy="${y + h * 0.22}" r="${h * 0.055}" fill="none" stroke="#5f625d" stroke-width="4"/>
          <circle cx="${x + w * 0.68}" cy="${y + h * 0.22}" r="${h * 0.055}" fill="none" stroke="#5f625d" stroke-width="4"/>
          <rect x="${x + w * 0.44}" y="${y + h * 0.46}" width="${w * 0.32}" height="${h * 0.18}" rx="9" fill="#b88d59" stroke="#604025" stroke-width="5"/>
        </g>`;
    }

    if (zone.type === 'dining') {
      return `
        <g>
          <rect x="${x + w * 0.22}" y="${y + h * 0.18}" width="${w * 0.56}" height="${h * 0.58}" rx="20" fill="#dcc6a2" opacity="0.55"/>
          <ellipse cx="${zone.x}" cy="${zone.y}" rx="${w * 0.26}" ry="${h * 0.20}" fill="#c99d63" stroke="#5f4124" stroke-width="6"/>
          <circle cx="${zone.x - w * 0.33}" cy="${zone.y}" r="${Math.min(w, h) * 0.075}" fill="#6f7f8b"/>
          <circle cx="${zone.x + w * 0.33}" cy="${zone.y}" r="${Math.min(w, h) * 0.075}" fill="#6f7f8b"/>
          <circle cx="${zone.x}" cy="${zone.y - h * 0.30}" r="${Math.min(w, h) * 0.075}" fill="#6f7f8b"/>
          <circle cx="${zone.x}" cy="${zone.y + h * 0.30}" r="${Math.min(w, h) * 0.075}" fill="#6f7f8b"/>
        </g>`;
    }

    if (zone.type === 'office') {
      return `
        <g>
          <rect x="${x + w * 0.10}" y="${y + h * 0.16}" width="${w * 0.58}" height="${h * 0.26}" rx="10" fill="#9e7654" stroke="#4d3325" stroke-width="6"/>
          <rect x="${x + w * 0.20}" y="${y + h * 0.22}" width="${w * 0.20}" height="${h * 0.09}" fill="#2d3540" opacity="0.92"/>
          <rect x="${x + w * 0.34}" y="${y + h * 0.52}" width="${w * 0.20}" height="${h * 0.18}" rx="9" fill="#54636c"/>
          <rect x="${x + w * 0.74}" y="${y + h * 0.15}" width="${w * 0.12}" height="${h * 0.54}" rx="7" fill="#bfa98d" stroke="#6b5a47" stroke-width="5"/>
        </g>`;
    }

    return `
      <g>
        <circle cx="${zone.x - w * 0.1}" cy="${zone.y}" r="${Math.min(w, h) * 0.16}" fill="#7f5b3a" stroke="#3a2517" stroke-width="5"/>
        <circle cx="${zone.x - w * 0.18}" cy="${zone.y - h * 0.06}" r="${Math.min(w, h) * 0.13}" fill="#5b8f5a"/>
        <circle cx="${zone.x}" cy="${zone.y - h * 0.05}" r="${Math.min(w, h) * 0.13}" fill="#427a43"/>
        <circle cx="${zone.x - w * 0.08}" cy="${zone.y + h * 0.12}" r="${Math.min(w, h) * 0.12}" fill="#6aa566"/>
      </g>`;
  };

  return Buffer.from(`
    <svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.18"/>
      </filter>
      <g filter="url(#softShadow)">
        ${zones.map(draw).join('')}
      </g>
    </svg>
  `);
};

const makeFloorOverlay = (size, zones) => Buffer.from(`
  <svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="wood" width="96" height="28" patternUnits="userSpaceOnUse">
        <rect width="96" height="28" fill="#eadcc6"/>
        <path d="M 0 27 L 96 27" stroke="#d5bea0" stroke-width="1" opacity="0.55"/>
        <path d="M 28 2 C 36 10, 48 8, 62 4" stroke="#c9aa82" stroke-width="1" opacity="0.25" fill="none"/>
      </pattern>
    </defs>
    <rect x="34" y="34" width="${size.width - 68}" height="${size.height - 68}" rx="12" fill="url(#wood)" opacity="0.65"/>
    ${zones.map((zone, index) => `
      <rect x="${zone.x - zone.width * 0.58}" y="${zone.y - zone.height * 0.58}" width="${zone.width * 1.16}" height="${zone.height * 1.16}" rx="22" fill="${['#e3c6a4', '#c8d7d2', '#dec8a5', '#d6c7b9', '#cbc4b8', '#cdddbf'][index]}" opacity="0.44"/>
    `).join('')}
  </svg>
`);

const createFurnishedPlan = async (input, size) => {
  const lineLayer = await sharp(input)
    .rotate()
    .resize({ width: size.width, height: size.height, fit: 'inside', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: '#ffffff',
    })
    .resize({ width: size.width, height: size.height, fit: 'contain', background: '#ffffff' })
    .greyscale()
    .normalize()
    .linear(1.42, -34)
    .threshold(188)
    .png()
    .toBuffer();

  const zones = await findRoomZones(lineLayer, size);
  const paper = await makePaper(size);
  const plan = await sharp(paper)
    .composite([
      { input: makeGridOverlay(size), top: 0, left: 0 },
      { input: makeFloorOverlay(size, zones), top: 0, left: 0 },
      { input: makeFurnitureOverlay(size, zones), top: 0, left: 0 },
      { input: lineLayer, top: 0, left: 0, blend: 'multiply' },
    ])
    .modulate({ brightness: 1.02, saturation: 0.85 })
    .sharpen({ sigma: 0.7 })
    .png()
    .toBuffer();

  return {
    buffer: await addWatermark(plan, size),
    size,
    furnitureCount: zones.length,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const form = new IncomingForm({
    maxFileSize: 20 * 1024 * 1024,
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Errore nel caricamento del file' });
    }

    const uploadedFile = firstValue(files.file);
    if (!uploadedFile) {
      return res.status(400).json({ error: 'Nessun file ricevuto' });
    }

    try {
      const fileData = fs.readFileSync(uploadedFile.filepath);
      const metadata = await sharp(fileData).metadata();
      const outputSize = getOutputSize(metadata.width, metadata.height);
      const result = await createFurnishedPlan(fileData, outputSize);

      return res.status(200).json({
        success: true,
        imageUrl: `data:image/png;base64,${result.buffer.toString('base64')}`,
        meta: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          outputWidth: result.size.width,
          outputHeight: result.size.height,
          mode: 'local-furnished-2d',
          furnitureCount: result.furnitureCount,
        },
      });
    } catch (error) {
      console.error('ERRORE API PLANIMETRIE:', error.message);
      return res.status(500).json({ error: `Impossibile elaborare immagine: ${error.message}` });
    }
  });
}
