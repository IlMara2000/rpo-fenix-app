# Analisi sicurezza e conformità — Fenix Suite / RPO Fenix

Data: 1 novembre 2026
Perimetro: codice, configurazione di deploy e testi visibili all'utente.

## 0. Cosa è stato analizzato

Il workspace contiene **due codebase diversi**:

| | Dove | Stack | Stato |
|---|---|---|---|
| A | working tree locale, `main` = `565db60` | Next.js 14.1 (pages router) + API Python | versione precedente, non più su GitHub |
| B | `origin/main` = `3ed7ff7` ("Refine compact CRM filters…") | Vite + React 19 + Supabase + Vercel Functions | piattaforma attuale (5 moduli: CRM, PWS, RPO, Telefonista, Planimetrie) |

Il branch remoto è stato riscritto con un force push: il codice locale **non** corrisponde a quello su GitHub. L'analisi copre entrambi, perché eventuali deploy vecchi restano un rischio.

Metodo: lettura integrale dei file applicativi (esclusi i due monoliti `src/main.tsx` ~7.000 righe e `src/styles.css` ~10.500 righe, verificati con ricerche mirate), revisione di RLS/migrazioni Supabase, `npm audit` sul codebase A, verifica HTTP del dominio di produzione.

### Limiti dichiarati

- Non ho letto il **valore** dei segreti presenti in `.env.local` (solo i nomi delle variabili).
- Non ho potuto verificare le **impostazioni reali del progetto Supabase** (signup, conferma email, regione, migrazioni applicate): `supabase/config.toml` è la configurazione locale e può non riflettere il progetto hostato.
- Il dominio `rpo-fenix-app.vercel.app` oggi risponde `DEPLOYMENT_NOT_FOUND`: non esiste un deployment live da testare.
- `npm audit` sul codebase B non è stato eseguito (dipendenze non installate in locale).
- Nessun test dinamico di login/RLS contro un progetto Supabase reale.

---

## 1. Verdetto sintetico

**No, non è tutto regolare.**

Il **codice del codebase B è di buon livello**: RLS su tutte le tabelle, autorizzazione server-side fail-closed, quote AI atomiche, limiti sugli upload, errori generici. Non è "scritto da dilettanti".

I problemi sono altrove e sono di tre tipi:

1. **Un segreto reale finito in Git** (codebase A) — critico, da ruotare oggi.
2. **Un vecchio stack senza alcuna autenticazione** che spende crediti OpenAI di tasca del proprietario e espone un tunnel verso Stable Diffusion WebUI — critico se ancora raggiungibile.
3. **Zero presidi legali**: nessuna privacy policy pubblicata, consenso raccolto su un'informativa inesistente, footer con "Termini e condizioni | Privacy Policy" non cliccabili, un form contatti che finge di inviare i messaggi. Questa è la parte più scoperta di tutta la piattaforma.

---

## 2. Criticità da risolvere subito

### C1 — Chiave OpenAI committata in Git

`rpo-fenix-app/.env.local` è **tracciato da Git** (`git ls-files` lo elenca) nel commit `565db60`. Contiene:

```
OPENAI_API_KEY
OPENAI_IMAGE_MODEL
OPENAI_IMAGE_QUALITY
```

Il valore ha lunghezza e prefisso (`sk-…`, 179 caratteri) coerenti con una chiave API reale. Non l'ho stampato: non serve, il problema è la presenza del file, non il contenuto.

- `.gitignore` ignora `.env` ma **non** `.env.local` → errore che si ripeterà ad ogni nuovo file `.env.local`.
- Su `origin/main` il file oggi non c'è (la storia è stata riscritta), ma **il commit esiste ancora in locale** e, se è stato pushato in passato, GitHub continua a servirlo per SHA anche dopo un force push.

**Azioni:**
1. Revocare e rigenerare la chiave su platform.openai.com (prima di ogni altra cosa).
2. Controllare i log di consumo OpenAI per attività anomale.
3. `.gitignore`: sostituire `.env` con `.env*` + `!.env.example`.
4. `git rm --cached .env.local`.
5. Se il commit è stato pushato: ripulire la storia (BFG / git-filter-repo) e considerare la chiave compromessa in ogni caso.

