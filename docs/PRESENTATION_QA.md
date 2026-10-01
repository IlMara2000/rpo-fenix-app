# Verifica di presentazione

## Interventi eseguiti

- Resi visibili CRM, PWS, RPO, Telefonista e Planimetrie nel selettore principale.
- Rimossa la condizione che nascondeva CRM, PWS e Planimetrie dal selettore: la home elenca ora direttamente tutti e cinque i programmi.
- Collegati PWS e Telefonista anche tra gli strumenti accessibili dal CRM.
- Separata la validazione delle sessioni Supabase da quella degli account locali.
- Corretto il calcolo della data PWS affinche usi il giorno locale dell'agente.
- Aggiunta la possibilita di rifiutare una proposta GPS senza riproporla nella stessa giornata.
- Allineati i conteggi PWS escludendo le attivita rifiutate dalle pianificate.
- Aggiunte etichette accessibili ai controlli delle attivita.
- Inserito un foglio CSS finale dedicato alla prevenzione di overflow e sovrapposizioni sui breakpoint desktop, tablet e mobile.
- Limitate a due righe le etichette dei moduli CRM e mantenuto il tema scuro anche nei menu a tendina e nel grafico del censimento.

## Revisione di presentazione (2026-10-01)

- La build pubblicata prima di questa revisione marcava esplicitamente CRM, PWS e Planimetrie come nascosti (`hiddenInSelector`); il selettore mostrava perciò solo RPO e Telefonista. Il filtro è stato rimosso alla fonte.
- Le verifiche HTTP locali rispondono 200 per `/`, `/crm`, `/PWS`, `/planimetrie`, `/rpo` e `/telefonista`.
- `npm run build` e `git diff --check` completati con successo. Resta l’avviso Vite non bloccante sul bundle principale da circa 529 kB.
- La verifica visuale automatizzata non è disponibile: il runner Playwright non trova Chrome installato.

## Verifiche

- Build Vite di produzione completata con successo: 2037 moduli trasformati.
- Tutte le rotte pubbliche principali rispondono con HTTP 200 dal server locale.
- Bundle di controllo del sorgente completato con esbuild, inclusi parsing TSX e CSS.
- La verifica browser automatizzata non e disponibile sulla macchina corrente: `agent-browser` non e installato e Playwright non trova Chrome/Chromium. Non e stato installato nuovo software soltanto per il collaudo.

## Verifica visuale consigliata

1. Avviare `npm run dev -- --port 4173`.
2. Verificare `/`, `/crm`, `/PWS`, `/rpo`, `/telefonista` e `/planimetrie` a 1440 px, 820 px, 390 px e 320 px.
3. Provare accesso Supabase, ritorno CRM/PWS e aggiornamento dello stato di una attivita.
