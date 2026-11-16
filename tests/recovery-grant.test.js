import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadRecoveryGrant() {
  const source = await readFile(new URL("../src/lib/recoveryGrant.ts", import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("il permesso di recupero vale prima del limite", async () => {
  const { isRecoveryGrantActive, recoveryGrantMs } = await loadRecoveryGrant();
  const concesso = Date.UTC(2026, 10, 16, 9, 0, 0);
  const scadenza = concesso + recoveryGrantMs;

  assert.equal(isRecoveryGrantActive(scadenza, concesso), true, "appena concesso");
  assert.equal(
    isRecoveryGrantActive(scadenza, concesso + recoveryGrantMs / 2),
    true,
    "a metà strada",
  );
  assert.equal(isRecoveryGrantActive(scadenza, scadenza - 1), true, "un millisecondo prima");
});

test("il permesso di recupero è scaduto dal limite in poi", async () => {
  const { isRecoveryGrantActive, recoveryGrantMs } = await loadRecoveryGrant();
  const concesso = Date.UTC(2026, 10, 16, 9, 0, 0);
  const scadenza = concesso + recoveryGrantMs;

  assert.equal(isRecoveryGrantActive(scadenza, scadenza), false, "alla scadenza esatta");
  assert.equal(isRecoveryGrantActive(scadenza, scadenza + 1), false, "un millisecondo dopo");
  assert.equal(isRecoveryGrantActive(scadenza, scadenza + recoveryGrantMs), false, "molto dopo");
  assert.equal(isRecoveryGrantActive(null, concesso), false, "senza permesso");
});
