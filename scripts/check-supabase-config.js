#!/usr/bin/env node
/**
 * Controlla la configurazione di autenticazione del progetto Supabase (hostato) e segnala
 * se non corrisponde a quella attesa. Evita guasti silenziosi come site_url su localhost o
 * indirizzi di ritorno mancanti, che rompono il recupero password e il login.
 *
 * Legge la configurazione via Management API (GET /v1/projects/{ref}/config/auth), quindi
 * serve un token personale (PAT) con permesso auth_config_read, MAI la chiave di servizio.
 *
 *   export SUPABASE_ACCESS_TOKEN=sbp_...   (o SUPABASE_MANAGEMENT_TOKEN / SUPABASE_PAT)
 *   export SUPABASE_URL=https://<ref>.supabase.co   (o VITE_SUPABASE_URL)
 *   node scripts/check-supabase-config.js
 *
 * Opzioni:
 *   --project-ref <ref>     ref del progetto (altrimenti da SUPABASE_URL/VITE_SUPABASE_URL)
 *   --access-token <token>  PAT (altrimenti da SUPABASE_ACCESS_TOKEN / SUPABASE_MANAGEMENT_TOKEN / SUPABASE_PAT)
 *   --expected <file.json>  file JSON con i valori attesi (sovrascrive i default integrati)
 *   --json                  stampa solo un oggetto JSON con esito e dettagli
 *   --help                  questo testo
 *
 * Variabili d'ambiente accettate:
 *   SUPABASE_URL, VITE_SUPABASE_URL
 *   SUPABASE_ACCESS_TOKEN, SUPABASE_MANAGEMENT_TOKEN, SUPABASE_PAT
 *
 * Il token serve solo in locale: non va nel codice né in chat. Il .gitignore esclude i file
 * .env*, ma questo script non legge alcun segreto dal progetto.
 *
 * Codice di uscita: 0 se tutto corrisponde, 1 se c'è almeno una differenza o un errore.
 */
import { readFileSync } from "node:fs";

const MANAGEMENT_API = "https://api.supabase.com";

// Valori attesi di default, allineati a supabase/config.toml e a DA_FARE_TU.md.
// Sovrascrivibili con --expected <file.json>.
const DEFAULT_EXPECTED = {
  site_url: "https://grfenix.vercel.app",
  // Ogni indirizzo qui deve essere presente fra quelli consentiti (uri_allow_list).
  requiredRedirectUrls: [
    "https://grfenix.vercel.app/imposta-password",
    "http://localhost:5173",
    "http://localhost:5173/imposta-password",
  ],
  // true = registrazione disabilitata (accesso su invito).
  disable_signup: true,
  // true = conferma email obbligatoria (mailer_autoconfirm deve essere false).
  email_confirmation_required: true,
  minimum_password_length: 12,
  password_requirements: "lower_upper_letters_digits_symbols",
  // captcha: non imposto di default (ancora non attivato). Se impostato, viene verificato.
  security_captcha_enabled: null,
  security_captcha_provider: null,
};

function usage() {
  console.log("Uso: node scripts/check-supabase-config.js [--project-ref <ref>] [--access-token <token>] [--expected <file.json>] [--json]");
  console.log("Variabili: SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_ACCESS_TOKEN/SUPABASE_MANAGEMENT_TOKEN/SUPABASE_PAT.");
  console.log("Il token personale (sbp_...) si crea in Supabase Dashboard → Account → Access Tokens.");
}

function readOptions(argv) {
  const options = {
    projectRef: "",
    accessToken: "",
    expectedFile: "",
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--project-ref") {
      options.projectRef = String(argv[i + 1] || "").trim();
      i += 1;
    } else if (flag === "--access-token") {
      options.accessToken = String(argv[i + 1] || "").trim();
      i += 1;
    } else if (flag === "--expected") {
      options.expectedFile = String(argv[i + 1] || "").trim();
      i += 1;
    } else if (flag === "--json") {
      options.json = true;
    } else if (flag === "--help" || flag === "-h") {
      options.help = true;
    } else {
      throw new Error(`Opzione non riconosciuta: ${flag}`);
    }
  }
  return options;
}

