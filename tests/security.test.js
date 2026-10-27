import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../server/security.js";
import planHandler from "../api/planimetrie-3d.js";
import importHandler from "../api/cyborg/import-census.js";

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
test("JSON parser accepts parsed and raw input and rejects arrays, null and oversized bodies", async () => {
  assert.deepEqual(await readJsonBody({ body: { ok: true } }), { ok: true });
  assert.deepEqual(await readJsonBody({ body: '{"ok":true}' }), { ok: true });
  for (const body of [null, [], "{broken"]) {
    await assert.rejects(readJsonBody({ body }), { statusCode: 400 });
  }
  await assert.rejects(readJsonBody({ body: { value: "x".repeat(100) } }, 30), { statusCode: 413 });
  const stream = async function* () { yield Buffer.alloc(20); yield Buffer.alloc(20); };
  await assert.rejects(readJsonBody(stream(), 30), { statusCode: 413 });
});
test("anonymous AI requests are rejected before any provider request", async () => {
  const old = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("unexpected network"); };
  try {
    const res = response();
    await planHandler({ method: "POST", headers: {}, body: { prompt: "test" } }, res);
    assert.equal(res.code, 401);
    assert.equal(requests, 0);
    assert.equal(res.headers["Cache-Control"], "no-store");
  } finally { globalThis.fetch = old; }
});
test("census import requires token and does not echo upstream diagnostics", async () => {
  const oldFetch = globalThis.fetch;
  const keys = ["CYBORG_IMPORT_TOKEN", "CRM_CENSUS_IMPORT_FORWARD_URL"];
  const oldEnv = keys.map(key => process.env[key]);
  process.env.CYBORG_IMPORT_TOKEN = "test-only-token";
  process.env.CRM_CENSUS_IMPORT_FORWARD_URL = "https://example.invalid/import";
  globalThis.fetch = async () => new Response("private upstream diagnostic", { status: 500 });
  try {
    const denied = response();
    await importHandler({ method: "POST", headers: {}, body: {} }, denied);
    assert.equal(denied.code, 401);
    const res = response();
    await importHandler({ method: "POST", headers: { authorization: "Bearer test-only-token" }, body: { contacts: [{ name: "Test" }] } }, res);
    assert.equal(res.code, 502);
    assert.doesNotMatch(JSON.stringify(res.body), /private upstream/);
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((key, index) => { if (oldEnv[index] === undefined) delete process.env[key]; else process.env[key] = oldEnv[index]; });
  }
});
