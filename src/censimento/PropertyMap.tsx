import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { splitMappable, type MapSourceProperty } from "./geocode";
import {
  addressForProperty,
  geocodeAddress,
  readCoordinates,
  writeCoordinates,
  type Coordinates,
} from "./coordinates";

const ITALY_CENTER: L.LatLngTuple = [42.5, 12.5];

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
 * La posizione scelta viene salvata sull'immobile stesso, così resta anche
 * cambiando computer. La vecchia cache del browser serve solo a recuperare le
 * posizioni gia' scelte prima che esistesse il campo: vengono ricopiate una volta.
 */
export function PropertyMap({
  properties,
  onCoordinatesChange,
}: {
  properties: MapSourceProperty[];
  onCoordinatesChange?: (entries: PlacedCoordinates[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
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

    const map = L.map(container, { center: ITALY_CENTER, zoom: 6 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
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
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) {
      return;
    }

    layer.clearLayers();
    const pin = L.divIcon({
      className: "property-map-pin",
      html: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10],
    });

    for (const marker of markers) {
      L.marker([marker.lat, marker.lng], { icon: pin, title: marker.label })
        .bindPopup(`<strong>${escapeHtml(marker.label)}</strong><br>${escapeHtml(marker.cadastral)}`)
        .addTo(layer);
    }

    if (markers.length) {
      const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng] as L.LatLngTuple));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
    }
  }, [markers]);

  // Posizionamento a mano: si sceglie l'immobile, poi si clicca il punto sulla mappa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !placingId) {
      return;
    }
    const targetId: string = placingId;

    function handlePlace(event: L.LeafletMouseEvent) {
      setPlacingId(null);
      savePositions([
        {
          id: targetId,
          lat: roundCoordinate(event.latlng.lat),
          lng: roundCoordinate(event.latlng.lng),
        },
      ]);
      setMessage(null);
    }

    map.once("click", handlePlace);
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
        Mappa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
        {" · "}
        Dati catastali inseriti a mano nel censimento.
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
