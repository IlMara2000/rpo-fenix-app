# Cosa resta da fare a te

Lista delle cose che non posso fare io, perché servono dati, accessi o decisioni tue.

---

## Fatto adesso (non devi fare niente)

**Dati della tua azienda nelle pagine legali.** Presi dal footer di `grfenix.com`, quindi
sono dati pubblici già verificati, non inventati:

| Campo | Valore inserito |
| --- | --- |
| Denominazione | JDT S.r.l. |
| Forma giuridica | Società a responsabilità limitata |
| Sede legale | Via Pierluigi da Palestrina 14, 20124 Milano (MI) |
| Partita IVA | 12598180961 |
| REA | MI-2671883 |
| PEC | jdt.srl@lamiapec.it |
| Email | daniele.marangoni@grfenix.com |

Gli stessi valori sono in `LICENSE`, con il foro competente di Milano. L'avviso
"Documento in bozza" è sparito da Privacy, Termini e Note legali.

Ho tolto la riga **Telefono** perché sul sito non c'è un numero pubblico: se mi passi
quello che vuoi mostrare lo rimetto in dieci secondi.

**Impostazioni Supabase.** Il progetto online (`grfenix`) aveva ancora `http://localhost:3000`
come indirizzo del sito e nessun indirizzo di ritorno autorizzato. Ora punta a
`https://grfenix.vercel.app` e accetta i ritorni da quell'indirizzo e da `localhost:5173`
(serve per provare in locale). Erano già a posto: registrazione libera disattivata,
conferma dell'email obbligatoria, password di almeno 12 caratteri.

**Migrazione del database.** Il file `supabase/migrations/20261023201115_secure_profile_authority.sql`
risultava **già applicato** al database online: ho controllato le 8 regole che bloccano gli
account sospesi, la regola sui piani PWS, la tabella della quota giornaliera e le funzioni
del tetto di 10 generazioni AI al giorno. Ci sono tutte.

---

## 1. Il captcha: mancano solo le due chiavi

Il widget è già collegato al form di accesso e la regola di sicurezza del sito lo lascia
caricare: mancano le chiavi del fornitore, perché senza quelle non posso né disegnare il
riquadro né far verificare il gettone a Supabase.

1. crea il sito su Cloudflare Turnstile (gratuito) o hCaptcha e prendi le **due** chiavi:
   quella pubblica del sito e quella segreta;
2. su Vercel → Settings → Environment Variables aggiungi
   `VITE_SUPABASE_CAPTCHA_PROVIDER` (`turnstile` oppure `hcaptcha`) e
   `VITE_SUPABASE_CAPTCHA_SITE_KEY` (la chiave pubblica), poi rifai il deploy;
3. su Supabase → **Authentication → Attack Protection** scegli lo stesso fornitore,
   incolla la chiave segreta e attiva.

**L'ordine conta**: se attivi il controllo su Supabase prima di aver messo la chiave
pubblica su Vercel, nessuno riesce più a entrare. Finché le due variabili mancano il
riquadro non compare e l'accesso funziona come sempre.

Due note tecniche:

- il controllo delle password rubate (HaveIBeenPwned) è riservato ai piani Pro di Supabase,
  quindi sul tuo piano non si può attivare: me l'ha rifiutato il sistema;
- l'obbligo di maiuscola, numero e simbolo non l'ho forzato via API perché sbagliando la
  sintassi si rischia di rifiutare password valide. Si attiva in un clic da
  **Authentication → Passwords → Password requirements**, scegliendo
  `lower_upper_letters_digits_symbols`. La lunghezza minima di 12 è già attiva.

## 2. "Password dimenticata" non esiste ancora nella pagina di accesso

Nella schermata di login c'è solo "Accedi": non c'è il collegamento per recuperare la
password. Chi la dimentica oggi va servito a mano: **Supabase → Authentication → Users →
utente → Reset password**, che gli manda l'email di recupero (l'indirizzo del sito ora è
quello giusto, quindi il link funziona).

Aggiungere il pulsante non è solo un link: il link di recupero riporta l'utente alla
pagina con un gettone da usare per scegliere la nuova password, quindi serve anche la
schermata "imposta nuova password". Se vuoi lo faccio io, dimmelo e lo metto.

## 3. Le due chiavi da rigenerare

Sono state usate in chiaro durante lo sviluppo e vanno considerate compromesse:

- **La chiave AI** (`OPENAI_API_KEY`): la trovi nella dashboard del fornitore, la revochi
  e ne crei una nuova. Va messa solo nelle variabili d'ambiente di Vercel, mai nel codice.
- **La chiave di Hugging Face** (`HF_TOKEN`): stessa cosa, dal tuo account Hugging Face.

Quando le hai rigenerate, non incollarle qui: mettile tu su Vercel → Settings →
Environment Variables. I nomi delle variabili sono esattamente quelli fra parentesi.

## 4. Gli account dei quattro siti esterni

