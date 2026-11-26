import { useMemo, useState } from "react";
import { Panel } from "../ui/primitives";
import type { CrmData } from "./kit";
import { previewArea159Import } from "./area159Import";

/**
 * Import da export Area159: prima si vede cosa verrebbe scritto, poi si applica,
 * e resta la copia integrale per tornare indietro (come la migrazione).
 */
export function Area159ImportPanel({
  data,
  backupAvailable,
  onApply,
  onUndo,
}: {
  data: CrmData;
  backupAvailable: boolean;
  onApply: (text: string) => void;
  onUndo: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const preview = useMemo(() => (text.trim() ? previewArea159Import(data, text) : null), [data, text]);

  // Chiuso di default: l'import tocca l'archivio, non deve stare sotto il
  // cursore di chi apre la dashboard per altro.
  if (!open) {
    return (
      <Panel
        className="span-12"
        title="Import da Area159"
        action="Apri"
        onPanelAction={() => setOpen(true)}
      >
        <p className="panel-note">
          Carica un export Area159 per vedere in anteprima cosa entrerebbe, prima di scrivere qualsiasi cosa.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="span-12" title="Import da Area159" action="Chiudi" onPanelAction={() => setOpen(false)}>
      <div className="migration-detail">
        <p>
          Scarica l'export dal tuo account Area159 e caricalo qui: nulla viene scritto prima della conferma, e
          gli immobili che hanno lo stesso codice vengono aggiornati invece di essere duplicati.
        </p>
        <input
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          type="file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            setFileName(file.name);
            setText(await file.text());
          }}
        />
        {fileName ? <p>File letto: {fileName}</p> : null}

        {preview ? (
          <>
            <div className="migration-summary">
              <div className="migration-stat">
                <strong>{preview.rows}</strong>
                <span>Righe lette</span>
              </div>
              <div className="migration-stat">
                <strong>{preview.created}</strong>
                <span>Immobili nuovi</span>
              </div>
              <div className="migration-stat">
                <strong>{preview.updated}</strong>
                <span>Immobili aggiornati</span>
              </div>
              <div className="migration-stat">
                <strong>{preview.newContacts.length}</strong>
                <span>Proprietari in rubrica</span>
              </div>
              <div className="migration-stat">
                <strong>{preview.duplicateContacts}</strong>
                <span>Proprietari già presenti</span>
              </div>
            </div>

            {preview.unrecognized.length ? (
              <div>
                <h3>Colonne non riconosciute (restano fuori)</h3>
                <ul>
                  {preview.unrecognized.slice(0, 8).map((header) => (
                    <li key={header}>{header}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.missing.length ? (
              <div>
                <h3>Da verificare</h3>
                <ul>
                  {preview.missing.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="migration-actions">
              <button className="toolbar-button is-primary" type="button" onClick={() => onApply(text)}>
                Applica import
              </button>
              <button className="toolbar-button" type="button" onClick={() => setText("")}>
                Svuota file
              </button>
            </div>
          </>
        ) : null}

        {backupAvailable ? (
          <div className="migration-actions">
            <button className="toolbar-button" type="button" onClick={onUndo}>
              Annulla import
            </button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
