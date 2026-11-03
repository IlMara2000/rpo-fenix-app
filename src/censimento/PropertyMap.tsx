import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { splitMappable, type MapSourceProperty } from "./geocode";
import {
  addressForProperty,
  geocodeAddress,
  readCoordinates,
  writeCoordinates,
  type Coordinates,
} from "./coordinates";

/**
 * Tessere vettoriali di OpenFreeMap: servizio pubblico gratuito, senza chiave e
 * senza limiti di richieste, con uso commerciale consentito. Le tessere del
 * server pubblico di OpenStreetMap non si possono usare per un gestionale.
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** Centro e zoom iniziali: Italia intera. MapLibre vuole [longitudine, latitudine]. */
const ITALY_CENTER: [number, number] = [12.5, 42.5];
const ITALY_ZOOM = 5.2;

export type PlacedCoordinates = { id: string; lat: number; lng: number };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Arrotonda a 6 decimali: circa 10 cm, quanto serve senza sporcare il dato. */
function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function coordinatesOf(property: MapSourceProperty): Coordinates | null {
  if (typeof property.lat !== "number" || typeof property.lng !== "number") {
    return null;
  }
  if (!Number.isFinite(property.lat) || !Number.isFinite(property.lng)) {
    return null;
  }
  return { lat: property.lat, lng: property.lng };
}

/**
 * Unica mappa immobiliare del gestionale.
 * Mostra solo gli immobili: popup e testi non contengono mai il nome del proprietario.
 *
 * La posizione scelta viene salvata sull'immobile stesso invece che in una
 * memoria separata: cosi' entra nelle copie di sicurezza e non si perde se si
 * pulisce la cache. La vecchia cache resta solo come riserva per recuperare le
 * posizioni scelte prima che il campo esistesse: vengono ricopiate una volta.
 */
export function PropertyMap({
  properties,
  onCoordinatesChange,
}: {
  properties: MapSourceProperty[];
  onCoordinatesChange?: (entries: PlacedCoordinates[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [legacyCoordinates, setLegacyCoordinates] = useState<Record<string, Coordinates>>(() => readCoordinates());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const migratedRef = useRef(false);

  const savePositions = useCallback(
    (entries: PlacedCoordinates[]) => {
      if (!entries.length) {
        return;
      }
      setLegacyCoordinates((current) => {
        const next = { ...current };
        for (const entry of entries) {
          next[entry.id] = { lat: entry.lat, lng: entry.lng };
        }
        writeCoordinates(next);
        return next;
      });
      onCoordinatesChange?.(entries);
    },
    [onCoordinatesChange],
  );

  const enriched = useMemo(
    () =>
      properties.map((property) => {
        const placed = coordinatesOf(property) ?? legacyCoordinates[property.id] ?? null;
        return { ...property, ...(placed ?? {}) };
      }),
    [properties, legacyCoordinates],
  );
  const { markers, missing } = useMemo(() => splitMappable(enriched), [enriched]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: STYLE_URL,
      center: ITALY_CENTER,
      zoom: ITALY_ZOOM,
      dragRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Posizioni salvate prima che l'immobile avesse il campo: ricopiate una volta sola.
  useEffect(() => {
    if (migratedRef.current || !onCoordinatesChange) {
      return;
    }
    const entries: PlacedCoordinates[] = [];
    for (const property of properties) {
      const placed = coordinatesOf(property);
      const cached = legacyCoordinates[property.id];
      if (!placed && cached) {
        entries.push({ id: property.id, lat: cached.lat, lng: cached.lng });
      }
    }
    if (!entries.length) {
      return;
    }
    migratedRef.current = true;
    onCoordinatesChange(entries);
  }, [properties, legacyCoordinates, onCoordinatesChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    for (const marker of markers) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "property-map-pin";
      element.title = `${marker.label} — ${marker.cadastral}`;
      element.setAttribute("aria-label", `${marker.label}. ${marker.cadastral}`);

      const pin = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
            `<strong>${escapeHtml(marker.label)}</strong><br>${escapeHtml(marker.cadastral)}`,
          ),
        )
        .addTo(map);
      markersRef.current.push(pin);
    }

    if (!markers.length) {
      return;
    }

    const lngs = markers.map((marker) => marker.lng);
    const lats = markers.map((marker) => marker.lat);
    const bounds: maplibregl.LngLatBoundsLike = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
  }, [markers]);

  // Posizionamento a mano: si sceglie l'immobile, poi si clicca il punto sulla mappa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !placingId) {
      return;
    }
    const targetId: string = placingId;

    function handlePlace(event: maplibregl.MapMouseEvent) {
      setPlacingId(null);
      savePositions([
        {
          id: targetId,
          lat: roundCoordinate(event.lngLat.lat),
          lng: roundCoordinate(event.lngLat.lng),
        },
      ]);
      setMessage(null);
    }

    map.on("click", handlePlace);
    return () => {
      map.off("click", handlePlace);
    };
  }, [placingId, savePositions]);

  async function handleGeocode(property: MapSourceProperty) {
    const address = addressForProperty(property);
    if (address.trim().length < 4) {
      setMessage("Serve almeno la via o la zona per cercare l'immobile sulla mappa.");
      return;
    }

    setBusyId(property.id);
    setMessage(null);
    const result = await geocodeAddress(address);
    setBusyId(null);

    if (!result) {
      setMessage(`Non ho trovato "${address}". Controlla indirizzo e zona, oppure posizionalo a mano.`);
      return;
    }

    savePositions([{ id: property.id, lat: result.lat, lng: result.lng }]);
  }

  return (
    <div className="property-map">
      <div
        className={placingId ? "property-map-canvas is-placing" : "property-map-canvas"}
        ref={containerRef}
        role="application"
        aria-label="Mappa immobiliare"
      />
      <p className="property-map-credit">
        Mappa{" "}
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
          OpenFreeMap
        </a>
        {" © "}
        <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">
          OpenMapTiles
        </a>
        {" · dati "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>
        {" · dati catastali inseriti a mano nel censimento."}
      </p>

      {placingId ? (
        <p className="property-map-hint">Clicca sulla mappa il punto esatto dell'immobile.</p>
      ) : null}

      {markers.length ? null : (
        <p className="property-map-empty">
          Nessun immobile sulla mappa: aggiungi le coordinate dalla lista qui sotto.
        </p>
      )}

      {missing.length ? (
        <div className="property-map-missing">
          <strong>Da geolocalizzare ({missing.length})</strong>
          <ul>
            {missing.map((property) => (
              <li key={property.id}>
                <span>
                  {property.title}
                  {property.zone ? ` — ${property.zone}` : ""}
                </span>
                <span className="property-map-actions">
                  <button
                    type="button"
                    disabled={busyId === property.id || placingId === property.id}
                    onClick={() => handleGeocode(property)}
                  >
                    {busyId === property.id ? "Cerco…" : "Cerca indirizzo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setPlacingId(placingId === property.id ? null : property.id);
                    }}
                  >
                    {placingId === property.id ? "Annulla" : "Posiziona"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? <p className="property-map-message">{message}</p> : null}
    </div>
  );
}
