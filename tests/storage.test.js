import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

test("portal export omits unrelated records, private details and draft listings", async () => {
  const source = await readFile(new URL("../src/crm/portalExport.ts", import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  const { portalExport } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const listing = { code: "test", title: "Casa", zone: "Centro", price: "100", kind: "vendita", owner: "private", taxCode: "private", details: { phone: "private" } };
  const result = portalExport([ { ...listing, portals: "Da sincronizzare" }, { ...listing, portals: "Privato" }, { ...listing, portals: "Bozza" } ]);
  assert.deepEqual(result, { properties: [{ code: "test", title: "Casa", zone: "Centro", price: "100", kind: "vendita" }] });
});

test("private data survives logout but is invisible to other users and anonymous sessions", async () => {
  const source = await readFile(new URL("../src/lib/privateStorage.ts", import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  const storage = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const values = new Map([["crm", "legacy shared data"]]);
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    assert.equal(storage.privateStorage.getItem("crm"), null);
    assert.throws(() => storage.privateStorage.setItem("crm", "denied"));
    storage.setStorageOwner("a");
    assert.equal(storage.privateStorage.getItem("crm"), null);
    storage.privateStorage.setItem("crm", "private A");
    storage.clearPrivateStorage();
    assert.equal(storage.privateStorage.getItem("crm"), null);
    storage.setStorageOwner("b");
    assert.equal(storage.privateStorage.getItem("crm"), null);
    storage.setStorageOwner("a");
    assert.equal(storage.privateStorage.getItem("crm"), "private A");
    assert.equal(values.get("crm"), "legacy shared data");
  } finally { storage.clearPrivateStorage(); if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});
