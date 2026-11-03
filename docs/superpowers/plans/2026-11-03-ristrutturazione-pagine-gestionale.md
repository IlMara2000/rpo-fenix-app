# Ristrutturazione pagine gestionale — Piano di implementazione

> **Per chi esegue:** leggere prima la spec `docs/superpowers/specs/2026-11-03-ristrutturazione-pagine-gestionale-design.md`.

**Obiettivo:** ogni pagina mostra il dato prima dei filtri; il Censimento diventa area "mixabile" con colonna siti a sinistra; una sola mappa.

**Architettura:** tutto in `src/main.tsx` (convenzione esistente del progetto, file unico). Nuove funzioni-componente accanto alle esistenti. CSS nuovo in coda a `src/workspace.css`. Nessuna ristrutturazione del file.

**Stack:** React 19, TypeScript, Vite, `lucide-react` per le icone, `leaflet` per la mappa.

**Spec:** `docs/superpowers/specs/2026-11-03-ristrutturazione-pagine-gestionale-design.md`

## Vincoli globali

- La colonna siti non sparisce **mai**.
- Sulla mappa **mai** nomi di proprietari.
- Il wizard Zona→Via→Complesso→Immobile→Proprietari resta identico.
- Whuis si apre in scheda nuova (`window.open` + `rel="noopener"`), **non** in iframe.
- Sister / CercaOra / Datagma in `<iframe>` con `loading="lazy"`, `referrerPolicy="no-referrer"`, `title` descrittivo, e **solo** dopo richiesta dell'utente (mai al caricamento della pagina).
- Attribuzione mappa obbligatoria e visibile (OpenStreetMap).
- Nessun pannello filtri renderizzato finché l'utente non lo chiede.
- `npx tsc --noEmit` · `npm test` · `npm run build` devono passare.

## Focus di revisione

1. **Apertura a freddo di ogni pagina** — nessuna barra/pannello filtri visibile prima del clic.
2. **`proprietari` fuori navigazione** — se non compare in sidebar la pagina è irraggiungibile.
3. **Iframe bloccati** — un sito che rifiuta l'incorporamento deve degradare con un messaggio + link esterno, non con un riquadro vuoto.
4. **Mappa senza coordinate** — immobili senza geocodifica non devono rompere la pagina né sparire in silenzio: vanno elencati a parte.
5. **Nomi di proprietari sulla mappa** — devono restare fuori da popup e testi.

---

### Task 1: Navigazione — `proprietari` diventa raggiungibile

**File:**
- Modifica: `src/main.tsx:598-601` (`navigationModuleKeys`)

**Interfacce:**
- Produce: la chiave `"proprietari"` presente in `navigationModuleKeys`.

- [ ] **Step 1:** aggiungere `"proprietari"` a `navigationModuleKeys`, dopo `"nominativi"`.

```ts
const navigationModuleKeys: ModuleKey[] = [
  "start", "agenda", "censimento", "richieste", "nominativi",
  "proprietari", "immobili", "obiettivi", "utilita", "impostazioni",
];
```

- [ ] **Step 2:** `npx tsc --noEmit` → nessun errore.

---

### Task 2: Filtri solo su richiesta (richieste, rubrica, proprietari, attività, censimento)

**File:**
- Modifica: `src/main.tsx` — `RequestsView` (~3245), `ContactsView` (~3483), `OwnersView` (~3855), `ActivitiesView` (~3965), `CensusView` (~5355)

**Interfacce:**
- Consuma: `Panel` (`src/main.tsx:6378`) — quando il titolo inizia per "Filtri" renderizza `<details className="panel-filter span-12">`.
- Produce: nessuna API nuova; comportamento: pannello filtro montato solo se `filtersOpen === true`.

- [ ] **Step 1:** in ogni vista con filtri aggiungere `const [filtersOpen, setFiltersOpen] = useState(false);`
- [ ] **Step 2:** avvolgere il `<Panel title="Filtro …">` in `{filtersOpen && ( … )}`.
- [ ] **Step 3:** sul pannello elenco sostituire `action={activeFilters(filters).length ? "Azzera filtri" : "Filtri"}` con `action={filtersOpen ? "Chiudi filtri" : "Filtri"}` e `onPanelAction={() => setFiltersOpen((open) => !open)}`.
- [ ] **Step 4:** spostare l'azzeramento dentro il pannello filtro: `action={activeFilters(filters).length ? "Azzera filtri" : undefined}` + `onPanelAction` che chiama `setFilters({})`.
- [ ] **Step 5:** `npx tsc --noEmit` → nessun errore.

---

### Task 3: Togliere "Regola operativa" dalla cima di Proprietari

**File:**
- Modifica: `src/main.tsx:3808-3826` (primo `<Panel className="span-12" title="Regola operativa">` della `OwnersView`)

