export interface MapSourceProperty {
  id: string;
  title: string;
  zone?: string;
  sheet?: string;
  parcel?: string;
  subaltern?: string;
  lat?: number;
  lng?: number;
}

export interface MapMarker {
  id: string;
  label: string;
  cadastral: string;
  lat: number;
  lng: number;
}

/**
 * Etichetta catastale leggibile. Restituisce una stringa vuota se non c'e'
 * nessun dato catastale, cosi' la mappa puo' dirlo esplicitamente.
 */
export function mapCadastralLabel(property: Pick<MapSourceProperty, "sheet" | "parcel" | "subaltern">): string {
  const parts: string[] = [];
  if (property.sheet) {
    parts.push(`Fg. ${property.sheet}`);
  }
  if (property.parcel) {
    parts.push(`Part. ${property.parcel}`);
  }
  if (property.subaltern) {
    parts.push(`Sub. ${property.subaltern}`);
  }
  return parts.join(" ");
}

/**
 * Converte un immobile in un segnaposto sulla mappa.
 * Restituisce null se mancano le coordinate o l'identificativo.
 *
 * Il risultato non contiene mai il nome del proprietario: sulla mappa
 * compaiono gli immobili, non le persone.
 */
export function normalizePropertyForMap(property: MapSourceProperty): MapMarker | null {
  if (!property.id || !property.title) {
    return null;
  }

  const lat = typeof property.lat === "number" ? property.lat : Number(property.lat);
  const lng = typeof property.lng === "number" ? property.lng : Number(property.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat === 0 && lng === 0) {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return {
    id: property.id,
    label: property.zone ? `${property.title} — ${property.zone}` : property.title,
    cadastral: mapCadastralLabel(property) || "Catasto da inserire",
    lat,
    lng,
  };
}

/** Divide gli immobili in segnaposto pronti e immobili ancora da geolocalizzare. */
export function splitMappable(properties: MapSourceProperty[]): {
  markers: MapMarker[];
  missing: MapSourceProperty[];
} {
  const markers: MapMarker[] = [];
  const missing: MapSourceProperty[] = [];

  for (const property of properties) {
    const marker = normalizePropertyForMap(property);
    if (marker) {
      markers.push(marker);
    } else {
      missing.push(property);
    }
  }

  return { markers, missing };
}
