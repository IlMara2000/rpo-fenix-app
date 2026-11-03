# Security release

Apply `supabase/migrations/20261023201115_secure_profile_authority.sql` to the intended Supabase project before enabling AI generation. It restricts profile authority, enforces suspension in RLS, checks PWS plan ownership and creates an atomic allowance of 10 AI generations per user per UTC day. The migration has local PostgreSQL (PGlite) regression tests; applying it to production is a separate deployment step.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the frontend. The Node API accepts those same server environment variables or `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. `HF_TOKEN` remains server-only. Do not use a service-role key in a VITE variable. Missing authentication or quota configuration fails closed.

All application routes require a verified Supabase user and active profile. Legacy browser passwords and forged cached sessions no longer grant access. Users must exist in Supabase Auth; profile creation defaults to AGENTE. Role changes, suspension and password administration must use trusted administrator tooling; the former local-only account controls are disabled.

New CRM, PWS, account and call data is stored in browser keys scoped to the verified user ID. The old shared keys are preserved but are not automatically imported because their owner cannot be inferred safely. Recover those records only after confirming the intended owner. Back them up before any manual migration. Logout preserves saved user data but clears the active storage identity. This isolates normal account switching; local browser storage is not encrypted and does not protect against someone controlling the same OS/browser profile.

Uploads accept at most 4 MiB; XLSX archives at most 24 MiB expanded, 1,000 members, 250,000 cells per sheet and 500,000 cells total. Limits also cover sparse and merged ranges. Multipart parsing no longer depends on removed Python `cgi` APIs. Scanner output still highlights blacklisted rows; it does not erase their values.

## Accesso alle API RPO

`api/converter.py` e `api/scanner.py` applicano ora `server/security.py`, che rispecchia la politica di `server/security.js`: token Supabase valido, profilo con `status = 'Attivo'`, altrimenti 401/403. Se `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` (o le equivalenti `VITE_*`) mancano, la risposta è 503 e nessun file viene elaborato. Il client RPO invia il token in `Authorization` e interrompe l'operazione se la sessione è scaduta.

## Intestazioni e documenti legali

`vercel.json` dichiara `Content-Security-Policy` (script solo dal dominio, nessun frame in entrata, connessioni limitate a self, Supabase e ai servizi cartografici: tessere OpenFreeMap e ricerca indirizzi Nominatim), `Permissions-Policy` e `Strict-Transport-Security`. La direttiva `frame-src` elenca solo Sister, CercaOra e Datagma: gli altri siti non possono essere incorporati. La CSP può interferire con la toolbar dei deployment di preview di Vercel: verificarne il comportamento prima di usarla nelle preview condivise.

La mappa usa le tessere vettoriali di OpenFreeMap tramite MapLibre: servizio pubblico senza chiave, senza limiti di richieste e con uso commerciale consentito. Il server di tessere pubblico di OpenStreetMap non è adatto a un gestionale (la sua politica vieta l'uso da parte di applicazioni commerciali) e non viene usato. La ricerca degli indirizzi si appoggia a Nominatim, che ammette una richiesta al secondo: le richieste sono accodate e distanziate nel client (`src/censimento/coordinates.ts`). Se il volume di ricerche cresce, va sostituito con un servizio a chiave o con un'istanza propria.

Le pagine `/privacy`, `/termini` e `/note-legali` sono pubbliche, non passano da `AuthBoundary` e sono collegate dalla schermata di accesso e dal footer. I dati del prestatore sono centralizzati in `LEGAL_ENTITY` (`src/legal.tsx`): finché contengono segnaposto la pagina mostra l'avviso "Documento in bozza". Il modulo contatti prepara un messaggio nel client di posta dell'utente e non dichiara più un invio che non avviene.

## Configurazione di autenticazione

`supabase/config.toml` imposta ora `enable_signup = false`, conferma e-mail obbligatoria, password di almeno 12 caratteri con requisiti e limiti di sessione. **Il file vale per lo sviluppo locale:** le stesse opzioni vanno impostate nel progetto hostato (Authentication → Sign In / Providers, Password, Sessions) e applicate con `supabase config push` solo se il progetto è gestito da CLI.

`api/cyborg/import-census.js` accetta CORS solo dalle origini elencate in `CYBORG_ALLOWED_ORIGINS` e rifiuta le altre con 403. Senza variabile impostata, i client non browser continuano a funzionare ma nessuna pagina web può chiamare l'endpoint.

Validation: `npm test`, `python3 -m unittest discover -s tests -p 'test_*.py'`, `npm run build`, `npm audit`. Remote configuration, prior history, existing account roles, production log exposure and a real-user end-to-end login have not been verified by these local checks. Review existing privileged profiles for unauthorized historic changes before rollout.