- [ ] **Step 1:** rimuovere l'intero primo `<Panel>` con lo `scope-strip`. La pagina deve aprirsi sull'archivio.
- [ ] **Step 2:** `npx tsc --noEmit` → nessun errore.

---

### Task 4: Colonna siti + "Mappa" nel Censimento

**File:**
- Crea: `src/censimento/CensimentoWorkspace.tsx`
- Crea: `src/censimento/sites.ts`
- Modifica: `src/main.tsx` — `CensusView` (~5338), `modulePages.censimento` (~760), `ModuleKey` (~94)
- Test: `tests/censimento-sites.test.js`

**Interfacce:**
- Produce:
  - `type CensimentoSiteId = "mappa" | "sister" | "cercaora" | "datagma" | "whuis"`
  - `interface CensimentoSite { id: CensimentoSiteId; label: string; url: string; mode: "embed" | "external"; note: string }`
  - `const censimentoSites: CensimentoSite[]`
  - `<CensimentoWorkspace sites={CensimentoSite[]} activeSiteId onSelectSite onOpenExternal onClose children />`

- [ ] **Step 1:** `src/censimento/sites.ts` — 5 voci, `whuis` con `mode: "external"`, gli altri `mode: "embed"`; `mappa` con `url: ""`.
- [ ] **Step 2:** `tests/censimento-sites.test.js` — verifica con il pattern di `tests/storage.test.js` (traspila il `.ts` e lo importa) che: esistono 5 siti; `whuis` è `external`; nessun sito `embed` ha `url` vuoto; `mappa` è l'unico senza url.
- [ ] **Step 3:** `npm test` → il nuovo test passa.
- [ ] **Step 4:** `src/censimento/CensimentoWorkspace.tsx` — colonna sinistra fissa; a destra `children` a piena larghezza se `activeSiteId === null`, altrimenti griglia `1fr 380px` con il pannello sito (iframe o pulsante esterno) e i `children` nell'analisi a destra. Pulsante "Torna al gestionale".
- [ ] **Step 5:** in `main.tsx`, `censimento-mappa` aggiunta a `ModuleKey` e `modulePages.censimento`.
- [ ] **Step 6:** `CensusView` avvolge il contenuto esistente in `<CensimentoWorkspace>`; se `activeSiteId === "mappa"` mostra la mappa (Task 5) invece del gestionale.
- [ ] **Step 7:** `npx tsc --noEmit` → nessun errore.

---

### Task 5: Mappa immobiliare (una sola)

**File:**
- Crea: `src/censimento/PropertyMap.tsx`
- Crea: `src/censimento/geocode.ts`
- Modifica: `src/main.tsx` — pulsante "Mappa immobiliare" in `OwnersView` e nella vista immobili
- Test: `tests/censimento-geocode.test.js`

**Interfacce:**
- Produce:
  - `interface MapProperty { id: string; title: string; zone: string; sheet?: string; parcel?: string; subaltern?: string }`
  - `function normalizePropertyForMap(property, coords?): { id, label, cadastral, lat, lng } | null`
  - `<PropertyMap properties={MapProperty[]} onOpenProperty />`

- [ ] **Step 1:** `npm i leaflet && npm i -D @types/leaflet`
- [ ] **Step 2:** `geocode.ts` — `normalizePropertyForMap`: costruisce `label` da titolo+zona, `cadastral` da foglio/particella/subalterno, `null` se mancano le coordinate. **Mai** `owner` nel risultato.
- [ ] **Step 3:** `tests/censimento-geocode.test.js` — un immobile completo produce label/catasto; senza coordinate → `null`; il risultato non contiene mai la chiave `owner`.
- [ ] **Step 4:** `npm test` → passa.
- [ ] **Step 5:** `PropertyMap.tsx` — `useEffect` che crea la mappa Leaflet, tile OSM, `attribution` visibile, marker con popup `label` + `cadastral`. Cleanup con `map.remove()`. Fly-to sull'immobile selezionato.
- [ ] **Step 6:** immobili senza coordinate elencati sotto la mappa in una lista "Da geolocalizzare".
- [ ] **Step 7:** pulsante "Mappa immobiliare" in `OwnersView` e nella vista immobili → `onOpenModule("censimento", "censimento-mappa")`.
- [ ] **Step 8:** `npx tsc --noEmit` · `npm test` · `npm run build` → tutti verdi.

---

## Verifica finale

- [ ] Apertura a freddo di Contatti, Proprietari, Richieste: nessun filtro visibile.
- [ ] Sidebar con "Proprietari".
- [ ] Censimento: colonna con Mappa, Sister, CercaOra, Datagma, Whuis.
- [ ] Whuis → scheda nuova.
- [ ] Un sito aperto → gestionale ancora visibile nell'analisi a destra.
- [ ] Mappa: nessun nome di proprietario.
- [ ] `npx tsc --noEmit` · `npm test` · `npm run build`.
