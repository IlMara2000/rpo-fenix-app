import type { ReactNode } from "react";

/**
 * Dati del prestatore richiesti dall'art. 7 D.Lgs. 70/2003 e dall'art. 13 GDPR.
 * Sostituire ogni valore tra doppie graffe prima della pubblicazione.
 */
export const LEGAL_ENTITY = {
  denominazione: "{{RAGIONE SOCIALE}}",
  forma: "{{FORMA GIURIDICA}}",
  sede: "{{INDIRIZZO SEDE LEGALE, CAP CITTA (PROVINCIA)}}",
  piva: "{{PARTITA IVA}}",
  rea: "{{NUMERO REA}}",
  pec: "{{INDIRIZZO PEC}}",
  email: "daniele.marangoni@grfenix.com",
  telefono: "{{TELEFONO}}",
  hosting: "Vercel Inc.",
  updatedAt: "1 novembre 2026",
} as const;

const pendingFields = String(Object.values(LEGAL_ENTITY).join(" ")).includes("{{");

export type LegalDocumentKey = "privacy" | "termini" | "note-legali";

export function legalDocumentFor(path: string): LegalDocumentKey | null {
  const normalized = path.replace(/\/+$/, "").toLowerCase();
  if (normalized === "/privacy") return "privacy";
  if (normalized === "/termini") return "termini";
  if (normalized === "/note-legali") return "note-legali";
  return null;
}

