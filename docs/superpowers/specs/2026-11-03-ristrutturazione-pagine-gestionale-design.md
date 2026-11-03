# Ristrutturazione pagine gestionale — Design

**Data:** 3 novembre 2026
**Stato:** ⏳ in attesa di approvazione
**Repo:** `IlMara2000/rpo-fenix-app` · prod `https://grfenix.vercel.app`

---

## 1. Obiettivo

Ristrutturare le pagine del gestionale CRM perché ogni pagina faccia **una** cosa chiara, e perché il Censimento diventi un'area "mixabile" dove si aprono accanto i siti esterni di lavoro, senza finestre popup e senza pannelli filtri all'avvio.

Non si tocca: la logica dati, l'autenticazione, il deploy.

---

## 2. Cosa c'è oggi

### Navigazione

`navigationModuleKeys` (`src/main.tsx:591`) — solo questi compaiono nella barra laterale:

```
start · agenda · censimento · richieste · nominativi · immobili · obiettivi · utilita · impostazioni
```

In `modules[]` (`src/main.tsx:517`) ci sono anche **`proprietari`**, `pubblicita`, `contattiPubblicita`, `attivita` — esistono come moduli ma **non sono nella navigazione**.

### Pagine del Censimento (7, `src/main.tsx:760`)

Un wizard a 5 fasi più due pagine di servizio:

| key | label | ruolo |
|---|---|---|
| `censimento-nuovo-contatto` | Nuovo Contatto | crea contatto con immobile, dati catastali, proprietario |
| `censimento-contatti` | Contatti | elenco contatti censiti, filtri per nominativo/telefono/zona/catasto |
| `censimento-zone` | Zona | fase 1 |
| `censimento-vie` | Via | fase 2 |
| `censimento-complessi` | Complesso | fase 3 |
| `censimento-immobili` | Immobile | fase 4 |
| `censimento-proprietari` | Proprietari | fase 5 |

### Layout corrente delle tabelle

Oggi ogni elenco è **tabella + pannello filtri** affiancati:

- `src/main.tsx:3413` → `nominativi` (Rubrica)
- `src/main.tsx:3828` → `proprietari`
- `src/main.tsx:3964` → `richieste`

Il pannello filtri è visibile **subito**. È esattamente quello che non si vuole più.

### Altro

- Nel progetto **non esiste nessun `iframe` e nessun `window.open`** (`code_search "iframe|window.open"` → 0 risultati). I nomi dei 4 siti non compaionono nel codice.
- Nessuna pagina oggi contiene una mappa interattiva.

---

## 3. Decisioni già prese

