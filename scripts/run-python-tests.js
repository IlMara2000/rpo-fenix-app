#!/usr/bin/env node
/**
 * Esegue i test Python con l'interprete indicato in `.python-version`.
 *
 * Serve perché `python3` di sistema può essere un'altra minor: la CI installa la
 * versione del repo, e anche in locale i test devono girare su quella, oppure
 * dirlo chiaramente invece di misurare un'interprete diverso in silenzio.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const wanted = readFileSync(new URL("../.python-version", import.meta.url), "utf8").trim();
const wantedMinor = wanted.split(".").slice(0, 2).join(".");

function versionOf(binary) {
  try {
    const output = execFileSync(binary, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const match = /Python\s+(\d+\.\d+\.\d+)/.exec(output);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const candidates = [wantedMinor ? `python${wantedMinor}` : "", "python3", "python"].filter(Boolean);
const found = [];
let chosen = "";

for (const binary of candidates) {
  const version = versionOf(binary);
  if (!version) {
    continue;
  }
  found.push(`${binary} (${version})`);
  if (version.split(".").slice(0, 2).join(".") === wantedMinor) {
    chosen = binary;
    break;
  }
}

if (!chosen) {
  console.error(`Test Python non eseguiti: .python-version chiede ${wanted}.`);
  console.error(`Interpreter trovati: ${found.length ? found.join(", ") : "nessuno"}.`);
  console.error(
    `Installa ${wanted} (pyenv install ${wanted} oppure brew install python@${wantedMinor}) o allinea .python-version.`,
  );
  process.exit(1);
}

console.log(`Test Python con ${chosen} (${versionOf(chosen)}), come da .python-version (${wanted}).`);

// ResourceWarning vale come errore. Serve doppio: il filtro fa fallire subito
// l'avviso emesso mentre il test gira, mentre una risorsa abbandonata si
// lamenta nel __del__ (che non può sollevare) e resta nel testo: la scansione
// finale intercetta anche quel caso, senza zittire né declassare nulla.
const run = spawnSync(
  chosen,
  ["-W", "error::ResourceWarning", "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"],
  { encoding: "utf8" },
);
process.stdout.write(run.stdout ?? "");
process.stderr.write(run.stderr ?? "");

if (run.error) {
  console.error(`Test Python non avviati: ${run.error.message}`);
  process.exit(1);
}
if (run.status !== 0) {
  process.exit(typeof run.status === "number" ? run.status : 1);
}

const warnings = (run.stdout + run.stderr).match(/ResourceWarning/g)?.length ?? 0;
if (warnings) {
  console.error(`\nTest Python falliti: ${warnings} ResourceWarning.`);
  console.error("Una risorsa non è stata chiusa: chiudila dove la apri, non filtrare l'avviso.");
  process.exit(1);
}
