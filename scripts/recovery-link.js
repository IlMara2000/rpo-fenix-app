#!/usr/bin/env node
/**
 * Genera un link di recupero valido per un account di prova, senza passare dalla posta.
 *
 * Serve a vedere il percorso completo di /imposta-password: permesso attivo, scadenza e
 * chiusura della sessione. La chiave di servizio si legge solo dall'ambiente e non viene
 * mai stampata: mettila in una variabile della shell oppure in un file .env locale, che
 * il .gitignore esclude.
 *
 *   export SUPABASE_SERVICE_ROLE_KEY=...   (e SUPABASE_URL, se non è nel .env)
 *   node scripts/recovery-link.js --email prova@example.invalid --create
 *   node --env-file=.env.local scripts/recovery-link.js --email prova@example.invalid --local
 *
 * Opzioni:
 *   --email <indirizzo>  account di prova (o variabile FENIX_TEST_EMAIL)
 *   --local              porta il link su http://localhost:5173 invece che in produzione
 *   --create             crea l'account di prova se non esiste (password stampata una volta)
 *   --json               stampa solo un oggetto JSON, per usarlo in uno script
 *   --help               questo testo
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const redirectProduzione = "https://grfenix.vercel.app/imposta-password";
const redirectLocale = "http://localhost:5173/imposta-password";

function usage() {
  console.log(`Uso: node scripts/recovery-link.js --email <indirizzo> [--local] [--create] [--json]`);
  console.log(`La chiave di servizio si legge da SUPABASE_SERVICE_ROLE_KEY, l'indirizzo del`);
  console.log(`progetto da SUPABASE_URL o VITE_SUPABASE_URL.`);
}

function readOptions(argv) {
  const options = {
    email: process.env.FENIX_TEST_EMAIL || "",
    local: false,
    create: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--email") {
      options.email = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
    } else if (flag === "--local") {
      options.local = true;
    } else if (flag === "--create") {
      options.create = true;
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

/**
 * Controlla che la chiave sia quella di servizio senza stamparla: una chiave pubblicabile
 * qui darebbe errori di permesso poco chiari, e un token con ruolo diverso è un errore da
 * fermare subito.
 */
function assertServiceKey(key) {
  if (!key) {
    throw new Error(
      "Manca SUPABASE_SERVICE_ROLE_KEY: esportala nella shell o passa --env-file con un file locale escluso da git.",
    );
  }
  if (key.startsWith("sb_secret_")) return;
  if (key.startsWith("sb_publishable_")) {
    throw new Error("È stata passata la chiave pubblicabile: serve quella di servizio (service_role).");
  }
  const parts = key.split(".");
  if (parts.length !== 3) {
    throw new Error("Formato della chiave non riconosciuto: serve la chiave di servizio del progetto.");
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("La chiave non è leggibile come token: serve la chiave di servizio del progetto.");
  }
  if (payload.role !== "service_role") {
    throw new Error(`La chiave ha ruolo "${payload.role}", serve "service_role".`);
  }
}

function generatePassword() {
  return `Fenix-${randomBytes(9).toString("base64url")}`;
}

async function generateLinkFor(admin, email, redirectTo) {
  return admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  if (!options.email) {
    usage();
    throw new Error("Serve l'indirizzo dell'account di prova: --email <indirizzo>.");
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  if (!url) {
    throw new Error("Manca SUPABASE_URL (o VITE_SUPABASE_URL): è l'indirizzo del progetto Supabase.");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  assertServiceKey(serviceKey);

  // Nessuna sessione da conservare: il client serve solo per le chiamate di amministrazione.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const redirectTo = options.local ? redirectLocale : redirectProduzione;

  let password = "";
  let { data, error } = await generateLinkFor(admin, options.email, redirectTo);
  if (error && /not found|user.*missing|does not exist/i.test(error.message)) {
    if (!options.create) {
      throw new Error(
        `L'indirizzo ${options.email} non ha un account. Aggiungi --create per creare l'account di prova.`,
      );
    }
    password = generatePassword();
    const { error: createError } = await admin.auth.admin.createUser({
      email: options.email,
      password,
      email_confirm: true,
    });
    if (createError) throw new Error(`Creazione dell'account non riuscita: ${createError.message}`);
    ({ data, error } = await generateLinkFor(admin, options.email, redirectTo));
  }
  if (error) throw new Error(`Generazione del link non riuscita: ${error.message}`);
  if (!data?.properties?.action_link) throw new Error("Supabase non ha restituito nessun link.");

  const link = data.properties.action_link;
  // Se è diverso da quello chiesto, l'indirizzo non è fra quelli consentiti nel progetto e
  // Supabase ha ripiegato su site_url: è la causa tipica di "il link porta al posto sbagliato".
  const redirectEffettivo = data.properties.redirect_to || "(non indicato)";
  const redirectDiverso = Boolean(data.properties.redirect_to) && data.properties.redirect_to !== redirectTo;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          email: options.email,
          link,
          redirectTo,
          redirectEffettivo,
          password: password || undefined,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Link di recupero per ${options.email}`);
  if (password) console.log(`Account di prova creato, password: ${password}`);
  console.log("");
  console.log(link);
  console.log("");
  console.log(`Indirizzo di ritorno richiesto: ${redirectTo}`);
  console.log(`Indirizzo usato da Supabase:  ${redirectEffettivo}`);
  if (redirectDiverso) {
    console.log("");
    console.log("ATTENZIONE: Supabase ha ripiegato su un altro indirizzo, quindi questo non è");
    console.log("fra quelli consentiti nel progetto (Authentication → URL Configuration).");
  }
  console.log("");
  console.log("Cosa guardare, aprendo il link nello stesso browser:");
  console.log("  1. la schermata non deve chiedere la password attuale;");
  console.log("  2. dopo aver salvato, la sessione viene chiusa e si torna all'accesso;");
  console.log("  3. se lasci la pagina aperta, dopo 15 minuti il permesso scade, la sessione");
  console.log("     viene chiusa e compare il messaggio di tempo scaduto.");
  console.log("");
  console.log("Il link vale una sola volta e scade dopo un'ora: non incollarlo in chat o issue.");
}

main().catch((error) => {
  console.error(`Errore: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
