import { createHash } from "node:crypto";

function firstHeaderValue(value) {
  return String(value || "").split(",")[0].trim();
}

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Metodo non consentito." });
  }

  // x-real-ip è impostato dall'infrastruttura; X-Forwarded-For si usa solo come riserva
  // prendendo l'ultimo valore, cioè quello aggiunto dal proxy più vicino.
  const forwardedFor = String(request.headers["x-forwarded-for"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .pop();
  const clientIp =
    firstHeaderValue(request.headers["x-real-ip"]) ||
    forwardedFor ||
    request.socket?.remoteAddress ||
    "unknown";
  const salt = process.env.CLIENT_CONTEXT_SALT || "fenix-network";
  const networkId = createHash("sha256")
    .update(`${salt}:${clientIp}`)
    .digest("hex")
    .slice(0, 24);

  response.setHeader("Cache-Control", "no-store, max-age=0");
  return response.status(200).json({
    networkId,
    observedAt: new Date().toISOString(),
  });
}
