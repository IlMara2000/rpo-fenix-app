import type { MapSourceProperty } from "./geocode";

export interface Coordinates {
  lat: number;
  lng: number;
}

const STORAGE_KEY = "fenix-map-coordinates";

/**
 * Vecchia memoria delle coordinate, tenuta solo come riserva.
 * La posizione vera vive sul record dell'immobile (lat/lng): queste voci vengono
 * ricopiate una volta sola la prima volta che la mappa si apre.
 */
export function readCoordinates(): Record<string, Coordinates> {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, Coordinates> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const candidate = value as Partial<Coordinates> | null;
      if (!candidate || typeof candidate.lat !== "number" || typeof candidate.lng !== "number") {
        continue;
      }
      if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) {
        continue;
      }
      result[id] = { lat: candidate.lat, lng: candidate.lng };
    }
    return result;
  } catch {
    return {};
  }
}

export function writeCoordinates(values: Record<string, Coordinates>): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Archivio pieno o non disponibile: la mappa resta usabile senza salvare.
  }
}

/** Indirizzo usato per la geocodifica: solo dati dell'immobile, nessun nominativo. */
export function addressForProperty(property: MapSourceProperty): string {
  return [property.title, property.zone].filter(Boolean).join(", ");
}

/**
 * Il servizio pubblico OpenStreetMap (Nominatim) ammette al massimo una
 * richiesta al secondo. Due clic ravvicinati su immobili diversi partirebbero
 * insieme e farebbero bloccare il servizio, quindi le ricerche vengono messe in
 * fila indiana con almeno un secondo di distacco.
 */
const MIN_INTERVAL_MS = 1100;

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Geocodifica un indirizzo su OpenStreetMap (Nominatim).
 * Le chiamate concorrenti vengono accodate: il servizio pubblico non tollera
 * due richieste nello stesso secondo.
 */
export async function geocodeAddress(query: string): Promise<Coordinates | null> {
  const trimmed = query.trim();
  if (trimmed.length < 4) {
    return null;
  }

  const task = queue.then(
    () => requestCoordinates(trimmed),
    () => requestCoordinates(trimmed),
  );
  queue = task.catch(() => undefined);
  return task;
}

async function requestCoordinates(trimmed: string): Promise<Coordinates | null> {
  const sinceLast = Date.now() - lastRequestAt;
  if (sinceLast < MIN_INTERVAL_MS) {
    await wait(MIN_INTERVAL_MS - sinceLast);
  }
  lastRequestAt = Date.now();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&q=${encodeURIComponent(trimmed)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) {
      return null;
    }
    const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const first = Array.isArray(results) ? results[0] : undefined;
    if (!first?.lat || !first?.lon) {
      return null;
    }
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  } catch {
    return null;
  }
}