### C2 — Codebase A: API senza autenticazione e tunnel ngrok

- `src/pages/api/planimetrie.js` chiama l'API OpenAI Images con la chiave del server e **non ha alcun controllo di accesso**: chiunque conosca l'URL può inviare immagini e consumare credito, senza rate limit né quote.
- `ngrok_config.json` è committato e `/api/get-ngrok` restituisce pubblicamente l'URL del tunnel. Il tunnel punta a una **Stable Diffusion WebUI locale**: esporla su Internet è pericoloso (è un servizio pensato per la rete locale, con superficie d'attacco ampia e storico di vulnerabilità RCE).
- Dipendenze: `npm audit` → **23 vulnerabilità (1 critica, 10 alte, 12 moderate)**; `next@14.1.0` è nella gamma di advisory critiche (SSRF nelle Server Actions e altre).
- Igiene: `postcss.config.js` e `postcss.config.mjs` coesistono, esiste un file `git` vuoto tracciato, `src/FenixMagicBox` è un *gitlink* verso `AUTOMATIC1111/stable-diffusion-webui` (AGPL-3.0) senza `.gitmodules`.

**Azioni:** verificare su Vercel che non esistano deployment attivi del vecchio progetto; se esistono, metterli offline. Chiudere il tunnel ngrok o proteggerlo. Non riutilizzare questo codebase.

---

## 3. Problemi alti

### A1 — Registrazione aperta = accesso alla suite interna

`supabase/config.toml` (codebase B):

```
enable_signup = true
enable_confirmations = false          # nessuna verifica email
minimum_password_length = 6
password_requirements = ""            # nessun requisito di complessità
```

Il flusso di login (`src/main.tsx`, `submitLogin`) crea il profilo se non esiste, e la policy `profiles_insert_own` consente `role = 'AGENTE'`, `status = 'Attivo'`. Quindi: chiunque possa registrarsi su Supabase ottiene un account **attivo** e entra nella piattaforma, pur vedendo solo i propri dati grazie alle RLS.

Non è una fuga di dati altrui, ma è: accesso non autorizzato a uno strumento "riservato", consumo delle quote AI (10/giorno per utente) e della quota Hugging Face, uso delle API RPO. Ed è in contraddizione diretta con "Accesso riservato" scritto nella schermata di login.

**Da verificare in dashboard Supabase:** Authentication → Sign In / Providers → "Allow new users to sign up". Se è attivo, è il punto da chiudere per primo.

**Azioni:** disattivare il signup pubblico; creare gli utenti solo via invito/admin; `enable_confirmations = true`; password minima 12 con requisiti; captcha; creare il profilo lato server (o con `status = 'Sospeso'` finché un admin non lo attiva).

### A2 — `/api/converter` e `/api/scanner` non richiedono autenticazione

Nel codebase B, `api/planimetrie-3d.js` usa correttamente `requireActiveUser`, ma i due convertitori Python (`api/converter.py`, `api/scanner.py`) non hanno alcun controllo: sono raggiungibili da chiunque e accettano upload fino a 4 MB. I limiti anti zip-bomb sono ottimi (`server/uploads.py`), manca il controllo di identità.

Il risultato: la UI è dietro login, ma le API che fanno il lavoro no. Compute gratuito per terzi e incoerenza con il modello di sicurezza.

**Azione:** applicare lo stesso controllo `requireActiveUser` (o un equivalente token-based nel handler Python) e un rate limit per utente/IP.

### A3 — Dati personali in chiaro nel browser

Il CRM salva nomi, telefoni, codici fiscali, note e dati catastali in `localStorage` sotto `fenix-private:<uid>:…` **senza cifratura**. Lo dichiara onestamente `docs/SECURITY_RELEASE.md`, ma resta un trattamento non adeguato rispetto all'art. 32 GDPR: chiunque abbia accesso al profilo del browser (dispositivo condiviso, postazione d'ufficio, backup, malware) legge l'intero portafoglio clienti.

