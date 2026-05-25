export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  return res.status(410).json({
    success: false,
    error: "Endpoint sostituito: usa /api/planimetrie-3d per il flusso JPG + TXT verso JPG.",
  });
}
