import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  openInformationArchive,
  sealInformationArchive,
  type InformationArchive,
  type InformationEntry,
} from "../informationVault";

/** Scheda del CRM pronta per l'archivio: identificativo, fonte propria e dati minimi. */
export type ArchiveCandidate = {
  id: string;
  kind: "contact" | "property";
  label: string;
  source: string;
  information: Record<string, string>;
};

type LegalBasis = InformationEntry["provenance"]["legalBasis"];
type Feedback = { tone: "error" | "ok"; text: string };
type Busy = null | "seal" | "open";

const legalBasisOptions: { value: LegalBasis; label: string }[] = [
  { value: "to-review", label: "Da verificare" },
  { value: "consent", label: "Consenso" },
  { value: "contract", label: "Contratto" },
  { value: "legal-obligation", label: "Obbligo legale" },
  { value: "legitimate-interest", label: "Interesse legittimo" },
];

const legalBasisLabels = Object.fromEntries(
  legalBasisOptions.map((option) => [option.value, option.label]),
) as Record<LegalBasis, string>;

const kindLabels: Record<InformationEntry["kind"], string> = {
  contact: "Contatto",
  property: "Immobile",
  note: "Nota",
};

const dayFormatter = new Intl.DateTimeFormat("it-IT", { dateStyle: "short" });
const MAX_FILE_BYTES = 14 * 1024 * 1024;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function oneYearFromTodayIso() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function formatDay(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? dayFormatter.format(parsed) : "—";
}