**Azioni (in ordine di costo):** cifratura a riposo con WebCrypto e chiave derivata da passphrase; oppure spostare la fonte di verità su Supabase (già presente con RLS) e tenere il browser come cache effimera.

### A4 — Nessuna Content Security Policy

`vercel.json` imposta `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`. Mancano **CSP** e `Permissions-Policy`. Con i token di sessione in `localStorage`, un XSS diventerebbe furto di sessione: non ho trovato `dangerouslySetInnerHTML` né `innerHTML` (bene), ma la CSP è la difesa in profondità che oggi non c'è.

### A5 — Privacy policy e termini: non esistono

- `src/main.tsx:1903` — `<span>Termini e condizioni | Privacy Policy</span>`: è **testo semplice, non un link**. Non esiste alcuna pagina.
- `src/main.tsx:1885` — "Ho letto e accetto la privacy policy": si raccoglie un consenso riferito a un documento **che non viene mostrato né linkato**.
- `src/main.tsx:2005` — "Accesso riservato", ma non c'è alcuna informativa sul trattamento dei dati degli utenti interni.

Conseguenze: consenso invalido (art. 4(11) e art. 7 GDPR), informativa assente (art. 13/14), e per il D.Lgs. 70/2003 art. 7 mancano le informazioni obbligatorie sul prestatore del servizio (denominazione, sede, P.IVA, contatti).

---

## 4. Problemi medi

| # | Problema | Dove | Perché conta |
|---|---|---|---|
| M1 | **Il form contatti finge l'invio**: `onSubmit` aggiunge solo una classe CSS e mostra "Messaggio registrato."; nessun dato viene inviato | `src/main.tsx:1861-1891` | Raccoglie nome/email e un consenso senza finalità né informativa; il messaggio all'utente è falso. Rischio di pratica ingannevole (Codice del Consumo artt. 20-23) e di recensione negativa |
| M2 | **Claim di sicurezza non veri**: "Sessione locale protetta" e "Dati salvati nel browser" | `src/main.tsx:2014`, `:2018` | L'autenticazione è Supabase cloud e i dati stanno in localStorage **non cifrato**: l'affermazione è fuorviante proprio sul punto più delicato |
| M3 | **Terze parti e trasferimenti extra-UE non dichiarati**: immagini planimetrie, prompt e **nome del file** inviati a Hugging Face; auth/DB su Supabase | `api/planimetrie-3d.js` | Servono DPA (art. 28), informativa (art. 13) e base per il trasferimento (art. 44 ss.). Il nome del file può contenere dati del cliente |
| M4 | **Codice legacy di gestione account**: hash SHA-256 senza salt in localStorage, "password provvisoria" generata e mostrata a schermo | `src/main.tsx:~5690-5920` | Tecnicamente morto (il login usa solo Supabase), ma è una mina: se qualcuno lo riattiva, l'autenticazione è insicura. SHA-256 non è una KDF per password |
| M5 | **Limiti di orario account applicati solo lato client** (`accessStartHour`/`accessEndHour`) | `src/main.tsx:1145-1186` | Non sono un controllo di sicurezza: bypassabili. Se servono davvero, vanno imposti server-side |
| M6 | **`/api/client-context`**: hash dell'IP con salt statico `fenix-network:`, primi 24 hex, usa il **primo** valore di `X-Forwarded-For` | `api/client-context.js` | Non è anonimizzazione (IPv4 si forza per dizionario in minuti); il primo XFF è controllabile dal client. Il "networkId" viene poi salvato in localStorage: dato non necessario (art. 5(1)(c)) |
| M7 | **Amplificazione costi AI**: la quota è 1 per richiesta, ma una singola richiesta può generare fino a ~7 chiamate a modelli diversi (testo, vision, poi 2 modelli text-to-image, poi image-text-to-image, poi replicate) | `api/planimetrie-3d.js`, `generateRenderImage` | Con 10 richieste/giorno per utente il costo per utente non è quello atteso. Aggiungere contatore per chiamata provider e un budget complessivo |
| M8 | **Codebase A**: 23 vulnerabilità note, Next 14.1.0, config duplicate | vedi C2 | Se resta pubblico/deployato, è una superficie d'attacco inutile |