const F = LEGAL_ENTITY;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function PrivacyBody() {
  return (
    <>
      <Section title="1. Titolare del trattamento">
        <p>
          Il titolare del trattamento è <strong>{F.denominazione}</strong> ({F.forma}), con sede in{" "}
          {F.sede}, P.IVA {F.piva}, REA {F.rea}, PEC {F.pec}, e-mail {F.email}.
        </p>
        <p>
          Non è stato nominato un Responsabile della protezione dei dati (DPO); per qualsiasi
          richiesta relativa ai dati personali si utilizza il recapito indicato sopra.
        </p>
      </Section>

      <Section title="2. Categorie di interessati">
        <p>La piattaforma Fenix Suite tratta dati personali di:</p>
        <ul>
          <li>utenti della piattaforma (agenti e collaboratori delle agenzie autorizzate);</li>
          <li>clienti, proprietari e conduttori presenti nelle anagrafiche dell'agenzia;</li>
          <li>persone contattate nell'ambito delle attività di ricontatto e telemarketing;</li>
          <li>visitatori che scrivono tramite il modulo di contatto del sito.</li>
        </ul>
      </Section>

      <Section title="3. Categorie di dati trattati">
        <ul>
          <li>dati identificativi e di contatto: nome, cognome, e-mail, telefono, indirizzo;</li>
          <li>dati fiscali necessari alle compravendite e alle locazioni, compreso il codice fiscale;</li>
          <li>dati degli immobili: indirizzo, dati catastali, planimetrie, fotografie, documenti;</li>
          <li>note operative, esiti delle telefonate, appuntamenti e promemoria;</li>
          <li>dati di autenticazione: e-mail e credenziali gestite dal fornitore di identità;</li>
          <li>dati tecnici di sicurezza: indirizzo IP in forma pseudonimizzata e orari di accesso.</li>
        </ul>
        <p>
          Non vengono richiesti dati appartenenti alle categorie particolari di cui all'art. 9
          GDPR. Se inseriti dall'utente nelle note libere, il trattamento avviene sotto la
          responsabilità dell'agenzia che li ha registrati.
        </p>
      </Section>

      <Section title="4. Finalità e basi giuridiche">
        <ul>
          <li>
            <strong>Erogazione del servizio</strong> agli utenti autorizzati: esecuzione del
            contratto o misure precontrattuali (art. 6.1.b GDPR).
          </li>
          <li>
            <strong>Gestione delle anagrafiche di clienti e immobili</strong> per conto
            dell'agenzia: esecuzione del contratto e adempimento di obblighi di legge
            (art. 6.1.b e 6.1.c GDPR). Per questi dati l'agenzia cliente agisce come titolare e
            il fornitore della piattaforma come responsabile del trattamento.
          </li>
          <li>
            <strong>Ricontatto, telemarketing e attività commerciali</strong>: consenso
            dell'interessato (art. 6.1.a GDPR), revocabile in qualsiasi momento, e verifica
            dell'iscrizione al Registro Pubblico delle Opposizioni.
          </li>
          <li>
            <strong>Sicurezza, prevenzione degli abusi e integrità del servizio</strong>:
            legittimo interesse del titolare (art. 6.1.f GDPR).
          </li>
          <li>
            <strong>Riscontro alle richieste ricevute dal modulo di contatto</strong>: misure
            precontrattuali ed esecuzione del contratto (art. 6.1.b GDPR).
          </li>
        </ul>
      </Section>

      <Section title="5. Natura del conferimento">
        <p>
          Il conferimento dei dati è necessario per l'utilizzo della piattaforma e per
          l'esecuzione delle attività dell'agenzia. Il rifiuto impedisce l'erogazione del
          servizio. Il consenso alle comunicazioni commerciali è facoltativo e la sua assenza non
          pregiudica l'accesso agli strumenti operativi.
        </p>
      </Section>

      <Section title="6. Destinatari e responsabili del trattamento">
        <p>
          I dati sono trattati da personale autorizzato e da fornitori nominati responsabili ai
          sensi dell'art. 28 GDPR, tra cui:
        </p>
        <ul>
          <li>Supabase Inc. — autenticazione e base di dati;</li>
          <li>{F.hosting} — hosting dell'applicazione e delle funzioni server;</li>
          <li>
            fornitori di servizi di intelligenza artificiale raggiunti tramite le funzioni
            server della piattaforma, per la generazione e il miglioramento delle planimetrie.
          </li>
        </ul>
        <p>
          I dati non sono ceduti a terzi per finalità di marketing autonomo e non sono diffusi.
        </p>
      </Section>

      <Section title="7. Trasferimenti verso Paesi terzi">
        <p>
          Alcuni fornitori possono trattare dati al di fuori dello Spazio Economico Europeo. In
          tal caso il trasferimento avviene sulla base di decisioni di adeguatezza o delle
          clausole contrattuali standard approvate dalla Commissione europea (art. 45 e 46
          GDPR), integrate dalle misure supplementari del caso.
        </p>
      </Section>

      <Section title="8. Periodo di conservazione">
        <ul>
          <li>dati delle anagrafiche: per la durata del rapporto e per i termini di legge
            previsti in materia fiscale, contabile e contrattuale;</li>
          <li>registrazioni delle attività di ricontatto e consensi: fino alla revoca e comunque
            per il tempo necessario a dimostrare la liceità del trattamento;</li>
          <li>richieste ricevute dal modulo di contatto: dodici mesi dall'ultimo scambio;</li>
          <li>dati tecnici di sicurezza: il tempo strettamente necessario alla verifica.</li>
        </ul>
        <p>
          I dati salvati localmente nel browser dell'utente restano sul dispositivo fino alla
          cancellazione da parte dell'utente o alla disinstallazione del browser.
        </p>
      </Section>

      <Section title="9. Diritti dell'interessato">
        <p>
          L'interessato può chiedere l'accesso, la rettifica, la cancellazione, la limitazione e
          la portabilità dei dati, oppure opporsi al trattamento e revocare il consenso in
          qualsiasi momento (artt. 15-22 GDPR), scrivendo a {F.email}. Riceverà riscontro entro
          un mese. È inoltre possibile proporre reclamo al Garante per la protezione dei dati
          personali.
        </p>
      </Section>

      <Section title="10. Sicurezza del trattamento">
        <p>
          L'accesso alla piattaforma richiede un'identità verificata e un profilo attivo; i dati
          sono protetti da regole di isolamento per utente e da connessioni cifrate.
        </p>
        <p>
          <strong>Avvertenza sui dati salvati nel browser.</strong> Gli strumenti operativi
          conservano una copia dei dati nel browser dell'utente per consentire il lavoro anche
          in caso di rete instabile. Questa copia locale non è cifrata: chi ha accesso al
          profilo del browser o al dispositivo può leggerla. Si raccomanda di usare dispositivi
          protetti da password, di non condividere la postazione di lavoro e di effettuare il
          logout al termine dell'attività.
        </p>
      </Section>

      <Section title="11. Contenuti generati con sistemi di intelligenza artificiale">
        <p>
          Le planimetrie arredate sono ricostruzioni generate automaticamente a partire dalla
          planimetria caricata dall'utente. Non sono fotografie dell'immobile e non sostituiscono
          una verifica tecnica. Devono essere presentate come contenuti illustrativi generati, e
          non come rappresentazione fotografica reale, nelle schede commerciali e negli annunci.
        </p>
      </Section>

      <Section title="12. Cookie e archiviazione locale">
        <p>
          Il sito non utilizza cookie di profilazione, analytics o pubblicitari e non impiega
          strumenti di tracciamento di terze parti. Sono utilizzati esclusivamente strumenti
          tecnici necessari all'autenticazione e al funzionamento dell'applicazione. Per questa
          ragione non è mostrato un banner di consenso; le informazioni sull'archiviazione
          locale sono riportate in questa pagina.
        </p>
      </Section>

      <Section title="13. Modifiche">
        <p>
          Questa informativa può essere aggiornata. La versione vigente è sempre pubblicata a
          questa pagina; l'ultimo aggiornamento risale al {F.updatedAt}.
        </p>
      </Section>
    </>
  );
}

