import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("map markers carry cadastral data but never owner names", async () => {
  const { normalizePropertyForMap } = await loadModule("../src/censimento/geocode.ts");

  const marker = normalizePropertyForMap({
    id: "property-1",
    title: "Via Roma 10",
    zone: "Centro",
    sheet: "12",
    parcel: "345",
    subaltern: "6",
    owner: "Mario Rossi",
    lat: 45.46,
    lng: 9.19,
  });

  assert.equal(marker.label, "Via Roma 10 — Centro");
  assert.equal(marker.cadastral, "Fg. 12 Part. 345 Sub. 6");
  assert.equal(marker.lat, 45.46);
  assert.equal(marker.lng, 9.19);
  assert.equal("owner" in marker, false);
  assert.doesNotMatch(JSON.stringify(marker), /Rossi/);

  assert.equal(
    normalizePropertyForMap({ id: "property-2", title: "Catasto assente", lat: 44.1, lng: 12.2 }).cadastral,
    "Catasto da inserire",
  );
});

test("properties without valid coordinates are reported as missing, not plotted", async () => {
  const { splitMappable } = await loadModule("../src/censimento/geocode.ts");

  const { markers, missing } = splitMappable([
    { id: "ok", title: "Via Verdi 1", zone: "Centro", lat: 45.1, lng: 9.2 },
    { id: "no-coords", title: "Senza coordinate", zone: "Centro" },
    { id: "zero", title: "Coordinate a zero", lat: 0, lng: 0 },
    { id: "out-of-range", title: "Fuori dal mondo", lat: 200, lng: 0 },
    { id: "no-title", title: "", lat: 45, lng: 9 },
  ]);

  assert.deepEqual(markers.map((marker) => marker.id), ["ok"]);
  assert.deepEqual(missing.map((property) => property.id), ["no-coords", "zero", "out-of-range", "no-title"]);
  assert.equal(markers.length + missing.length, 5);
});
