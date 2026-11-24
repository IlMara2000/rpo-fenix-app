# CYBORG CENS nel Censimento GRFenix

Il Censimento contiene lo strumento **CYBORG CENS**. Il gestionale gestisce in proprio il database dei record, le sessioni, l'esportazione (CSV) e l'anteprima/importazione nel Censimento: queste funzioni restano disponibili anche quando l'estensione non è collegata, con i dati salvati nel browser dell'account.
Quando l'estensione CYBORG CENS è collegata, il suo pannello completo resta incorporato per le sole automazioni sulle schede esterne (Sister, Area159, CercaOra, iniezioni e simili): il codice delle automazioni resta nell'estensione e la pagina web non acquisisce accesso generale alle schede del browser.

## Cosa fa l'estensione (v3.1, novembre 2026)

- **CHECK AREA** legge la pagina Sister (tutte le frame), confronta con il DB e lascia solo i dati mancanti. Se l'elenco è paginato lo dichiara: il confronto copre la sola pagina corrente, quindi va avviato dalla prima pagina e senza filtri per controllare tutto.
- **Cosa è compilabile**: categoria, vani/consistenza, piano, codice fiscale, più anagrafica e contatti presenti nel DB. Su Area159 Via e Civico sono select collegate per ID: l'indirizzo **non entra mai nella coda** e finisce tra i dati da completare a mano, insieme a telefono ed email (che non esistono su Sister e si propagano solo dal DB al CRM).
- **AGGIUNGI MANCANTI** compila esclusivamente i campi vuoti della scheda di modifica, senza toccare i valori già presenti. Interruttori: `TUTTI` (tutti i contatti del CRM invece dei soli incompleti), `PROVA` (verifica che i campi esistano e siano vuoti, non scrive e non salva), `SALVA` (invia il form dopo la compilazione e rilegge i valori per confermare il salvataggio).
- **ANNULLA COMPILAZIONE** ripristina i valori precedenti dei form salvati nell'ultima esecuzione e li reinvia; è l'unico modo per tornare indietro, perché la compilazione non è un'operazione annullabile dal browser.
- **DA COMPLETARE** esporta in CSV i contatti con indirizzo, telefono o email mancanti, cioè quelli che richiedono inserimento manuale.
- **Siti e permessi**: Sister (`*.agenziaentrate.gov.it`) e CRM Area159 (`*.area159.com`). L'host `venom.datasinc.it` e il permesso `activeTab` sono stati rimossi perché non più usati.
- **Sessioni**: `db` e `testoRubrica` non vengono più copiati in ogni snapshot ma salvati una volta sola e referenziati, così il peso dello storage non cresce con il numero di sessioni.

## Modifiche recenti all'estensione (24 novembre 2026)

Aggiornamenti applicati in `CENS_ROOT` dopo la v3.0. Non cambiano il contratto di collegamento con GRFenix (ponte `postMessage` e client HTTP restano come descritto sotto), ma cambiano cosa fa l'estensione quando compila e come conserva le sessioni.

### Permessi, host e versione

