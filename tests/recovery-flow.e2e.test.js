import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Prova del percorso di recupero con un link vero, generato da scripts/recovery-link.js.
 *
 *   FENIX_RECOVERY_LINK=<link>                  percorso completo: permesso attivo, salvataggio,
 *                                               sessione chiusa
 *   FENIX_RECOVERY_LINK_SCADENZA=<altro link>   scadenza del permesso e chiusura della sessione
 *   FENIX_NEW_PASSWORD=<password>               facoltativa, altrimenti viene generata
 *   FENIX_CHROMIUM=<percorso>                   facoltativa, se il browser non viene trovato
 *
 * Ogni link vale una sola volta, quindi i due percorsi chiedono due link diversi.
 *
 * La scadenza non accorcia nulla nel codice: l'applicazione continua a usare i suoi quindici
 * minuti anche in produzione. È la prova che installa un orologio finto nella pagina e lo fa
 * avanzare di sedici minuti, così il timer reale scatta in un istante.
 */

const require = createRequire(import.meta.url);
const hasDriver = (() => {
  try {
    require.resolve("playwright-core");
    return true;
  } catch {
    return false;
  }
})();

const linkSalvataggio = process.env.FENIX_RECOVERY_LINK || "";
const linkScadenza = process.env.FENIX_RECOVERY_LINK_SCADENZA || "";

function buildNumber(name) {
  const found = name.match(/(\d+)$/);
  return found ? Number(found[1]) : 0;
}

/** Cerca un Chromium già presente sulla macchina, senza scaricarne uno. */
function findBrowser() {
  const candidates = [];
  if (process.env.FENIX_CHROMIUM) candidates.push(process.env.FENIX_CHROMIUM);
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(cache)) {
    const builds = readdirSync(cache)
      .filter((name) => name.startsWith("chromium_headless_shell-"))
      .sort((a, b) => buildNumber(b) - buildNumber(a));
    for (const build of builds) {
      for (const platform of ["chrome-headless-shell-mac-arm64", "chrome-headless-shell-mac-x64", "chrome-headless-shell-linux64"]) {
        candidates.push(join(cache, build, platform, "chrome-headless-shell"));
      }
    }
  }
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  );
  return candidates.find((path) => existsSync(path)) || null;
}

const browserPath = hasDriver ? findBrowser() : null;

function skipReason(link) {
  if (!hasDriver) return "manca playwright-core: npm install";
  if (!browserPath) return "nessun Chromium trovato: imposta FENIX_CHROMIUM";
  if (!link) return "manca il link di recupero: vedi scripts/recovery-link.js";
  return false;
}

function newPassword() {
  return process.env.FENIX_NEW_PASSWORD || `Fenix-${randomBytes(9).toString("base64url")}`;
}

/** Chiavi del token di sessione lasciate dal client Supabase nel browser. */
function sessionKeysInPage() {
  return Object.keys(localStorage).filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
}

async function withPage(run) {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    return await run(await browser.newPage());
  } finally {
    await browser.close();
  }
}

async function expectNoSession(page, azione) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await page.evaluate(sessionKeysInPage)).length === 0) return;
    await page.waitForTimeout(250);
  }
  assert.fail(`la sessione è ancora aperta dopo ${azione}`);
}

test(
  "il link di recupero apre il modulo senza chiedere la password attuale, salva e chiude la sessione",
  { skip: skipReason(linkSalvataggio) },
  async () => {
    await withPage(async (page) => {
      await page.goto(linkSalvataggio, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('form.login-form input[name="password"]', { timeout: 30000 });

      // Permesso attivo: chi arriva dal link sceglie la password senza confermare quella vecchia.
      assert.equal(
        await page.locator('form.login-form input[name="attuale"]').count(),
        0,
        "il permesso è attivo, quindi non deve essere chiesta la password attuale",
      );

      const password = newPassword();
      await page.fill('form.login-form input[name="password"]', password);
      await page.fill('form.login-form input[name="conferma"]', password);
      await page.click('button[type="submit"]');

      await page.waitForSelector("text=Password aggiornata", { timeout: 30000 });
      await expectNoSession(page, "il salvataggio");

      // Con la sessione chiusa il gestionale non si apre: si torna all'accesso.
      await page.goto(new URL("/crm", linkSalvataggio).href, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('form.login-form input[name="email"]', { timeout: 30000 });
    });
  },
);

test(
  "allo scadere del permesso il modulo si chiude e la sessione nata dal link viene chiusa",
  { skip: skipReason(linkScadenza) },
  async () => {
    await withPage(async (page) => {
      // Orologio finto installato prima della navigazione: i quindici minuti veri si
      // percorrono in un istante e il codice dell'applicazione non cambia.
      await page.clock.install();
      await page.goto(linkScadenza, { waitUntil: "domcontentloaded" });

      // La schermata compare dopo un turno di timer: si avanza finché il modulo è pronto,
      // lasciando scorrere il tempo reale perché le chiamate di rete possano rispondere.
      for (let step = 0; step < 120; step += 1) {
        if (await page.locator('form.login-form input[name="password"]').count()) break;
        await page.clock.runFor(250);
        await page.waitForTimeout(100);
      }
      await page.waitForSelector('form.login-form input[name="password"]', { timeout: 30000 });
      assert.equal(
        await page.locator('form.login-form input[name="attuale"]').count(),
        0,
        "prima della scadenza il permesso è ancora attivo",
      );

      await page.clock.fastForward(16 * 60 * 1000);

      await page.waitForSelector("text=tempo per impostare la nuova password è scaduto", {
        timeout: 30000,
      });
      await expectNoSession(page, "la scadenza del permesso");

      await page.goto(new URL("/crm", linkScadenza).href, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('form.login-form input[name="email"]', { timeout: 30000 });
    });
  },
);
