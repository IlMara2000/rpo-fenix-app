import test from "node:test";
import assert from "node:assert/strict";
import { decideOutcome } from "../scripts/python-test-outcome.js";

// Il guard di `npm run test:py` deve trasformare in fallimento anche l'avviso
// che una risorsa abbandonata stampa nel __del__, dove unittest non può
// sollevare: senza questo controllo il run resterebbe verde.

test("run pulito: esce 0 e non segnala nulla", () => {
  const outcome = decideOutcome({
    status: 0,
    stdout: ".............\nRan 13 tests in 0.204s\n\nOK\n",
    stderr: "",
  });
  assert.equal(outcome.exitCode, 0);
  assert.equal(outcome.warningCount, 0);
  assert.equal(outcome.message, "");
});

test("test falliti: mantiene il codice di uscita di unittest", () => {
  const outcome = decideOutcome({
    status: 2,
    stdout: "FAILED (failures=1)\n",
    stderr: "",
  });
  assert.equal(outcome.exitCode, 2);
  assert.equal(outcome.message, "");
});

test("ResourceWarning con status 0: esce 1 e lo spiega", () => {
  const outcome = decideOutcome({
    status: 0,
    stdout: "Ran 13 tests in 0.204s\n\nOK\n",
    stderr: [
      "Exception ignored in: <function _TemporaryFileWrapper.__del__>",
      "ResourceWarning: Implicitly cleaning up <HTTPError 401: 'Unauthorized'>",
    ].join("\n"),
  });
  assert.equal(outcome.exitCode, 1);
  assert.equal(outcome.warningCount, 1);
  assert.match(outcome.message, /1 ResourceWarning/);
  assert.match(outcome.message, /non è stata chiusa/);
});

test("fallimento vero e warning insieme: vince il codice di unittest", () => {
  const outcome = decideOutcome({
    status: 1,
    stdout: "",
    stderr: "ResourceWarning: unclosed file <_io.BufferedReader name='x'>",
  });
  assert.equal(outcome.exitCode, 1);
  assert.equal(outcome.warningCount, 1);
});