function TerminiBody() {
  return (
    <>
      <Section title="1. Oggetto">
        <p>
          I presenti termini regolano l'accesso e l'utilizzo di Fenix Suite, piattaforma software
          per la gestione di immobili, clienti, agenda, documenti, attività di ricontatto e
          planimetrie, erogata da <strong>{F.denominazione}</strong> ({F.forma}), con sede in{" "}
          {F.sede}, P.IVA {F.piva}.
        </p>
      </Section>

      <Section title="2. Accesso al servizio">
        <p>
          L'accesso è riservato agli utenti autorizzati dall'agenzia titolare dell'account. Le
          credenziali sono personali e non trasferibili. L'utente è responsabile della
          riservatezza delle proprie credenziali e si impegna a segnalare immediatamente ogni
          utilizzo non autorizzato.
        </p>
        <p>
          Il gestore può sospendere o revocare l'accesso in caso di violazione dei presenti
          termini, di utilizzo improprio degli strumenti o di mancato pagamento.
        </p>
      </Section>

      <Section title="3. Uso consentito">
        <p>
          Il servizio è destinato esclusivamente all'attività professionale dell'agenzia. È
          vietato: cedere l'accesso a terzi, estrarre o rivendere i dati della piattaforma,
          caricare contenuti illeciti o lesivi di diritti altrui, tentare di eludere i sistemi di
          sicurezza, utilizzare gli strumenti di generazione automatica per produrre contenuti
          ingannevoli.
        </p>
      </Section>

      <Section title="4. Attività di contatto e telemarketing">
        <p>
          Gli strumenti di ricontatto e le liste operaie devono essere utilizzati nel rispetto
          della normativa applicabile, compreso il Registro Pubblico delle Opposizioni. Prima di
          ogni campagna l'utente verifica l'esistenza di un valido consenso o di altra base
          giuridica e registra negli appositi campi la base giuridica, la data del consenso, la
          versione dell'informativa e l'eventuale revoca.
        </p>
        <p>
          L'agenzia che utilizza il servizio resta titolare del trattamento dei dati dei propri
          clienti e risponde delle modalità con cui li raccoglie e li utilizza.
        </p>
      </Section>

      <Section title="5. Contenuti generati con intelligenza artificiale">
        <p>
          Le planimetrie arredate e gli altri contenuti generati sono ricostruzioni illustrative
          ottenute da modelli automatici e possono contenere imprecisioni. Non costituiscono
          fotografia o rappresentazione certificata dell'immobile. L'utente si impegna a non
          presentarli come immagini reali nei documenti destinati a clienti e portali.
        </p>
      </Section>

      <Section title="6. Dati salvati sul dispositivo">
        <p>
          Gli strumenti operativi conservano copie di lavoro nel browser dell'utente. Tali copie
          non sono cifrate e la loro integrità dipende dal dispositivo utilizzato. L'utente è
          tenuto a usare dispositivi protetti e a effettuare il logout al termine dell'attività.
        </p>
      </Section>

      <Section title="7. Proprietà intellettuale">
        <p>
          Il software, l'interfaccia, i marchi e i contenuti della piattaforma sono di titolarità
          del gestore o dei rispettivi aventi diritto. È concessa una licenza d'uso limitata,
          non esclusiva e non trasferibile per la durata del rapporto. I dati inseriti
          dall'agenzia restano di titolarità dell'agenzia.
        </p>
      </Section>

      <Section title="8. Disponibilità e manutenzione">
        <p>
          Il servizio è erogato con impegno di continuità ma senza garanzia di assenza di
          interruzioni. Possono essere programmati interventi di manutenzione e aggiornamenti,
          anche senza preavviso quando necessari per la sicurezza.
        </p>
      </Section>

      <Section title="9. Limitazione di responsabilità">
        <p>
          Nei limiti consentiti dalla legge, il gestore non risponde di danni indiretti, di
          perdita di dati dovuta al dispositivo dell'utente o a cause non imputabili al servizio.
          Restano fermi i diritti inderogabili del consumatore e la responsabilità per dolo o
          colpa grave.
        </p>
      </Section>

      <Section title="10. Recesso e cancellazione">
        <p>
          L'utente può cessare l'utilizzo in qualsiasi momento. La richiesta di cancellazione
          dell'account e dei dati associati si invia a {F.email}; i dati vengono eliminati nei
          termini tecnici necessari, salvo obblighi di conservazione previsti dalla legge.
        </p>
      </Section>

      <Section title="11. Legge applicabile e foro competente">
        <p>
          I presenti termini sono regolati dalla legge italiana. Per le controversie è competente
          il foro del luogo in cui il gestore ha sede, fatte salve le disposizioni inderogabili a
          tutela del consumatore.
        </p>
      </Section>

      <Section title="12. Modifiche">
        <p>
          I termini possono essere aggiornati; le modifiche sostanziali sono comunicate agli
          utenti. Versione vigente aggiornata al {F.updatedAt}.
        </p>
      </Section>
    </>
  );
}