---

## 5. Rilievi minori / igiene

- Nessun rate limit né captcha sul login: la protezione dal brute force è delegata a Supabase → abilitare il captcha.
- `HSTS` non è in `vercel.json`: Vercel lo aggiunge di default sui domini propri, ma è meglio dichiararlo esplicitamente.
- `api/cyborg/import-census.js`: CORS di default `"*"` se `CYBORG_ALLOWED_ORIGINS` non è impostata, e fallback su `allowedOrigins[0]` invece di rifiutare. Il token è confrontato in modo timing-safe e `redirect: "error"` è corretto: la parte solida c'è, il default CORS è troppo permissivo.
- `Cache-Control: no-store` presente sulle API: corretto.
- Preferenze UI (`fenix-suite-active-module/page`) in localStorage: innocuo.
- Codebase A: `/api/check-server` legge un URL da file (non da input) e fa fetch: rischio SSRF basso, ma il file di configurazione non dovrebbe essere nel repo.

---

## 6. Conformità legale — checklist

| Voce | Stato | Nota |
|---|---|---|
| Informativa privacy (art. 13/14) | ❌ assente | Richiesta in home, login, form contatti e nei confronti dei clienti delle agenzie |
| Termini d'uso / EULA | ❌ assente | Il footer li nomina ma non esistono |
| Info precontrattuali prestatore (D.Lgs. 70/2003 art. 7) | ❌ assente | Denominazione, sede, P.IVA, PEC |
| Registro dei trattamenti (art. 30) | ❌ assente | CRM immobiliare + telemarketing = trattamento strutturato |
| Nomine a responsabile (art. 28) | ❌ non documentate | Supabase, Hugging Face, Vercel |
| Trasferimenti extra-UE (art. 44 ss.) | ❌ non dichiarati | Verificare la regione Supabase; HF/Vercel possono essere extra-UE |
| Diritti dell'interessato: export e cancellazione (art. 15/17) | ⚠️ parziale | Nessun flusso di cancellazione account; l'utente deve "contattare l'amministratore" |
| Retention / conservazione | ❌ non definita | I dati nel browser restano indefinitamente |
| Dipendenti e controlli a distanza (Statuto dei Lavoratori art. 4) | ⚠️ da valutare | PWS, agenda, log chiamate con durata e note: se usati per valutare il personale serve accordo/provvedimento e informativa ai lavoratori |
| Telemarketing / RPO | ⚠️ impianto ok, procedura da formalizzare | Il CRM ha i campi giusti (`privacyLegalBasis`, data consenso, versione informativa, revoca): vanno resi obbligatori e conservati come prova |
| AI Act (Reg. UE 2024/1689) — trasparenza art. 50 | ⚠️ ok in UI | La planimetria arredata è contenuto generato: non deve essere presentata come foto reale dell'immobile in una scheda commerciale |
| Cookie / storage policy | ⚠️ | Nessun tracker o analytics trovato: **non serve** un banner di consenso; serve però dichiarare lo storage tecnico (token di sessione) |
| Titolarità del marchio | ❌ da chiarire | Tre identità diverse: "FENIX GROUP", "REALINDI DEN SYSTEMS", repo `IlMara2000`. Verificare "FENIX GROUP" su UIBM/EUIPO |
| Simbolo ® | ✅ risolto | Nel vecchio codice c'era "REALINDI®DEN"; nel nuovo è stato tolto. Corretto: usare ® per un marchio non registrato è illecito |
| Licenze di terze parti | ✅ / ⚠️ | Font Google (OFL) e three.js (MIT) ok. Il vecchio tree includeva come submodule AUTOMATIC1111 stable-diffusion-webui (**AGPL-3.0**): se distribuito con un prodotto closed source sarebbe un problema. Oggi non è nel `main` |
| File LICENSE del prodotto | ❌ assente | Necessario prima di distribuire a clienti terzi |

---

## 7. "Scritto visivo" — testi da correggere