| # | Decisione |
|---|---|
| D1 | **Approccio B** — colonna dei siti a sinistra, gestionale a destra (scelto dall'utente il 3/11) |
| D2 | **Whuis resta solo collegamento** — si apre in una scheda nuova del browser, non si incorpora (la sua app manda `X-Frame-Options: SAMEORIGIN`) |
| D3 | **Una sola mappa**, dentro il Censimento come pagina "Mappa" |
| D4 | **Niente pannelli filtri all'avvio** — la prima cosa che si vede è il dato, non il modulo dei filtri |
| D5 | **Telecontact eliminato** — i suoi elenchi telefonici sono già licenziati dentro CercaOra |
| D6 | Solo **Sister, CercaOra, Datagma** si aprono dentro. Whuis no |

---

## 4. Mappa delle pagine ✅ confermata il 3/11

| Pagina richiesta | Modulo esistente | Perché |
|---|---|---|
| **Contatti** | `nominativi` (oggi etichettata "Rubrica") | è il database clienti con telefoni, note, prossimo contatto |
| **Proprietari** | `proprietari` (oggi **fuori navigazione**) | va reso una vera pagina, ed è il mix Censimento ↔ Contatti |
| **Richieste / Clienti** | `richieste` | oggi descrive già "richieste clienti, matching e proposta immobili" |
| **Censimento** | `censimento` | resta, diventa l'area mixabile |
| **Mappa** | nuovo, dentro `censimento` | pagina `censimento-mappa` |

**Conferme ricevute:**

- "Contatti" = **`nominativi` (Rubrica)**, non `censimento-contatti`.
- **Mappa dentro il Censimento**, non come voce di primo livello.
- **`proprietari` va reso visibile nella navigazione** (oggi non c'è).
- **Documento approvato** il 3/11/2026.

---

## 5. Struttura — Approccio B

Il Censimento si apre così:

```
┌──────────────────────────────────────────────────────────────┐
│  barra alta (invariata: titolo, azioni, stato)               │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  COLONNA   │   AREA GESTIONALE                               │
│  SITI      │   (di default: 100% il gestionale)              │
│  ~280px    │                                                 │
│            │                                                 │
│  ◻ Mappa   │                                                 │
│  ◻ Sister  │                                                 │
│  ◻ CercaOra│                                                 │
│  ◻ Datagma │                                                 │
│  ↗ Whuis   │                                                 │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

### Stati

**Stato 1 — nessuna voce selezionata (default)**
L'area destra è **100% gestionale**. Si vede la pagina del Censimento com'è, senza filtri aperti (D4).

**Stato 2 — un solo sito selezionato**
L'area destra si divide in due:

```
┌──────────────────────────────────────────────────────────────┐
│  COLONNA SITI │  SITO INCORPORATO  │  GESTIONALE (analisi)   │
│               │  ~60%              │  ~40%                   │
└───────────────┴────────────────────┴─────────────────────────┘
```

Il gestionale **resta attivo** sulla destra con l'analisi di quello che stai guardando — esattamente come hai descritto.

**Stato 3 — due o più siti**
Niente finestre multiple. In cima al pannello del sito compaiono **schede** per passare da uno all'altro in un clic.

**Stato 4 — Mappa**
`censimento-mappa` occupa l'area destra al posto del gestionale (mappa interattiva a tutta altezza). La colonna sinistra resta visibile.

**Stato 5 — Whuis**
Clic → si apre una **scheda nuova del browser**. Nessuno stato interno cambia, la colonna sinistra mostra solo un indicatore "↗".

### Comportamenti

- La colonna sinistra **non sparisce mai**: è l'ancora di tutto.
- Si torna al gestionale completo con un pulsante "Torna al gestionale" in alto a destra.
- Il pannello di analisi a destra mostra: dati del sito, note, campi precompilati, e il collegamento alla scheda interna collegata.

---

## 6. Le pagine, una per una

### 6.1 Contatti (`nominativi`)

**Oggi:** tabella + pannello filtri affiancati (`src/main.tsx:3413`).
**Nuovo:**
- All'avvio si vede **l'elenco dei contatti con le anagrafiche** affiancate — niente modulo filtri.
- L'anagrafica (indirizzo, codice fiscale, telefono, note) è visibile accanto al contatto, non dietro un click.
- I filtri **compaiono solo quando richiesti** (pulsante "Filtra"), e si chiudono altrettanto facilmente.

### 6.2 Proprietari (`proprietari`) — il mix

**Oggi:** esiste come modulo ma **non è nella navigazione**; layout tabella+filtri a `src/main.tsx:3828`.
**Nuovo:** una pagina che **mescola Censimento e Contatti**.

- **Barra di ricerca proprietari** in alto, unica.
- Il risultato è una **scheda sola** che mostra da un lato i dati anagrafici (lato Contatti) e dall'altro gli immobili censiti collegati (lato Censimento), compresi dati catastali.
- La ricerca è **collegata**: cercando da qui si trova il proprietario anche in Censimento e anche in Contatti — stesso record, tre punti d'ingresso.
- Pulsante **"Mappa immobiliare"** in cima (D3): apre la pagina Mappa con gli immobili di quel proprietario.

### 6.3 Richieste / Clienti (`richieste`)

**Oggi:** layout tabella+filtri a `src/main.tsx:3964`.
**Nuovo:** sono **i contatti che cercano un immobile**.

- All'avvio: elenco dei clienti con una richiesta aperta, con accanto i **criteri** (zona, tipologia, metri, budget, stato).
- Nessun pannello filtri all'avvio (D4).
- Ogni riga apre la scheda: chi è, cosa cerca, gli immobili che combaciano.
- Restano le colonne utili; sparisce il pannello laterale.

### 6.4 Censimento (`censimento`) — l'area mixabile

- Il wizard **Zona → Via → Complesso → Immobile → Proprietari** **resta com'è**: è il passaggio del flusso, non cambia.
- Cambia solo l'impaginato: si applica la struttura §5 con la colonna siti.
- Le pagine `Nuovo Contatto` e `Contatti` del Censimento restano dove sono.
- Si aggiunge `censimento-mappa`.

### 6.5 Mappa (`censimento-mappa`) — nuova

Una **sola** mappa per tutto il gestionale.

- **Cosa mostra:** solo immobili censiti, con i **dati catastali** (foglio, particella, subalterno) inseriti a mano nel Censimento.
- **Cosa NON mostra:** **mai nomi di proprietari**. Sulla mappa compaiono gli immobili, non le persone.
- **Pulsanti di apertura:** nella colonna sinistra del Censimento; da **Proprietari** e da **Immobili** in modalità ricerca (pulsante "Mappa immobiliare").
- **Dati:** niente scraping del Catasto. Si usano solo i dati già inseriti a mano. Geocodifica con mappe libere, con **attribuzione obbligatoria** in pagina.

---

## 7. Aspetti legali (già decisi)

| Tema | Regola |
|---|---|
| Catasto | **Solo dati catastali inseriti a mano.** Nessuna lettura automatica dal Catasto. |
| Nomi in mappa | **Mai.** Sulla mappa solo gli immobili. |
| Geocodifica | Mappe libere → **attribuzione obbligatoria** visibile. |
| Trascrizione dati personali | Fuori perimetro di questo lavoro (scelta dell'utente). |
| Telecontact | **Eliminato.** Il contenuto è già dentro CercaOra. |

**Accessi ai siti (da tenere presenti, non è codice):**

| Sito | Stato |
|---|---|
| Sister — Agenzia delle Entrate | richiede **convenzione** con l'Agenzia |
| CercaOra | a **crediti**, riservato a agenti/professionisti |
| Datagma | a **crediti** |
| Whuis | solo **collegamento** (D2), a pagamento |

---

## 8. Fuori scope

Non entra in questo lavoro:

- **Whuis incorporato** — la sua app blocca l'inserimento in altre pagine. Resta collegamento (D2).
- **Telecontact** — rimosso (D5).
- **Tutto l'elenco "Resta da fare (richiede te)"** in `ANALISI_SICUREZZA_LEGALE.md`: `LEGAL_ENTITY`, captcha hCaptcha, `site_url`, rotazione `OPENAI_API_KEY`, `LICENSE`, DPA/registro trattamenti. Restano bloccati su di te.
- `disable_signup` e `password_min_length` — **già chiusi e verificati**, non si toccano.
- Rimozione del blocco legacy account (`src/main.tsx:5679-6090`) — ~380 righe sotto il return anticipato di `main.tsx:5687`, troppo rischiosa senza ristrutturazione dedicata.

---

## 9. Vincoli tecnici

- **Incorporabile (verificato con `curl -I`):** `sister.agenziaentrate.gov.it` ✅ · `cercaora.online` ✅ · `app.datagma.com` ✅ · `whuis.com` ✅ vetrina / `app.whuis.com` ❌ `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'`.
- Il sito incorporato va caricato **solo su richiesta dell'utente**, mai all'avvio della pagina.
- Nessuna dipendenza nuova prevista: la colonna siti e i pannelli sono impaginato, non librerie.
- La mappa serve una libreria di mappe — **da scegliere in fase di piano**, con obbligo di attribuzione.

---

## 10. Verifiche di accettazione

Il lavoro si considera fatto solo se:

1. Aprendo **Contatti**, **Proprietari** e **Richieste** non compare **nessun** pannello filtri finché non lo chiedi.
2. La colonna siti è presente nel Censimento con 5 voci: Mappa, Sister, CercaOra, Datagma, Whuis.
3. Sister, CercaOra, Datagma si aprono **dentro** l'area destra, senza finestre popup.
4. Whuis si apre in una **scheda nuova** del browser.
5. Con un sito solo aperto, **il gestionale resta attivo a destra** con l'analisi.
6. La colonna sinistra **non sparisce mai**.
7. Il wizard Zona→Via→Complesso→Immobile→Proprietari funziona **identico** a prima.
8. Esiste **una sola** mappa, dentro il Censimento.
9. Sulla mappa **non compare alcun nome di proprietario**.
10. Il pulsante "Mappa immobiliare" è presente da **Proprietari** e da **Immobili** in modalità ricerca.
11. `npx tsc --noEmit` ✅ · `npm test` ✅ · `npm run build` ✅

---

## 11. Stato

✅ **Design approvato** il 3 novembre 2026.

Tutte le domande aperte sono state risolte (§4). Nessun punto rimane da decidere prima della fase di piano.
