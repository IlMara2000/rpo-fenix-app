import crypto from "node:crypto";

export const config = {
  maxDuration: 30,
};

const maxBodyBytes = 2 * 1024 * 1024;

function sendCors(req, res) {
  const allowedOrigins = (process.env.CYBORG_ALLOWED_ORIGINS || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;
  const allowOrigin =
    allowedOrigins.includes("*") || !requestOrigin
      ? "*"
      : allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Cyborg-Token");
  res.setHeader("Vary", "Origin");
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function readToken(req) {
  const authorization = req.headers.authorization || "";
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authorization);
  const headerToken = req.headers["x-cyborg-token"];
  return bearerMatch?.[1] || (Array.isArray(headerToken) ? headerToken[0] : headerToken) || "";
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBodyBytes) {
      const error = new Error("Payload troppo grande.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error("JSON non valido.");
    error.statusCode = 400;
    throw error;
  }
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function compactObject(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function fullName(record) {
  return (
    [record.firstName || record.nome, record.lastName || record.cognome].map(cleanString).filter(Boolean).join(" ") ||
    cleanString(record.name || record.nomeCompleto || record.nominativo)
  );
}

function normalizeContact(record, index) {
  const name = fullName(record) || `Contatto importato ${index + 1}`;
  return compactObject({
    externalId: cleanString(record.externalId || record.id),
    name,
    firstName: cleanString(record.firstName || record.nome),
    lastName: cleanString(record.lastName || record.cognome),
    phone: cleanString(record.phone || record.numero || record.telefono || record.cellulare),
    email: cleanString(record.email || record.mail),
    taxCode: cleanString(record.taxCode || record.codiceFiscale),
    type: cleanString(record.type || record.qualifica || "Proprietario"),
    status: cleanString(record.status || "Importato da Cyborg"),
    source: cleanString(record.source || "Cyborg"),
    property: cleanString(record.property || record.immobile),
    sheet: cleanString(record.sheet || record.foglio),
    parcel: cleanString(record.parcel || record.particella),
    subaltern: cleanString(record.subaltern || record.subalterno),
    cadastralCategory: cleanString(record.cadastralCategory || record.categoriaCatastale),
    rooms: cleanString(record.rooms || record.vani),
    note: cleanString(record.note || record.noteAnagrafiche || record.annotazioni),
  });
}

function normalizeProperty(record, index) {
  const title =
    cleanString(record.title || record.immobile || record.property) ||
    [record.street || record.via, record.streetNumber || record.civico, record.complex || record.complesso]
      .map(cleanString)
      .filter(Boolean)
      .join(" ");

  return compactObject({
    externalId: cleanString(record.externalId || record.id),
    code: cleanString(record.code || record.riferimento),
    title: title || `Immobile importato ${index + 1}`,
    zone: cleanString(record.zone || record.zona),
    street: cleanString(record.street || record.via),
    streetNumber: cleanString(record.streetNumber || record.civico),
    complex: cleanString(record.complex || record.complesso),
    owner: cleanString(record.owner || record.proprietario || fullName(record)),
    status: cleanString(record.status || "Censito"),
    kind: cleanString(record.kind || "vendita"),
    sheet: cleanString(record.sheet || record.foglio),
    parcel: cleanString(record.parcel || record.particella),
    subaltern: cleanString(record.subaltern || record.subalterno),
    cadastralCategory: cleanString(record.cadastralCategory || record.categoriaCatastale),
    rooms: cleanString(record.rooms || record.vani),
    source: cleanString(record.source || "Cyborg"),
  });
}

function normalizeActivity(record, index) {
  return compactObject({
    externalId: cleanString(record.externalId || record.id),
    title: cleanString(record.title || record.titolo || `Import censimento ${index + 1}`),
    type: cleanString(record.type || "Censimento"),
    contact: cleanString(record.contact || record.contatto || fullName(record)),
    property: cleanString(record.property || record.immobile),
    status: cleanString(record.status || "Aperta"),
    note: cleanString(record.note || record.esito || record.motivo),
    occurredAt: cleanString(record.occurredAt || record.data || new Date().toISOString()),
    source: cleanString(record.source || "Cyborg"),
  });
}

function normalizeCensusRecord(record, index) {
  const contact = normalizeContact(record, index);
  const property = normalizeProperty(record, index);
  const activity = normalizeActivity(
    {
      ...record,
      title: `Import censimento ${contact.name}`,
      contact: contact.name,
      property: property.title,
      note: cleanString(record.note || record.esito || `Zona ${property.zone || "-"} / Via ${property.street || "-"}`),
    },
    index,
  );

  return { contact, property, activity };
}

function normalizePayload(body) {
  const censusRecords = asArray(body.records || body.census || body.items);
  const normalizedFromRecords = censusRecords.map(normalizeCensusRecord);
  const contacts = [
    ...asArray(body.contacts).map(normalizeContact),
    ...normalizedFromRecords.map((item) => item.contact),
  ];
  const properties = [
    ...asArray(body.properties || body.immobili).map(normalizeProperty),
    ...normalizedFromRecords.map((item) => item.property),
  ];
  const activities = [
    ...asArray(body.activities || body.attivita).map(normalizeActivity),
    ...normalizedFromRecords.map((item) => item.activity),
  ];

  if (!contacts.length && !properties.length && !activities.length) {
    const error = new Error("Payload import census vuoto.");
    error.statusCode = 400;
    throw error;
  }

  return {
    batchId: cleanString(body.batchId || body.importId) || crypto.randomUUID(),
    source: cleanString(body.source || "cyborg-extension"),
    importedAt: new Date().toISOString(),
    contacts,
    properties,
    activities,
  };
}

async function upsertCensusData(payload) {
  const forwardUrl = process.env.CRM_CENSUS_IMPORT_FORWARD_URL;

  if (!forwardUrl) {
    const error = new Error(
      "Adapter DB CRM non configurato. Imposta CRM_CENSUS_IMPORT_FORWARD_URL oppure collega qui il client DB GRFenix.",
    );
    error.statusCode = 501;
    error.details = {
      expectedAdapter: "upsert contacts/properties/activities",
      counts: {
        contacts: payload.contacts.length,
        properties: payload.properties.length,
        activities: payload.activities.length,
      },
    };
    throw error;
  }

  const response = await fetch(forwardUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CRM_CENSUS_IMPORT_FORWARD_TOKEN
        ? { Authorization: `Bearer ${process.env.CRM_CENSUS_IMPORT_FORWARD_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();

  if (!response.ok) {
    const error = new Error(`Upsert CRM fallito: ${text.slice(0, 500)}`);
    error.statusCode = response.status;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, response: text };
  }
}

export default async function handler(req, res) {
  sendCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const expectedToken = process.env.CYBORG_IMPORT_TOKEN;
  if (!expectedToken) {
    return res.status(500).json({ error: "Manca CYBORG_IMPORT_TOKEN nelle variabili ambiente." });
  }

  if (!timingSafeEqual(readToken(req), expectedToken)) {
    return res.status(401).json({ error: "Token Cyborg non valido." });
  }

  try {
    const body = await readJsonBody(req);
    const payload = normalizePayload(body);
    const result = await upsertCensusData(payload);

    return res.status(200).json({
      success: true,
      batchId: payload.batchId,
      counts: {
        contacts: payload.contacts.length,
        properties: payload.properties.length,
        activities: payload.activities.length,
      },
      result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error instanceof Error ? error.message : "Errore import censimento.",
      details: error.details || undefined,
    });
  }
}