- `manifest.json` passa a **v3.1**: permessi `storage`, `scripting`, `unlimitedStorage`, `tabs`, `debugger`; `activeTab` rimosso perché inutilizzato (gli host sono già coperti da `host_permissions`). `unlimitedStorage` resta necessario per il fallback PDF (~7,5 MB) e per le sessioni con `db` e `testoRubrica`.
- Host dichiarati: `https://*.agenziaentrate.gov.it/*`, `https://*.area159.com/*`, `https://grfenix.vercel.app/*`. Rimossi `venom.datasinc.it` e la riga ridondante del dominio nudo Area159 (la wildcard copre anche l'host senza sottodominio).
- Il messaggio "CRM non trovato" elenca solo Area159 e GRFenix, non più il gestionale dismesso.

### CHECK AREA

- L'indirizzo non entra più nella coda di compilazione: su Area159 Via e Civico sono select collegate per ID, quindi finisce tra i dati `da completare` insieme a telefono ed email.
- Avviso esplicito quando l'elenco Sister è paginato: il confronto copre la sola pagina corrente, quindi va avviato dalla prima pagina e senza filtri.
- Nuovo export CSV dei contatti `da completare`, cioè quelli che richiedono inserimento manuale.

### AGGIUNGI MANCANTI

- `PROVA` verifica che i campi esistano e siano vuoti senza scrivere né salvare; `SALVA` invia il form e rilegge i valori per confermare la memorizzazione. I due interruttori si escludono a vicenda.
- `SALVA` insieme a `TUTTI` chiede una conferma con il numero esatto di contatti ed è limitato a **25 contatti per esecuzione** (`CA_MAX_SALVA_TUTTI` in `js/module-check-area.js`): oltre il limite l'esecuzione viene rifiutata prima di aprire qualsiasi scheda.
- Nei CRM che compilano in place (senza pagina di modifica) il form inviato è quello che contiene i campi appena compilati, non il primo form con un campo `cognome`; i contatti salvati senza URL di modifica sono elencati nel riepilogo come non annullabili.
- `ANNULLA COMPILAZIONE` ripristina i valori precedenti dei form salvati nell'ultima esecuzione e li reinvia; per i contatti senza pagina di modifica non è disponibile.
- Riepilogo finale esplicito: salvati/compilati, campi rimasti vuoti dopo il salvataggio, contatti saltati con il motivo.

### Sessioni (deduplica)

- `db` e `testoRubrica` non sono più copiati in ogni snapshot: sono scritti una volta nella chiave `sessioneBlob_<impronta>` e lo snapshot conserva solo `dbRef`/`testoRubricaRef` (`js/module-sessioni.js`).
- Gli snapshot del vecchio formato restano leggibili; la migrazione al formato a riferimenti avviene al primo avvio del popup.
- Una sessione con blocco condiviso mancante non viene caricata (il DB attuale resta intatto) e si può eliminare dalla lista "Carica sessione", dove ogni riga ha `ELIMINA`.
- Il reset 🗑️ conserva i blocchi condivisi delle sessioni.
- Cambia solo lo storage interno dell'estensione: nessun formato scambiato con GRFenix è toccato.

### Verifica automatica

`node tools/check-cyborg-cens.js`: **31 controlli** (sintassi di 17 file JS, manifest, permessi e host, funzioni pure di CHECK AREA, conferma e tetto di `SALVA`+`TUTTI`, scelta del form nella compilazione in place, deduplica sessioni con risparmio misurato del 72% sul fixture sintetico).

## Attivazione

1. Ricaricare l'estensione CYBORG CENS dalla pagina Estensioni del browser, mantenendo la stessa installazione e cartella `CENS_ROOT` per conservare ID, DB e sessioni. Dopo l'aggiornamento dei permessi Chrome chiede di riapprovarli.
2. Avviare la versione aggiornata di GRFenix e ricaricare la pagina.
3. Aprire **Censimento → CYBORG CENS**.
4. Aprire Area159 o Sister in una scheda separata, effettuare l'accesso e scegliere la **Scheda operativa** nel pannello. Aggiornare la lista se si aprono altre schede.
5. Usare il pannello dell'estensione per le automazioni e per CHECK AREA. Per quest'ultimo partire dalla prima pagina e togliere i filtri se si vuole controllare l'intero elenco.
6. **Importare nel Censimento** dal gestionale: usa il database dei record e le sessioni salvati nel gestionale (o importati da file). Se l'estensione è collegata, il pulsante **IMPORTA DB IN CENSIMENTO** del pannello estensione invia il DB corrente al gestionale, che ne tiene una copia e mostra l'anteprima prima del salvataggio.

L'importazione conserva le schede esistenti: i record riconosciuti come duplicati non vengono sovrascritti. Ogni record importato conserva il sorgente in `details.cyborgOriginalRecord`. Le sessioni possono essere salvate, caricate, esportate e importate nel gestionale (formato compatibile con i file `.cyborg-cens-session.json` dell'estensione); le sessioni presenti solo nello storage dell'estensione restano gestibili dal pannello estensione quando è collegato.

## Collegamento