function projectRefFromUrl(url) {
  if (!url) return "";
  try {
    const host = new URL(url).hostname; // <ref>.supabase.co
    const match = host.match(/^([a-z0-9]+)\.supabase\./i);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

function parseRedirectUrls(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function mergeExpected(base, override) {
  const result = { ...base };
  if (!override || typeof override !== "object") return result;
  for (const key of Object.keys(override)) {
    if (key === "requiredRedirectUrls" && Array.isArray(override[key])) {
      result.requiredRedirectUrls = override[key].slice();
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

async function fetchAuthConfig(ref, token) {
  const response = await fetch(`${MANAGEMENT_API}/v1/projects/${encodeURIComponent(ref)}/config/auth`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      (body && typeof body === "object" && (body.message || body.error || body.msg)) ||
      (typeof body === "string" && body) ||
      response.statusText;
    throw new Error(`Lettura della configurazione non riuscita (HTTP ${response.status}): ${message}`);
  }
  if (!body || typeof body !== "object") {
    throw new Error("La risposta del Management API non è un oggetto JSON.");
  }
  return body;
}

function checkConfig(config, expected) {
  const findings = []; // { field, status: 'ok'|'mismatch'|'info', expected, actual, message }
  const mismatches = [];

  // site_url
  const siteUrl = config.site_url;
  if (expected.site_url !== undefined && expected.site_url !== null) {
    if (siteUrl === expected.site_url) {
      findings.push({ field: "site_url", status: "ok", expected: expected.site_url, actual: siteUrl });
    } else {
      findings.push({ field: "site_url", status: "mismatch", expected: expected.site_url, actual: siteUrl });
      mismatches.push(`site_url: atteso "${expected.site_url}", trovato "${siteUrl ?? "(assente)"}".`);
    }
  } else {
    findings.push({ field: "site_url", status: "info", actual: siteUrl });
  }

  // redirect URLs (uri_allow_list)
  const redirectUrls = parseRedirectUrls(config.uri_allow_list);
  const redirectSet = new Set(redirectUrls);
  const required = Array.isArray(expected.requiredRedirectUrls) ? expected.requiredRedirectUrls : [];
  const missingRedirects = required.filter((url) => !redirectSet.has(url));
  if (missingRedirects.length === 0 && required.length > 0) {
    findings.push({
      field: "redirect_urls",
      status: "ok",
      expected: required,
      actual: redirectUrls,
      message: `Tutti i ${required.length} indirizzi richiesti sono presenti (${redirectUrls.length} totali).`,
    });
  } else if (required.length > 0) {
    findings.push({
      field: "redirect_urls",
      status: "mismatch",
      expected: required,
      actual: redirectUrls,
      message: `Mancano ${missingRedirects.length} indirizzi richiesti: ${missingRedirects.join(", ")}.`,
    });
    mismatches.push(`redirect_urls: mancano ${missingRedirects.join(", ")}.`);
  }
  const extraRedirects = redirectUrls.filter((u) => !required.includes(u));

  // disable_signup (true = registrazione disabilitata)
  const disableSignup = config.disable_signup;
  if (typeof expected.disable_signup === "boolean") {
    const ok = disableSignup === expected.disable_signup;
    findings.push({
      field: "disable_signup",
      status: ok ? "ok" : "mismatch",
      expected: expected.disable_signup,
      actual: disableSignup,
    });
    if (!ok) {
      mismatches.push(
        `disable_signup: atteso ${expected.disable_signup}, trovato ${disableSignup ?? "(assente)"}.`,
      );
    }
  } else {
    findings.push({ field: "disable_signup", status: "info", actual: disableSignup });
  }

  // email confirmation: mailer_autoconfirm true = auto-conferma (nessuna conferma email)
  const mailerAutoconfirm = config.mailer_autoconfirm;
  if (typeof expected.email_confirmation_required === "boolean") {
    const autoconfirmExpected = !expected.email_confirmation_required;
    const ok = mailerAutoconfirm === autoconfirmExpected;
    findings.push({
      field: "email_confirmation",
      status: ok ? "ok" : "mismatch",
      expected: expected.email_confirmation_required ? "conferma email obbligatoria" : "auto-conferma",
      actual:
        mailerAutoconfirm === true
          ? "auto-conferma (nessuna email)"
          : mailerAutoconfirm === false
            ? "conferma email obbligatoria"
            : mailerAutoconfirm,
    });
    if (!ok) {
      mismatches.push(
        `conferma email: atteso ${expected.email_confirmation_required ? "obbligatoria" : "auto-conferma"}, trovato ${mailerAutoconfirm === true ? "auto-conferma" : "obbligatoria"}.`,
      );
    }
  } else {
    findings.push({ field: "email_confirmation", status: "info", actual: mailerAutoconfirm });
  }

  // minimum password length
  const minPwdLen = config.minimum_password_length;
  if (typeof expected.minimum_password_length === "number") {
    const ok = typeof minPwdLen === "number" && minPwdLen >= expected.minimum_password_length;
    findings.push({
      field: "minimum_password_length",
      status: ok ? "ok" : "mismatch",
      expected: `>= ${expected.minimum_password_length}`,
      actual: minPwdLen,
    });
    if (!ok) {
      mismatches.push(
        `minimum_password_length: atteso >= ${expected.minimum_password_length}, trovato ${minPwdLen ?? "(assente)"}.`,
      );
    }
  } else {
    findings.push({ field: "minimum_password_length", status: "info", actual: minPwdLen });
  }

  // password requirements
  const pwdReq = config.password_requirements;
  if (typeof expected.password_requirements === "string" && expected.password_requirements) {
    const ok = pwdReq === expected.password_requirements;
    findings.push({
      field: "password_requirements",
      status: ok ? "ok" : "mismatch",
      expected: expected.password_requirements,
      actual: pwdReq,
    });
    if (!ok) {
      mismatches.push(
        `password_requirements: atteso "${expected.password_requirements}", trovato "${pwdReq ?? "(assente)"}".`,
      );
    }
  } else {
    findings.push({ field: "password_requirements", status: "info", actual: pwdReq });
  }

  // captcha
  const captchaEnabled = config.security_captcha_enabled;
  const captchaProvider = config.security_captcha_provider;
  if (typeof expected.security_captcha_enabled === "boolean") {
    const ok = captchaEnabled === expected.security_captcha_enabled;
    findings.push({
      field: "security_captcha_enabled",
      status: ok ? "ok" : "mismatch",
      expected: expected.security_captcha_enabled,
      actual: captchaEnabled,
    });
    if (!ok) {
      mismatches.push(
        `security_captcha_enabled: atteso ${expected.security_captcha_enabled}, trovato ${captchaEnabled ?? "(assente)"}.`,
      );
    }
  } else {
    findings.push({ field: "security_captcha_enabled", status: "info", actual: captchaEnabled });
  }
  if (typeof expected.security_captcha_provider === "string" && expected.security_captcha_provider) {
    const ok = captchaProvider === expected.security_captcha_provider;
    findings.push({
      field: "security_captcha_provider",
      status: ok ? "ok" : "mismatch",
      expected: expected.security_captcha_provider,
      actual: captchaProvider,
    });
    if (!ok) {
      mismatches.push(
        `security_captcha_provider: atteso "${expected.security_captcha_provider}", trovato "${captchaProvider ?? "(assente)"}".`,
      );
    }
  } else {
    findings.push({ field: "security_captcha_provider", status: "info", actual: captchaProvider });
  }

  return { findings, mismatches, redirectUrls, captchaEnabled, captchaProvider };
}

function printHuman(result, config, expected, ref) {
  const { findings, mismatches, redirectUrls, captchaEnabled, captchaProvider } = result;

  console.log("Controllo configurazione Supabase (auth)");
  console.log(`Progetto: ${ref}`);
  console.log("");

  console.log("Campi verificati:");
  for (const f of findings) {
    const icon = f.status === "ok" ? "OK  " : f.status === "mismatch" ? "DIFF" : "INFO";
    const detail =
      f.expected !== undefined
        ? `atteso=${JSON.stringify(f.expected)} trovato=${JSON.stringify(f.actual)}`
        : `trovato=${JSON.stringify(f.actual)}`;
    console.log(`  [${icon}] ${f.field}: ${detail}${f.message ? " — " + f.message : ""}`);
  }
  console.log("");

  console.log(`Indirizzi di ritorno consentiti (${redirectUrls.length}):`);
  for (const url of redirectUrls) console.log(`  - ${url}`);
  console.log("");

  // Avvisi di sicurezza non bloccanti (stato attuale, anche se atteso).
  console.log("Avvisi:");
  if (captchaEnabled !== true) {
    console.log("  - Captcha disattivato: abilitalo quando le chiavi sono configurate (DA_FARE_TU.md §1).");
  } else {
    console.log(`  - Captcha attivo (${captchaProvider || "provider non indicato"}).`);
  }
  if (config.mailer_autoconfirm === true) {
    console.log("  - Conferma email disattivata: gli account si attivano senza verifica della casella.");
  }
  if (config.disable_signup !== true) {
    console.log("  - Registrazione pubblica abilitata: verificare che sia intenzionale.");
  }
  console.log("");

  if (mismatches.length === 0) {
    console.log("ESITO: configurazione conforme a quella attesa.");
  } else {
    console.log(`ESITO: ${mismatches.length} differenza/e rispetto a quella attesa:`);
    for (const m of mismatches) console.log(`  - ${m}`);
    console.log("");
    console.log("Correggi in Supabase Dashboard → Authentication → URL Configuration / Providers / Passwords,");
    console.log("oppure con Management API PATCH /v1/projects/{ref}/config/auth.");
  }
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const ref = options.projectRef || projectRefFromUrl(url);
  if (!ref) {
    throw new Error(
      "Manca il ref del progetto: passa --project-ref <ref> oppure imposta SUPABASE_URL/VITE_SUPABASE_URL.",
    );
  }

  const token =
    options.accessToken ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_MANAGEMENT_TOKEN ||
    process.env.SUPABASE_PAT ||
    "";
  if (!token) {
    throw new Error(
      "Manca il token personale (PAT): esporta SUPABASE_ACCESS_TOKEN (sbp_...) oppure passa --access-token. " +
        "Non usare la chiave di servizio: serve il permesso auth_config_read.",
    );
  }
  // Controllo di forma minimo: il PAT Supabase inizia tipicamente con sbp_.
  if (token.startsWith("sb_secret_") || token.startsWith("sb_publishable_")) {
    throw new Error("È stata passata una chiave del progetto (secret/publishable): serve un token personale (sbp_...).");
  }

  let expected = { ...DEFAULT_EXPECTED };
  if (options.expectedFile) {
    let raw;
    try {
      raw = readFileSync(options.expectedFile, "utf8");
    } catch (error) {
      throw new Error(`Impossibile leggere il file dei valori attesi "${options.expectedFile}": ${error.message}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Il file dei valori attesi non è JSON valido: ${error.message}`);
    }
    expected = mergeExpected(expected, parsed);
  }

  const config = await fetchAuthConfig(ref, token);
  const result = checkConfig(config, expected);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          projectRef: ref,
          ok: result.mismatches.length === 0,
          mismatches: result.mismatches,
          findings: result.findings,
          redirectUrls: result.redirectUrls,

          captcha: { enabled: result.captchaEnabled, provider: result.captchaProvider },
          expected,
        },
        null,
        2,
      ),
    );
  } else {
    printHuman(result, config, expected, ref);
  }

  if (result.mismatches.length > 0) {
    process.exitCode = 1;
  }
}

// Esporta per i test, senza avviare main() quando il modulo viene importato.
export { checkConfig, parseRedirectUrls, projectRefFromUrl, mergeExpected, DEFAULT_EXPECTED };

const isEntryPoint =
  typeof process !== "undefined" &&
  !!process.argv[1] &&
  process.argv[1].endsWith("check-supabase-config.js");
if (isEntryPoint) {
  main().catch((error) => {
    console.error(`Errore: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
