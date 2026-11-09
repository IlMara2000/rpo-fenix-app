# CYBORG CENS in GRFenix — Implementation Plan

**Goal:** Tutto il pannello CYBORG CENS utilizzabile da Censimento, con estensione collegata (approccio approvato dall'utente).
**Architecture:** Incorporare la pagina originale dell'estensione, senza duplicare logica e storage. Discovery limitata a GRFenix; scheda operativa scelta esplicitamente; importazione locale dei record nel CRM con anteprima e conferma.
**Tech Stack:** React/TypeScript esistenti, Chrome MV3, postMessage tra origini verificate. Nessuna nuova dipendenza.
**Spec:** Richiesta e approvazione nella chat del 6 novembre 2026.

## Vincoli
- Nessuna lettura di credenziali, nessun invio a endpoint esterni nel nuovo flusso.
- Popup normale invariato; DB e sessioni condivisi con il pannello incorporato.
- Non sovrascrivere schede CRM esistenti durante l'importazione; segnalare duplicati.
- Origini limitate a grfenix.vercel.app e loopback per sviluppo.

## Passaggi
- [x] Estensione: discovery senza dati personali, popup incorporabile, selettore scheda e routing dei comandi; test origini e selezione.
- [x] GRFenix: strumento Cyborg con iframe, stato collegamento e gestione messaggi verificati.
- [x] Importazione: conversione record in contatti/immobili, anteprima e commit attraverso il salvataggio CRM esistente; test duplicati e record incompleti.
- [x] Verifica: test mirati, typecheck/build, controllo browser se disponibile; documentare limiti della prova live.

## Casi da verificare
Estensione assente; scheda chiusa o navigata su dominio diverso; messaggio da origine diversa; reimportazione dello stesso DB; proprietari multipli e omonimi su immobili distinti.
