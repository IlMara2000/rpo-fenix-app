# Analisi architetturale e PWS

## Stato del progetto trovato

FENIX è una single-page application React 19 + TypeScript costruita con Vite e pubblicata su Vercel. Il routing è gestito direttamente in `src/main.tsx` tramite `history.pushState`; Vercel riscrive le rotte applicative verso `index.html`.

Le sezioni sono autonome:

- `/crm`: gestionale principale, con dashboard, immobili, richieste, nominativi, proprietari, agenda, attività, pubblicità, censimento, obiettivi, utilità e impostazioni.
- `/planimetrie`: generatore grafico/AI caricato in lazy loading.
- `/rpo`: suite di conversione, suddivisione, pulizia e bonifica file.
- `/telefonista`: script di chiamata, timer, checklist, note ed esiti.

## Autenticazione, account e persistenza

Non è presente un database remoto né un provider di autenticazione. Account, hash password, sessione e dati CRM sono salvati nel `localStorage` del browser:

- `fenix-suite-accounts-v1`
- `fenix-suite-current-user-v1`
- `fenix-suite-crm-data-v2`
- `fenix-telefonista-calls-v1`

I ruoli esistenti sono TITOLARE, ASSOCIATO, COORDINATORE/TRICE, AGENTE, TELEFONISTA e SVILUPPATORE. Sono presenti regole locali per gestione account, gerarchia `managerId` e fasce orarie di accesso.

Conseguenze: i dati non sono condivisi tra browser/dispositivi; la sicurezza è solo client-side; non esistono RLS, audit server-side o permessi verificati da backend.

## Dati CRM utilizzabili dal GPS

Il GPS PWS usa esclusivamente campi già presenti:

- attività non completate, con data/orario, titolare, contatto, immobile e note;
- ricontatti dei nominativi tramite `nextContactDate`, `nextStep` e `nextContactReason`;
- scadenze incarico degli immobili tramite `mandateExpiry` o `mandateEndDate`;
- obiettivi mensili con valore corrente, target e titolare.

La priorità è alta per elementi scaduti o dovuti oggi, media negli altri casi. L’appartenenza all’agente è verificata confrontando i campi owner/responsabile/agente con nome, email e identificativi leggibili dell’utente autenticato. I record senza titolare restano visibili perché il modello CRM corrente li considera non assegnati; questa scelta andrà resa esplicita nel futuro modello dati.

Non sono presenti entità strutturate per trattative, follow-up separati, richiami separati, dipendenze, disponibilità lavorativa o obiettivi giornalieri CRM. Non vengono quindi inventate.

## Integrazione telefoniste

`/telefonista` salva log locali con operatore, proprietario, zona, immobile, esito, note e checklist, ma senza `accountId`, `agentId`, `contactId` o `propertyId`. Il PWS non li attribuisce automaticamente: un collegamento sarebbe ambiguo. La futura integrazione richiede identificativi CRM stabili e titolare dell’esito.

## Modello PWS

La chiave `fenix-suite-pws-v1` contiene piani isolati dalla coppia `userId + date`.

`DailyPlan` contiene focus, obiettivi giornalieri, attività e data aggiornamento. `PwsTask` contiene origine (`crm` o `manuale`), eventuale riferimento CRM, titolo, note/esito, data, orario, durata, priorità e stato.

Gli stati sono proposta, pianificata, in corso, completata, rinviata e rifiutata. La sincronizzazione verso il CRM è consentita solo per attività con `sourceType=attivita` e `sourceId` certo.

## Funzioni implementate

- rotta autonoma `/PWS` e fallback `/pws`;
- gate sulla sessione CRM esistente;
- selezione giornata e focus;
- obiettivi mensili reali;
- generazione GPS da attività, ricontatti e scadenze incarico;
- accettazione suggerimenti e inserimento attività manuali;
- orario, durata, priorità, stato, note/esito;
- distinzione visiva GPS/manuale;
- rilevamento sovrapposizioni;
- riepilogo completate/rinviate/aperte;
- sincronizzazione prudente degli esiti sulle attività CRM;
- layout responsive coerente con la UI esistente.

## Backend Supabase

È stato predisposto il progetto Supabase `FENIX CRM` (`dsvxbijhsfjhwebgrtcx`) e collegato al repository `IlMara2000/rpo-fenix-app`, directory di lavoro `.` e branch di produzione `master`.

La migrazione in `supabase/migrations` crea:

- profili e ruoli collegati a Supabase Auth;
- immobili, contatti, richieste, attività e obiettivi;
- piani PWS e attività giornaliere;
- chiamate telefoniste con riferimenti strutturati ad agente, contatto e immobile;
- indici operativi;
- grant espliciti e RLS owner-only su tutte le tabelle.

L’esposizione automatica delle nuove tabelle è disabilitata. La funzione automatica `rls_auto_enable()` non è eseguibile da ruoli pubblici o autenticati. Il frontend usa esclusivamente una publishable key e carica `supabase-js` in modo dinamico.

È stato creato l’utente applicativo iniziale `daniele.marangoni@grfenix.com` con profilo `SVILUPPATORE`.

## Limiti e prossimi passi

La base backend e l’autenticazione sono ora presenti. La persistenza delle schermate CRM e PWS resta temporaneamente ibrida: i dati storici nel browser non vengono cancellati e devono essere migrati tramite un import esplicito prima di rendere Supabase l’unica sorgente. Le policy attuali sono intenzionalmente owner-only; i permessi manageriali cross-account richiedono policy dedicate e test di autorizzazione.

La protezione Supabase contro password compromesse è disponibile solo sui piani Pro; sul piano Free è stata impostata una lunghezza minima di 10 caratteri.

## Test

- `npm run build`: superato.
- controllo HTTP locale della rotta `/PWS`: risposta 200.
- verifica del sito pubblicato: home e struttura applicativa confrontate con il bundle sorgente.
- verifica visuale locale via browser automatizzato: non completata per isolamento di rete del browser di test rispetto al server locale.