function entryLabel(entry: InformationEntry) {
  const { information } = entry;
  return (
    information.nome ||
    information.titolo ||
    information.codice ||
    information.name ||
    Object.values(information).find(Boolean) ||
    entry.id
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Operazione non riuscita. Riprova.";
}

function downloadTextFile(content: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function EntryTable({ entries, empty }: { entries: InformationEntry[]; empty: string }) {
  if (!entries.length) {
    return <p className="vault-empty">{empty}</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {["Scheda", "Tipo", "Fonte", "Finalità", "Base giuridica", "Raccolta", "Verifica"].map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entryLabel(entry)}</td>
              <td>{kindLabels[entry.kind]}</td>
              <td>{entry.provenance.source}</td>
              <td>{entry.provenance.purpose}</td>
              <td>{legalBasisLabels[entry.provenance.legalBasis]}</td>
              <td>{formatDay(entry.provenance.collectedAt)}</td>
              <td>{formatDay(entry.provenance.retentionReviewAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) {
    return null;
  }
  return (
    <p className={`vault-feedback ${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
      {feedback.text}
    </p>
  );
}

export function InformationArchivePanel({ records }: { records: ArchiveCandidate[] }) {
  const [included, setIncluded] = useState<Record<ArchiveCandidate["kind"], boolean>>({
    contact: true,
    property: true,
  });
  const [sharedSource, setSharedSource] = useState("");
  const [purpose, setPurpose] = useState("");
  const [legalBasis, setLegalBasis] = useState<LegalBasis>("to-review");
  const [collectedAt, setCollectedAt] = useState(todayIso);
  const [retentionReviewAt, setRetentionReviewAt] = useState(oneYearFromTodayIso);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sealFeedback, setSealFeedback] = useState<Feedback | null>(null);
  const [openFeedback, setOpenFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [opened, setOpened] = useState<{ name: string; archive: InformationArchive } | null>(null);
  const [openPassphrase, setOpenPassphrase] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const counts = useMemo(
    () => ({
      contact: records.filter((record) => record.kind === "contact").length,
      property: records.filter((record) => record.kind === "property").length,
    }),
    [records],
  );

  const selected = useMemo(
    () => records.filter((record) => included[record.kind]),
    [included, records],
  );

  const entries = useMemo<InformationEntry[]>(
    () =>
      selected.map((record) => ({
        id: record.id,
        kind: record.kind,
        information: record.information,
        provenance: {
          source: record.source.trim() || sharedSource.trim(),
          collectedAt,
          purpose: purpose.trim(),
          legalBasis,
          retentionReviewAt,
        },
      })),
    [collectedAt, legalBasis, purpose, retentionReviewAt, selected, sharedSource],
  );

  const missingSource = entries.filter((entry) => !entry.provenance.source).length;

  async function handleSeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSealFeedback(null);

    if (!entries.length) {
      setSealFeedback({ tone: "error", text: "Seleziona almeno una scheda da archiviare." });
      return;
    }
    if (!purpose.trim()) {
      setSealFeedback({ tone: "error", text: "Indica la finalità del trattamento: è obbligatoria per ogni record." });
      return;
    }
    if (!Number.isFinite(Date.parse(collectedAt)) || !Number.isFinite(Date.parse(retentionReviewAt))) {
      setSealFeedback({ tone: "error", text: "Indica la data di raccolta e la data di verifica della conservazione." });
      return;
    }
    if (retentionReviewAt < collectedAt) {
      setSealFeedback({ tone: "error", text: "La verifica della conservazione non può precedere la raccolta." });
      return;
    }
    if (missingSource) {
      setSealFeedback({
        tone: "error",
        text: `${missingSource} ${missingSource === 1 ? "scheda non ha" : "schede non hanno"} una fonte: compila la fonte comune.`,
      });
      return;
    }
    if (passphrase.length < 12) {
      setSealFeedback({ tone: "error", text: "Usa una passphrase di almeno 12 caratteri." });
      return;
    }
    if (passphrase !== confirmation) {
      setSealFeedback({ tone: "error", text: "Le due passphrase non coincidono." });
      return;
    }

    setBusy("seal");
    try {
      const file = await sealInformationArchive(
        { format: "grfenix-information", version: 1, entries },
        passphrase,
      );
      downloadTextFile(file, `fenix-archivio-cifrato-${todayIso()}.json`);
      setPassphrase("");
      setConfirmation("");
      setSealFeedback({
        tone: "ok",
        text: `Archivio cifrato creato con ${entries.length} record. Conserva file e passphrase separatamente: senza passphrase il file non si apre.`,
      });
    } catch (error) {
      setSealFeedback({ tone: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function handleOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpenFeedback(null);

    const file = fileInput.current?.files?.[0];
    if (!file) {
      setOpenFeedback({ tone: "error", text: "Scegli il file dell'archivio cifrato." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setOpenFeedback({ tone: "error", text: "File troppo grande per un archivio di questo formato." });
      return;
    }

    setBusy("open");
    try {
      const archive = await openInformationArchive(await file.text(), openPassphrase);
      setOpened({ name: file.name, archive });
      setOpenPassphrase("");
    } catch (error) {
      setOpened(null);
      setOpenFeedback({ tone: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  function forgetOpened() {
    setOpened(null);
    setOpenPassphrase("");
    setOpenFeedback(null);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  const openedEntries = opened?.archive.entries ?? [];
  const pendingLegal = openedEntries.filter((entry) => entry.provenance.legalBasis === "to-review").length;
  const overdue = openedEntries.filter(
    (entry) => Date.parse(entry.provenance.retentionReviewAt) < Date.now(),
  ).length;

  return (
    <div className="vault-archive">
      <p className="vault-hint">
        Il file viene cifrato nel browser con AES-256-GCM e una chiave derivata dalla passphrase. Il CRM non
        conserva né il file né la passphrase: qui si archiviano le schede selezionate con fonte, finalità e
        revisione della conservazione, e si riapre un archivio per rileggerne il contenuto.
      </p>

      <form className="quick-form vault-form" onSubmit={handleSeal}>
        <section className="vault-step">
          <h3>1. Schede da includere</h3>
          <div className="checklist">
            {(["contact", "property"] as const).map((kind) => (
              <label key={kind}>
                <input
                  type="checkbox"
                  checked={included[kind]}
                  onChange={(event) =>
                    setIncluded((current) => ({ ...current, [kind]: event.currentTarget.checked }))
                  }
                />
                <span>
                  {kindLabels[kind]} ({counts[kind]})
                </span>
              </label>
            ))}
          </div>
          <p className="vault-hint">
            {entries.length} record nell'archivio. Per ogni scheda si salvano solo i dati identificativi già
            presenti nel CRM.
          </p>
        </section>

        <section className="vault-step">
          <h3>2. Fonte, finalità e conservazione</h3>
          <div className="vault-fields">
            <label>
              Fonte comune
              <input
                onChange={(event) => setSharedSource(event.currentTarget.value)}
                placeholder="Usata per le schede senza provenienza propria"
                value={sharedSource}
              />
            </label>
            <label>
              Finalità del trattamento
              <input
                onChange={(event) => setPurpose(event.currentTarget.value)}
                placeholder="Perché questi dati vengono conservati"
                required
                value={purpose}
              />
            </label>
            <label>
              Base giuridica
              <select
                onChange={(event) => setLegalBasis(event.currentTarget.value as LegalBasis)}
                value={legalBasis}
              >
                {legalBasisOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data di raccolta
              <input
                onChange={(event) => setCollectedAt(event.currentTarget.value)}
                required
                type="date"
                value={collectedAt}
              />
            </label>
            <label>
              Verifica conservazione
              <input
                onChange={(event) => setRetentionReviewAt(event.currentTarget.value)}
                required
                type="date"
                value={retentionReviewAt}
              />
            </label>
          </div>
          <p className="vault-hint">
            La provenienza indicata nella scheda prevale sulla fonte comune. «Da verificare» è una dichiarazione
            incompleta: la base giuridica va documentata prima dell'uso dei dati.
          </p>
        </section>

        <section className="vault-step">
          <h3>3. Passphrase del file</h3>
          <div className="vault-fields">
            <label>
              Passphrase
              <input
                autoComplete="new-password"
                minLength={12}
                onChange={(event) => setPassphrase(event.currentTarget.value)}
                required
                type="password"
                value={passphrase}
              />
            </label>
            <label>
              Ripeti passphrase
              <input
                autoComplete="new-password"
                minLength={12}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
                required
                type="password"
                value={confirmation}
              />
            </label>
          </div>
          <p className="vault-hint">
            Almeno 12 caratteri. Non è recuperabile: un file senza passphrase resta chiuso.
          </p>
          <FeedbackLine feedback={sealFeedback} />
          <button disabled={busy === "seal"} type="submit">
            {busy === "seal" ? "Cifratura in corso…" : "Esporta archivio cifrato"}
          </button>
        </section>
      </form>

      <section className="vault-section">
        <div className="vault-section-head">
          <h3>Riepilogo prima dell'esportazione</h3>
          <small>{entries.length} record</small>
        </div>
        <EntryTable entries={entries} empty="Seleziona almeno una scheda per vedere fonte e finalità." />
      </section>

      <form className="quick-form vault-form" onSubmit={handleOpen}>
        <section className="vault-step">
          <h3>4. Riapri un archivio</h3>
          <div className="vault-fields">
            <label>
              File archivio
              <input accept=".json,application/json" ref={fileInput} required type="file" />
            </label>
            <label>
              Passphrase del file
              <input
                autoComplete="off"
                onChange={(event) => setOpenPassphrase(event.currentTarget.value)}
                required
                type="password"
                value={openPassphrase}
              />
            </label>
          </div>
          <FeedbackLine feedback={openFeedback} />
          <button disabled={busy === "open"} type="submit">
            {busy === "open" ? "Apertura in corso…" : "Apri archivio"}
          </button>
        </section>
      </form>

      {opened ? (
        <section className="vault-section">
          <div className="vault-section-head">
            <h3>Archivio aperto</h3>
            <small>
              {opened.name} · {openedEntries.length} record
            </small>
          </div>
          <p className="vault-hint">
            I dati sono solo in memoria in questa pagina: si cancellano chiudendo l'archivio o ricaricando. La
            cifratura protegge il file, non una pagina compromessa.
          </p>
          {pendingLegal || overdue ? (
            <p className="vault-warning">
              {pendingLegal ? `${pendingLegal} record con base giuridica da verificare. ` : ""}
              {overdue ? `${overdue} record oltre la data di verifica della conservazione.` : ""}
            </p>
          ) : null}
          <EntryTable entries={openedEntries} empty="L'archivio aperto non contiene record." />
          <button className="form-button" onClick={forgetOpened} type="button">
            Chiudi e dimentica
          </button>
        </section>
      ) : null}
    </div>
  );
}
