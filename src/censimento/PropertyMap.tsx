import { useEffect, useMemo, useRef, useState } from "react";
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Unica mappa immobiliare del gestionale.
 * Mostra solo gli immobili: popup e testi non contengono mai il nome del proprietario.
 */
export function PropertyMap({ properties }: { properties: MapSourceProperty[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [coords, setCoords] = useState<Record<string, Coordinates>>(() => readCoordinates());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      properties.map((property) => ({
        ...property,
        ...(coords[property.id] ?? {}),
      })),
    [properties, coords],
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
      setMessage(`Non ho trovato "${address}". Controlla indirizzo e zona dell'immobile.`);
      return;
    }

    const next = { ...coords, [property.id]: result };
    setCoords(next);
    writeCoordinates(next);
  }

  return (
    <div className="property-map">
      <div className="property-map-canvas" ref={containerRef} role="application" aria-label="Mappa immobiliare" />
      <p className="property-map-credit">
        Mappa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
        {" · "}
        Dati catastali inseriti a mano nel censimento.
      </p>

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
                <button
                  type="button"
                  disabled={busyId === property.id}
                  onClick={() => handleGeocode(property)}
                >
                  {busyId === property.id ? "Cerco…" : "Geolocalizza"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? <p className="property-map-message">{message}</p> : null}
    </div>
  );
}
