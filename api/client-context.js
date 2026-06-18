import { createHash } from "node:crypto";

function firstHeaderValue(value) {
  return String(value || "").split(",")[0].trim();
}

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Metodo non consentito." });
  }

  const forwardedFor = firstHeaderValue(request.headers["x-forwarded-for"]);
  const clientIp =
    forwardedFor ||
    firstHeaderValue(request.headers["x-real-ip"]) ||
    request.socket?.remoteAddress ||
    "unknown";
  const networkId = createHash("sha256")
    .update(`fenix-network:${clientIp}`)
    .digest("hex")
    .slice(0, 24);

  response.setHeader("Cache-Control", "no-store, max-age=0");
  return response.status(200).json({
    networkId,
    observedAt: new Date().toISOString(),
  });
}