Ho controllato i quattro collegamenti uno per uno, dall'esterno:

| Sito | Risposta | Si apre dentro il gestionale? |
| --- | --- | --- |
| Sister | funziona | **no**: il portale dell'Agenzia vieta di essere incorniciato; il riquadro lo spiega e apre la scheda con un clic |
| CercaOra | funziona | sì: si apre dentro la pagina dalla home del sito, poi si entra con ACCEDI |
| Datagma | funziona | sì: si apre dentro la pagina, con i dati del censimento nella colonna a destra |
| Whuis | funziona | **no**: il loro sito vieta di essere incorniciato, si apre in una scheda |

Tutti girano nello stesso riquadro dentro il gestionale: il sito prende l'area di lavoro,
la colonna di destra tiene i dati del censimento (per Sister, il pannello CYBORG CENS che
la guida). In alto ci sono sempre "Apri in una scheda" e "Chiudi".

Sister è l'unica che non può riempire il riquadro, e non per un difetto nostro:
`sister.agenziaentrate.gov.it` rimanda a `/Main/index.jsp` (302) e da lì a
`portale.agenziaentrate.gov.it`, che risponde `frame-ancestors 'none'` e rifiuta di essere
mostrato dentro qualunque altra pagina.

I contenuti dipendono dai tuoi rapporti:

- **Sister** (Agenzia delle Entrate): serve la convenzione attiva per consultare le banche
  dati. Finché non c'è, la scheda si ferma alla pagina di accesso.
- **CercaOra** e **Datagma**: funzionano a crediti. Serve un account attivo con credito
  residuo; quando finiscono i crediti le ricerche si fermano.
- **Whuis**: è a pagamento e si apre in una scheda separata del browser.

Se mi passi gli indirizzi di accesso diretti (non le password: basta il link della pagina
di login di ciascuno), verifico che siano quelli giusti e li sistemo.

## 5. Documenti e contratti

Queste non sono cose da codice e vanno fatte con chi ti segue:

- **Informativa privacy** rivista da un consulente, con l'elenco dei fornitori
  (Vercel per l'hosting, Supabase per dati e accessi, il fornitore AI, OpenStreetMap
  per le mappe).
- **Registro dei trattamenti** (art. 30 GDPR): l'elenco di quali dati tratti e perché.
- **Contratti di nomina a responsabile** (DPA) con Vercel e Supabase: si accettano dalle
  loro pagine, sono documenti standard.
- **Licenza del software**: `LICENSE` ora è completa, resta da farla controllare a chi ti
  segue per l'aspetto legale (in particolare il foro competente, che ho messo su Milano
  perché è la sede legale).

---

## Cosa ho già fatto io e non devi fare

- Filtri nascosti all'avvio in tutte le pagine del gestionale.
- Proprietari raggiungibile dalla barra laterale.
- Colonna dei siti nel Censimento, con gestionale attivo a destra.
- Una sola mappa immobiliare al posto delle due finte, con attribuzione obbligatoria
  e senza nomi di proprietari. Le tessere ora vengono da **OpenFreeMap**: gratuito, senza
  chiave, senza limiti di richieste e con uso commerciale consentito. In più il motore
  della mappa si scarica solo quando apri la mappa, non su ogni pagina.
- Sistemato il blocco che impediva alla mappa di funzionare sul sito online.
- La posizione scelta sulla mappa ora si salva **sull'immobile**, non più in una memoria
  separata: finisce anche nelle copie di sicurezza che scarichi.
- Indirizzi leggibili: `/censimento/nominativi`, `/immobili`, `/impostazioni/...` aprono
  direttamente la pagina giusta del gestionale.
- I programmi esterni (PWS, RPO, Telefonista, Planimetrie) si aprono in una scheda nuova,
  senza sostituire il gestionale.
- Test automatici, controllo dei tipi e build: tutti verdi.

---

## Un limite della ricerca indirizzi (non è un compito)

La mappa in sé non ha limiti. La **ricerca automatica dell'indirizzo** invece usa un
servizio pubblico gratuito che ammette una ricerca al secondo: il programma le mette in
fila e le distanzia da solo. Se un giorno fate centinaia di ricerche al giorno, conviene
passare a uno a pagamento (pochi euro al mese) o all'inserimento a mano, che funziona
sempre cliccando il punto sulla mappa.

---

## Una cosa da sapere (non è un compito)

Il gestionale salva i dati **dentro il browser del computer che stai usando**, legati al
tuo account. Vale per immobili, contatti, richieste e mappe. Se lavori da un altro
computer, o da un altro browser, non ritrovi i dati: non sono sincronizzati. Le copie di
sicurezza che scarichi invece sono complete.

Se in futuro vorrai che due persone o due computer vedano gli stessi dati in tempo reale,
si passa a salvarli sul database Supabase invece che nel browser. È un lavoro a parte,
dimmelo quando ha senso farlo.
