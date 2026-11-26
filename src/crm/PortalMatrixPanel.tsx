import { DataTable, Panel } from "../ui/primitives";
import type { CrmCommit, PropertyRecord } from "./kit";
import { portalOutcome, portalSites, portalTotals, publishOnEverySite } from "./portalMatrix";
import { todayIso } from "./operationsDomain";

/**
 * Matrice di pubblicazione: un immobile, l'esito su ogni sito.
 * Segnare l'invio registra l'esito nel CRM: il caricamento sui portali resta
 * manuale finché non colleghiamo l'API di ciascun sito.
 */
export function PortalMatrixPanel({
  properties,
  onCommit,
}: {
  properties: PropertyRecord[];
  onCommit: CrmCommit;
}) {
  return (
    <Panel className="span-12" title="Matrice portali">
      <DataTable
        emptyMessage="Nessun immobile in archivio: la matrice si popola con il primo immobile."
        columns={["Immobile", ...portalSites.map((site) => site.label), "Pubblicati"]}
        rows={properties.map((property) => {
          const totals = portalTotals(property);
          return [
            `${property.code} · ${property.title}`,
            ...portalSites.map((site) => portalOutcome(property, site)),
            `${totals.published}/${totals.total}`,
          ];
        })}
        actions={[
          {
            label: "Segna inviato",
            onClick: (rowIndex) => {
              const property = properties[rowIndex];
              if (!property) {
                return;
              }
              const published = publishOnEverySite(property, todayIso());
              onCommit(
                (currentData) => ({
                  ...currentData,
                  properties: currentData.properties.map((item) =>
                    item.id === property.id ? { ...item, details: published.details, portals: published.portals } : item,
                  ),
                }),
                `${property.code} inviato a ${portalSites.length} siti.`,
              );
            },
          },
        ]}
      />
      <p className="panel-note">
        Segnare l'invio registra l'esito qui nel CRM: il caricamento sui portali resta manuale finché non
        colleghiamo l'API di ciascun sito, e «Da aggiornare» compare quando la scheda cambia dopo l'invio.
      </p>
    </Panel>
  );
}