| Testo attuale | Dove | Problema | Correzione |
|---|---|---|---|
| "Termini e condizioni \| Privacy Policy" | `src/main.tsx:1903` | Non è un link, non esiste la pagina | Pubblicare le due pagine e renderle link reali |
| "Ho letto e accetto la privacy policy." | `:1885` | Consenso a un documento inesistente | Link all'informativa + testo "Ho letto l'informativa privacy" |
| "Messaggio registrato." | `:1891` | Falso: nessun messaggio viene inviato | Collegare a un endpoint/email oppure rimuovere il form |
| "Risposta rapida garantita" | `:1847` | Promessa non supportata da nulla | "Ti risponderemo entro 2 giorni lavorativi" (e mantenerlo) |
| "Sessione locale protetta" | `:2014` | Falso: sessione cloud Supabase | "Accesso protetto con Supabase" |
| "Dati salvati nel browser" | `:2018` | Vero ma da chiarire: non cifrati | "Dati operativi salvati sul dispositivo (non cifrati)" |
| "La password non e' salvata in chiaro" | `:2052` | Refuso visibile (`e'` invece di `è`) | "La password non è salvata in chiaro" |
| "preferisce che la richiami piu' avanti" | `TelefonistaTool.tsx:102` | Refuso in un copione letto ad alta voce al telefono | "più avanti" |
| Testi a 8-10 px con opacità 10-20% (es. "In attesa di elaborazione", "Monitor di Sistema") | varie | Contrasto e dimensione sotto soglia leggibilità (WCAG 1.4.3/1.4.4) | Alzare a ≥12 px e opacità ≥60% |

Nota: il codebase A usava "REALINDI®DEN SYSTEM" e "REALINDI®DEN SYSTEMS" in modo incoerente tra loro; nel B resta "REALINDI DEN SYSTEMS © 2026" (senza ®). Scegliere **una** denominazione e usarla ovunque.

---

## 8. Cosa è fatto bene (da non toccare)

- **RLS su tutte e 9 le tabelle**, policy per-utente, `profiles` con autorità riservata all'admin (revoca di insert/update/delete + grant per colonna), policy *restrictive* che bloccano i profili sospesi anche con JWT ancora valido.
- **`requireActiveUser`**: verifica del token, lettura del profilo, richiesta di `status = 'Attivo'`, fail-closed se la configurazione manca.
- **Sessione**: l'utente "verificato" vive in memoria (`verifiedSessionUser`), il localStorage non è considerato fonte di verità, rivalidazione ogni 30 secondi e su `onAuthStateChange`, cambio utente → `clearSessionUser()`.
- **Quota AI atomica** in PostgreSQL (`consume_generation_quota`), 10/giorno per utente, con controllo di profilo attivo.
- **Upload hardening** (`server/uploads.py`): body 4 MB, ZIP espanso 24 MB, max 1.000 membri, 250.000 celle/foglio, 500.000 totali, blocco archivi cifrati, blocco DOCTYPE/ENTITY (XXE), `keep_links=False`.
- **Import Cyborg**: token in timing-safe compare, timeout, `redirect: "error"`, errori generici.
- **Nessun segreto** nel codice del codebase B: solo variabili d'ambiente; la chiave pubblicabile Supabase nel frontend è corretta, nessuna `service_role` esposta.
- **Errori generici** verso il client, nessuno stack trace o messaggio del provider.
- **Test unitari** su security, storage, profiles — incluso un test che verifica il rifiuto delle richieste AI anonime prima di qualunque chiamata di rete.
- `docs/SECURITY_RELEASE.md` è onesto sui limiti: elenca ciò che *non* è stato verificato. Raro e apprezzabile.

---

## 9. Piano d'azione

**Oggi**
1. Ruotare `OPENAI_API_KEY` e controllare i consumi.
2. Verificare/disattivare il signup pubblico su Supabase.
3. Verificare che non esistano deploy attivi del vecchio stack; chiudere il tunnel ngrok.