Origini ammesse: `https://grfenix.vercel.app`, `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, `http://127.0.0.1:5174`.
Il content script di discovery restituisce solo URL e versione dell'estensione. Non accetta comandi operativi, credenziali o richieste di lettura del DB. Il trasferimento parte dal pulsante dentro l'estensione; GRFenix verifica origine e finestra mittente prima di validare i record. Nessun token dell'estensione viene trasferito.
L'adattatore HTTP `/api/cyborg/import-census` è **dismesso**: risponde 410, non legge il corpo, non valida token e non inoltra nulla. Le variabili `CYBORG_IMPORT_TOKEN` e `CRM_CENSUS_IMPORT_FORWARD_URL` non sono più necessarie.
La CSP di GRFenix consente il frame `chrome-extension:`; le risorse accessibili dell'estensione sono limitate a `popup.html` sulle origini indicate. Le liste private sotto `assets/contact-excels` restano nella cartella originale dell'estensione: non sono copiate nel sito.

### Nota di allineamento (24 novembre 2026)

La copia dell'estensione in `CENS_ROOT` non contiene il content script di discovery né il ponte `postMessage` verso il pannello: quella parte va allineata prima di considerare funzionante il collegamento incorporato. L'estensione include ancora il vecchio client HTTP verso `/api/cyborg/import-census` (pulsante nascosto, endpoint 410): è codice morto da rimuovere. Fino ad allora il pannello di GRFenix e l'estensione vanno usati come strumenti separati.

Questa copia dell'estensione non implementa alcuna esportazione/importazione di file di sessione (`*.cyborg-cens-session.json`): le sessioni vivono solo in `chrome.storage.local` e si gestiscono dal popup (salva, carica, elimina). Il passaggio al gestionale resta quello descritto in *Attivazione* (DB corrente via pannello); il formato file citato va implementato prima di poterlo usare come scambio.

## Verifica

- Estensione: `node tools/check-cyborg-cens.js` nella cartella `CENS_ROOT` (sintassi di tutti i file JS, manifest, permessi e host, funzioni pure di CHECK AREA, limiti di `SALVA`+`TUTTI`, compilazione in place, deduplica sessioni).
- GRFenix: `node --test tests/cyborg-import.test.js tests/censimento-sites.test.js tests/security.test.js` e `npm run build`.
- Fixture browser locale: `/tests/fixtures/cyborg-panel.html` sul server Vite. Usa dati sintetici e non accede al CRM reale.
La prova dei flussi autenticati sui siti reali richiede le schede operative dell'utente. Il pannello deve restare aperto durante le automazioni gestite dal frontend, come avveniva con il popup. Le modifiche locali non costituiscono un deploy di GRFenix.

## Esito verifiche

**7 novembre 2026.** Build di produzione completata e controlli TypeScript superati. 16 test mirati tra estensione e gestionale. In Brave con profilo temporaneo sono stati verificati: pannello con API reali dell'estensione, importazione di 2 contatti/1 immobile, reimportazione con 0 nuovi record, salvataggio e caricamento sessioni tramite conferma integrata. CHECK AREA su una tabella sintetica intercettata localmente ha prodotto una sessione con 1 proprietario mancante, lasciando invariata quella attiva.

**24 novembre 2026.** Modifiche all'estensione v3.1: permessi ridotti, host CRM allineati ad Area159, indirizzo escluso dalla coda di compilazione, nuove modalità PROVA e SALVA, annullamento della compilazione, export `da completare`, avviso di paginazione in CHECK AREA. Verifica **solo statica** (`node tools/check-cyborg-cens.js`: 14 controlli superati): nessun test in browser e nessuna operazione su contatti reali o sul gestionale online. Questa sezione va aggiornata dopo la prima prova reale a estensione ricaricata.

**24 novembre 2026 (seconda iterazione).** Rifiniture a `SALVA`/`PROVA`/`ANNULLA`: tetto di 25 contatti con conferma esplicita quando `SALVA` è attivo insieme a `TUTTI`, invio del form che contiene i campi compilati nei CRM in place (prima veniva scelto il primo form con un campo `cognome`), verifica post-salvataggio riportata sempre nel riepilogo. Deduplica delle sessioni con migrazione automatica e possibilità di eliminare una sessione danneggiata. Checker esteso a **31 controlli, tutti superati**. Resta **verifica solo statica**: nessun test in browser, nessuna scrittura su contatti reali, nessuna misurazione del risparmio sullo storage reale.
