# CYBORG CENS nel Censimento GRFenix

Il Censimento contiene lo strumento **CYBORG CENS**, che incorpora il pannello originale dell'estensione. Tutte le funzioni condividono DB, PDF e sessioni del popup installato. Il codice delle automazioni resta nell'estensione: la pagina web non acquisisce accesso generale alle schede del browser.

## Attivazione

1. Ricaricare l'estensione CYBORG CENS dalla pagina Estensioni del browser, mantenendo la stessa installazione e cartella `CENS_ROOT` per conservare ID, DB e sessioni.
2. Avviare la versione aggiornata di GRFenix e ricaricare la pagina.
3. Aprire **Censimento → CYBORG CENS**.
4. Aprire Area o Sister in una scheda separata, effettuare l'accesso e scegliere la **Scheda operativa** nel pannello. Aggiornare la lista se si aprono altre schede.
5. Usare i comandi esistenti, comprese le sessioni e CHECK AREA. Per quest'ultimo partire dalla prima pagina e togliere i filtri se si vuole controllare l'intero elenco.
6. **IMPORTA DB IN CENSIMENTO** trasferisce il DB attualmente caricato a GRFenix. Controllare il riepilogo e confermare per aggiungere i contatti e gli immobili al salvataggio CRM del proprio account.

L'importazione conserva le schede esistenti: i record riconosciuti come duplicati non vengono sovrascritti. Ogni record importato conserva il sorgente in `details.cyborgOriginalRecord`. Le sessioni complete restano nello storage dell'estensione e possono essere salvate, caricate ed esportate dal pannello.

## Collegamento

Origini ammesse: `https://grfenix.vercel.app`, `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, `http://127.0.0.1:5174`.

Il content script di discovery restituisce solo URL e versione dell'estensione. Non accetta comandi operativi, credenziali o richieste di lettura del DB. Il trasferimento parte dal pulsante dentro l'estensione; GRFenix verifica origine e finestra mittente prima di validare i record. Nessun token dell'estensione viene trasferito. Il nuovo flusso non usa l'adattatore HTTP `/api/cyborg/import-census`.

La CSP di GRFenix consente il frame `chrome-extension:`; le risorse accessibili dell'estensione sono limitate a `popup.html` sulle origini indicate. Le liste private sotto `assets/contact-excels` restano nella cartella originale dell'estensione: non sono copiate nel sito.

## Verifica

- Estensione: `node --test tests/area-missing.test.cjs tests/grfenix-panel.test.cjs` nella cartella CENS_ROOT.
- GRFenix: `node --test tests/cyborg-import.test.js tests/censimento-sites.test.js tests/security.test.js` e `npm run build`.
- Fixture browser locale: `/tests/fixtures/cyborg-panel.html` sul server Vite. Usa dati sintetici e non accede al CRM reale.

La prova dei flussi autenticati sui siti reali richiede le schede operative dell'utente. Il pannello deve restare aperto durante le automazioni gestite dal frontend, come avveniva con il popup. Le modifiche locali non costituiscono un deploy di GRFenix.

## Esito verifica del 7 novembre 2026

Build di produzione completata e controlli TypeScript superati. 16 test mirati tra estensione e gestionale. In Brave con profilo temporaneo sono stati verificati: pannello con API reali dell'estensione, importazione di 2 contatti/1 immobile, reimportazione con 0 nuovi record, salvataggio e caricamento sessioni tramite conferma integrata. CHECK AREA su una tabella sintetica intercettata localmente ha prodotto una sessione con 1 proprietario mancante, lasciando invariata quella attiva. Nessuna operazione è stata eseguita su contatti reali o sul gestionale online.
