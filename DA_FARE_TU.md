# Cosa resta da fare a te

Lista delle cose che non posso fare io, perché servono dati, accessi o decisioni tue.
In ordine di importanza: le prime due bloccano cose visibili ai clienti.

---

## 1. I dati della tua azienda nelle pagine legali

Le pagine **Privacy**, **Termini** e **Note legali** oggi mostrano l'avviso
"Documento in bozza" e non puoi mandarle a un cliente così.

Apri `src/legal.tsx` e sostituisci i valori fra doppie graffe:

| Campo | Cosa scrivere | Esempio |
| --- | --- | --- |
| `denominazione` | Ragione sociale completa | Rossi Immobili S.r.l. |
| `forma` | Forma giuridica | Società a responsabilità limitata |
| `sede` | Indirizzo della sede legale | Via Roma 1, 20100 Milano (MI) |
| `piva` | Partita IVA | 12345678901 |
| `rea` | Numero REA con la sigla della provincia | MI-1234567 |
| `pec` | Indirizzo PEC | rossi@pec.it |
| `telefono` | Telefono pubblico | +39 02 1234567 |

L'email `daniele.marangoni@grfenix.com` è già corretta, non toccarla.
Quando non resta nessuna doppia graffa, l'avviso "Documento in bozza" sparisce da solo.

Se preferisci, passami i valori e li inserisco io: non sono segreti, sono dati
che finiscono comunque in una pagina pubblica.

---

## 2. Le impostazioni di Supabase (il database e gli accessi)

Nel file `supabase/config.toml` ho scritto le regole giuste, **ma quel file vale
solo sul tuo computer**. Il progetto online ha ancora le impostazioni vecchie.
Vai su [supabase.com](https://supabase.com) → il tuo progetto → **Authentication**:

1. **Sign In / Providers → Email**: lascia **disattivato** "Allow new users to sign up".
   La registrazione deve essere possibile solo a te dalla dashboard, non dalla piattaforma.
2. **Email → Confirm email**: attivalo.
3. **Password**: lunghezza minima **12**, con maiuscola, minuscola, numero e simbolo.
4. **Attack Protection**: attiva il captcha (hCaptcha o Cloudflare Turnstile) e recupera
   la chiave del sito e quella segreta.
5. **URL Configuration → Site URL**: oggi punta a `http://localhost:3000`.
   Va messo l'indirizzo vero, cioè `https://grfenix.vercel.app`, e in
   "Redirect URLs" la stessa cosa con `/**` in coda.

Poi, nel file `src/main.tsx` (o dove sta la creazione del client Supabase), il captcha
va collegato: quando hai le due chiavi passamele e lo faccio io, oppure le metti tu
nelle variabili d'ambiente del progetto su Vercel.

Come verificare: dalla pagina di accesso, "Password dimenticata" deve mandare
l'email di recupero, e un tentativo di registrazione dall'esterno deve essere rifiutato.

---

## 3. La migrazione del database da applicare

Il file `supabase/migrations/20261023201115_secure_profile_authority.sql` contiene le
regole che bloccano gli account sospesi e mettono il tetto di **10 generazioni AI al
giorno per utente**. È testato, ma **non è ancora stato applicato al database online**.

Due modi, scegli quello che ti è più comodo:

- **Dalla dashboard**: Supabase → **SQL Editor** → apri il file, copia tutto, incolla, esegui.
- **Da terminale**, se hai la CLI collegata al progetto: `supabase db push`.

Come verificare: dopo l'esecuzione, nella tabella dei profili un account sospeso non deve
più poter leggere i dati. Se vuoi lo provo io con un utente di test.

---

## 4. Le due chiavi da rigenerare

Sono state usate in chiaro durante lo sviluppo e vanno considerate compromesse:

- **La chiave AI** (`OPENAI_API_KEY`): la trovi nella dashboard del fornitore, la revochi
  e ne crei una nuova. Va messa solo nelle variabili d'ambiente di Vercel, mai nel codice.
- **La chiave di Hugging Face** (`HF_TOKEN`): stessa cosa, dal tuo account Hugging Face.

Quando le hai rigenerate, non incollarle qui: mettile tu su Vercel → Settings →
Environment Variables, oppure dimmi che sono pronte e ti dico il nome esatto della variabile.

---

## 5. Gli account dei quattro siti esterni

La colonna dei siti nel Censimento è pronta, ma i contenuti dipendono dai tuoi rapporti:

- **Sister** (Agenzia delle Entrate): serve la convenzione attiva per consultare le
  banche dati. Finché non c'è, il riquadro resta vuoto o mostra la pagina di accesso.
- **CercaOra** e **Datagma**: funzionano a crediti. Serve un account attivo con credito
  residuo; quando finiscono i crediti le ricerche si fermano.
- **Whuis**: è a pagamento. Si apre in una scheda separata del browser, non dentro la
  pagina, perché il loro sito vieta di essere incorniciato.

Se mi passi gli indirizzi di accesso diretti (non le password: basta il link della pagina
di login di ciascuno), verifico che siano quelli giusti e li sistemo.

---

## 6. Documenti e contratti

Queste non sono cose da codice e vanno fatte con chi ti segue:

- **Informativa privacy** rivista da un consulente, con l'elenco dei fornitori
  (Vercel per l'hosting, Supabase per dati e accessi, il fornitore AI, OpenStreetMap
  per le mappe).
- **Registro dei trattamenti** (art. 30 GDPR): l'elenco di quali dati tratti e perché.
- **Contratti di nomina a responsabile** (DPA) con Vercel e Supabase: si accettano dalle
  loro pagine, sono documenti standard.
- **Licenza del software**: oggi non c'è. Se il codice resta tuo, va scritto che è
  proprietario e non open source.

---

## Cosa ho già fatto io e non devi fare

- Filtri nascosti all'avvio in tutte le pagine del gestionale.
- Proprietari raggiungibile dalla barra laterale.
- Colonna dei siti nel Censimento, con gestionale attivo a destra.
- Una sola mappa immobiliare al posto delle due finte, con attribuzione OpenStreetMap
  e senza nomi di proprietari.
- La posizione scelta sulla mappa ora si salva **sull'immobile**, non più in una memoria
  separata: finisce anche nelle copie di sicurezza che scarichi e non si perde se si
  pulisce la memoria del browser. In più puoi posizionare a mano un immobile cliccando
  sulla mappa, senza dipendere dalla ricerca dell'indirizzo.
- Test automatici, controllo dei tipi e build: tutti verdi.

---

## Una cosa da sapere (non è un compito)

Il gestionale salva i dati **dentro il browser del computer che stai usando**, legati al
tuo account. Questo vale per immobili, contatti, richieste e adesso anche per le mappe.
Vuol dire che se lavori da un altro computer, o da un altro browser, non ritrovi i dati:
non sono sincronizzati. Le copie di sicurezza che scarichi invece sono complete e
contengono anche le posizioni sulla mappa.

Se in futuro vorrai che due persone o due computer vedano gli stessi dati in tempo reale,
si passa a salvarli sul database Supabase invece che nel browser. È un lavoro a parte,
dimmi quando ha senso farlo.