function NoteLegaliBody() {
  return (
    <>
      <Section title="Informazioni sul prestatore del servizio">
        <p>Ai sensi dell'art. 7 del D.Lgs. 70/2003 si indicano le seguenti informazioni.</p>
        <ul>
          <li>Denominazione: {F.denominazione}</li>
          <li>Forma giuridica: {F.forma}</li>
          <li>Sede legale: {F.sede}</li>
          <li>Partita IVA: {F.piva}</li>
          <li>Numero REA: {F.rea}</li>
          <li>PEC: {F.pec}</li>
          <li>E-mail: {F.email}</li>
          <li>Telefono: {F.telefono}</li>
        </ul>
      </Section>

      <Section title="Hosting">
        <p>
          Il servizio è ospitato presso {F.hosting}. La base di dati e l'autenticazione sono
          erogate da Supabase Inc.
        </p>
      </Section>

      <Section title="Marchi">
        <p>
          «Fenix Suite» e «Fenix Group» sono denominazioni utilizzate dal gestore. Nessun
          simbolo di marchio registrato è impiegato in assenza di registrazione.
        </p>
      </Section>

      <Section title="Segnalazioni">
        <p>
          Per segnalare contenuti illeciti, errori o problemi di accessibilità scrivere a{" "}
          {F.email}. Per i dati personali consultare l'informativa privacy; per le condizioni
          d'uso i termini e condizioni.
        </p>
      </Section>
    </>
  );
}

const documents: Record<LegalDocumentKey, { title: string; body: () => ReactNode }> = {
  privacy: { title: "Informativa privacy", body: PrivacyBody },
  termini: { title: "Termini e condizioni", body: TerminiBody },
  "note-legali": { title: "Note legali", body: NoteLegaliBody },
};

export function LegalPage({ documentKey }: { documentKey: LegalDocumentKey }) {
  const document = documents[documentKey];
  const Body = document.body;

  return (
    <main className="legal-page">
      <header className="legal-header">
        <img className="legal-logo" src="/logo.png" alt="Fenix Group" />
        <a className="legal-back" href="/login">
          ← Torna all'accesso
        </a>
      </header>
      <article className="legal-document">
        <h1>{document.title}</h1>
        <p className="legal-updated">Ultimo aggiornamento: {F.updatedAt}</p>
        {pendingFields ? (
          <p className="legal-warning" role="note">
            Documento in bozza: i dati del prestatore non sono ancora completati.
          </p>
        ) : null}
        <Body />
        <nav className="legal-footer-links" aria-label="Altri documenti legali">
          <a href="/privacy">Informativa privacy</a>
          <a href="/termini">Termini e condizioni</a>
          <a href="/note-legali">Note legali</a>
        </nav>
      </article>
    </main>
  );
}