**Questa settimana**
4. `requireActiveUser` su `/api/converter` e `/api/scanner`.
5. Pubblicare Privacy Policy e Termini, collegarli nel footer e nella checkbox.
6. Correggere o rimuovere il form contatti; correggere i claim della schermata di login.
7. Aggiungere CSP e `Permissions-Policy` in `vercel.json`.
8. `.gitignore` → `.env*`, `git rm --cached .env.local`.

**2-4 settimane**
9. Decidere dove vivono i dati (cifratura locale o Supabase come fonte di verità).
10. Retention, export e cancellazione account.
11. DPA con Supabase/Hugging Face, registro dei trattamenti, informativa ai dipendenti.
12. Rimuovere il codice legacy degli account locali e i limiti di orario lato client.
13. `npm audit` sul nuovo stack e aggiornamento dipendenze.
14. Chiarire marchio e licenza (file LICENSE, denominazione unica).

---

## 10. Interventi applicati il 1 novembre 2026

Branch `fix/sicurezza-legale` (creato da `origin/main`; `main` locale non toccato).

| # | Intervento | File |
|---|---|---|
| A2 | Autenticazione obbligatoria su `/api/converter` e `/api/scanner`: token Supabase verificato, profilo `Attivo`, 503 se la configurazione manca. Il client RPO invia il token e fallisce subito senza sessione | `server/security.py`, `api/converter.py`, `api/scanner.py`, `src/lib/supabase.ts`, `src/RpoTool.tsx` |
| A5/M1 | Pagine pubbliche Privacy, Termini e Note legali; link reali nel footer e nella schermata di accesso; consenso con link all'informativa | `src/legal.tsx`, `src/main.tsx`, `src/styles.css`, `vercel.json` |
| M1 | Il form contatti prepara un messaggio reale nel client di posta, non simula più l'invio; "Risposta rapida garantita" sostituito da un impegno verificabile | `src/main.tsx` |
| M2 | Claim della login corretti: autenticazione Supabase dichiarata, copia locale dichiarata come non cifrata | `src/main.tsx` |
| A4 | CSP, `Permissions-Policy` e HSTS; rotte legali aggiunte ai rewrite | `vercel.json` |
| A1 | Signup disattivato, conferma e-mail, password ≥12 con requisiti, limiti di sessione | `supabase/config.toml` |
| — | CORS Cyborg: solo origini in allowlist, 403 sulle altre, nessun default `*` | `api/cyborg/import-census.js` |
| M6 | `x-real-ip` preferito, ultimo valore di `X-Forwarded-For`, salt configurabile | `api/client-context.js` |
| §7 | Accenti con apostrofo corretti (`e'`, `piu'`, `gia'`, `cosi'`, `pero'`) anche nei copioni telefonici | `src/main.tsx`, `src/RpoTool.tsx`, `src/TelefonistaTool.tsx` |

Verifiche eseguite: `npm run typecheck`, `npm test` (6/6), `python3 -m unittest` (13/13, inclusi 8 nuovi test sull'autenticazione Python), `npm run build`, `npm audit` → **0 vulnerabilità**. Controllo a runtime: `/privacy`, `/termini`, `/note-legali` e `/login` si renderizzano, nessun errore in console.

### Resta da fare (richiede te)

1. **Ruotare `OPENAI_API_KEY`** e verificare i consumi: il valore è nella storia di `main`.
2. **Compilare `LEGAL_ENTITY`** in `src/legal.tsx` (ragione sociale, sede, P.IVA, REA, PEC, telefono). Finché ci sono segnaposto le pagine mostrano "Documento in bozza".
3. **Applicare al progetto Supabase hostato** le impostazioni di `config.toml` (signup, conferma, password, sessioni) e verificare che `profiles` non consenta auto-attivazione.
4. **Nominare i responsabili** (Supabase, Vercel, fornitori AI) e registrare il trattamento.
5. **Cifrare o spostare su Supabase** i dati in `localStorage` (A3), rimuovere il codice legacy degli account locali (M4) e i limiti di orario lato client (M5).
6. **Marchio e licenza**: una sola denominazione e un file `LICENSE` prima della distribuzione.
7. Il codebase A (Next.js) resta invariato: contiene ancora il `.env.local` tracciato e le 23 vulnerabilità. Va archiviato, non riusato.

