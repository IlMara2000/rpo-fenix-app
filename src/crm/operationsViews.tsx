import { useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import {
  createActivity,
  makeId,
  nowLabel,
  useFilteredRows,
  type ContactRecord,
  type CrmCommit,
  type CrmData,
  type PropertyRecord,
} from "./kit";
import {
  addDays,
  addMonths,
  dealClosingValues,
  dealStageOrder,
  leaseDeadlines,
  leaseTypeOptions,
  mandateExclusivityOptions,
  mandateState,
  markLeaseRegistered,
  matchesDealFilter,
  nextDealStage,
  officeOptionLabel,
  propertyLabel,
  propertyOptionLabel,
  suggestedLeaseEnd,
  todayIso,
  type DealRecord,
  type DealFilter,
  type LeasePayment,
  type LeaseRecord,
  type LeaseType,
  type MandateRecord,
  type MandateType,
  type OfficeRecord,
  type WorkspaceModuleKey,
} from "./operationsDomain";
import { buildNextActions, closeLinkedRequest, paymentTone, previewOperationsMigration } from "./operations";
import { StructuredQuickForm, type StructuredFormSection } from "./components/StructuredQuickForm";
import { DataTable, Panel } from "../ui/primitives";

type OperationsViewProps = {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenModule: (moduleKey: WorkspaceModuleKey, pageKey?: string, filterTerm?: string) => void;
};

/** Il select porta l'id: due immobili con lo stesso titolo restano distinti. */
export function propertyOptions(data: CrmData) {
  return data.properties.map((property) => ({ value: property.id, label: propertyOptionLabel(property) }));
}

/** Select contatti per l'acquirente/conduttore: il valore e' l'id. */
export function contactOptions(data: CrmData) {
  return data.contacts.map((contact) => ({ value: contact.id, label: contact.name }));
}

/** Select delle richieste ancora aperte: la proposta nasce da una di queste. */
export function requestOptions(data: CrmData) {
  return data.requests
    .filter((request) => !/chiusa|persa/i.test(request.status))
    .map((request) => ({ value: request.id, label: `${request.client} — ${request.target}` }));
}

function propertyOf(data: CrmData, propertyId: string) {
  return data.properties.find((property) => property.id === propertyId);
}

function officeOf(data: CrmData, officeId: string) {
  return data.offices.find((office) => office.id === officeId)?.name ?? "Sede principale";
}

/** Come per gli immobili, il select porta l'id: due sedi omonime restano distinte. */
export function officeOptions(data: CrmData) {
  return data.offices
    .filter((office) => office.active === "Si")
    .map((office) => ({ value: office.id, label: officeOptionLabel(office) }));
}

/** Barra sedi: compare solo quando il gruppo ne ha piu' di una. */
function OfficeFilter({
  offices,
  value,
  onChange,
}: {
  offices: OfficeRecord[];
  value: string;
  onChange: (officeId: string) => void;
}) {
  if (offices.length < 2) {
    return null;
  }
  return (
    <div className="panel-toolbar" aria-label="Filtro sede">
      <button
        className="toolbar-button"
        type="button"
        aria-pressed={!value}
        onClick={() => onChange("")}
      >
        Tutte le sedi
      </button>
      {offices.map((office) => (
        <button
          className="toolbar-button"
          key={office.id}
          type="button"
          aria-pressed={value === office.id}
          onClick={() => onChange(office.id)}
        >
          {office.name}
        </button>
      ))}
    </div>
  );
}

const dealFilters: DealFilter[] = ["Aperte", "Chiuse", "Perse"];
const dealFilterLabels: Record<DealFilter, string> = { Aperte: "aperta", Chiuse: "chiusa", Perse: "persa" };

/** Le trattative chiuse restano in archivio, ma non si mescolano a quelle in corso. */
function DealStageFilter({ value, onChange }: { value: DealFilter; onChange: (filter: DealFilter) => void }) {
  return (
    <div className="panel-toolbar" aria-label="Filtro trattative">
      {dealFilters.map((filter) => (
        <button
          className="toolbar-button"
          key={filter}
          type="button"
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Acquisizione                                                        */
/* ------------------------------------------------------------------ */

export function AcquisitionView({ pageKey, query, data, onCommit, onAction }: OperationsViewProps) {
  const [officeFilter, setOfficeFilter] = useState("");

  const mandateRows = useFilteredRows(data.mandates, query, (mandate) => {
    const property = propertyOf(data, mandate.propertyId);
    return `${propertyLabel(property)} ${mandate.agent} ${mandate.type} ${mandate.exclusivity}`;
  });
  const visibleMandates = (officeFilter ? mandateRows.filter((item) => item.officeId === officeFilter) : mandateRows)
    .slice()
    .sort((first, second) => first.endDate.localeCompare(second.endDate));

  const ownerContactIds = new Set(data.properties.map((property) => property.ownerContactId).filter(Boolean));
  const ownerNames = new Set(
    data.properties.flatMap((property) => property.owner.split(",").map((name) => name.trim().toLowerCase())),
  );
  const cultivable = useFilteredRows(
    data.contacts.filter(
      (contact) =>
        /proprietar/i.test(contact.type) ||
        ownerContactIds.has(contact.id) ||
        ownerNames.has(contact.name.trim().toLowerCase()),
    ),
    query,
    (contact) => `${contact.name} ${contact.phone} ${contact.status}`,
  ).slice(0, 40);

  const withoutMandate = data.properties.filter(
    (property) =>
      !/bozza|archiviat/i.test(property.status) &&
      !data.mandates.some((mandate) => mandate.propertyId === property.id && mandate.status === "Attivo"),
  );

  const sections: StructuredFormSection[] = [
    {
      title: "Nuovo incarico",
      description: "Il mandato e' l'oggetto che autorizza a vendere o locare: senza, l'immobile non e' in portafoglio.",
      fields: [
        { name: "property", label: "Immobile", type: "select", required: true, options: propertyOptions(data), placeholder: "Seleziona immobile" },
        { name: "type", label: "Tipo", type: "select", required: true, options: ["Vendita", "Locazione"] },
        { name: "exclusivity", label: "Forma dell'incarico", type: "select", required: true, options: mandateExclusivityOptions },
        { name: "askingPrice", label: "Prezzo o canone richiesto", type: "number" },
        { name: "minimumPrice", label: "Prezzo minimo concordato", type: "number" },
        { name: "commission", label: "Provvigione", placeholder: "Es. 3% + IVA" },
        { name: "startDate", label: "Decorrenza", type: "date", required: true },
        { name: "endDate", label: "Scadenza", type: "date", required: true },
        { name: "office", label: "Sede", type: "select", required: true, options: officeOptions(data) },
        { name: "agent", label: "Agente" },
        { name: "notes", label: "Note", type: "textarea", wide: true },
      ],
    },
  ];

  function createMandate(property: PropertyRecord, values?: Record<string, string>) {
    const today = todayIso();
    const mandate: MandateRecord = {
      id: makeId("mandate"),
      propertyId: property.id,
      ownerContactId: property.ownerContactId,
      type: (values?.type as MandateType) || (property.kind === "affitto" ? "Locazione" : "Vendita"),
      exclusivity: (values?.exclusivity as MandateRecord["exclusivity"]) || "Non esclusiva",
      askingPrice: values?.askingPrice || property.price || "",
      minimumPrice: values?.minimumPrice || "",
      commission: values?.commission || "",
      startDate: values?.startDate || today,
      endDate: values?.endDate || addMonths(today, 6),
      status: "Attivo",
      officeId: values?.office || property.officeId || data.offices[0]?.id || "",
      agent: values?.agent || property.details?.assignedAgent || "",
      notes: values?.notes || "",
      updatedAt: nowLabel(),
    };
    onCommit(
      (currentData) => ({
        ...currentData,
        mandates: [mandate, ...currentData.mandates],
        activities: [
          createActivity({
            title: `Incarico ${mandate.type.toLowerCase()} ${mandate.exclusivity.toLowerCase()}`,
            type: "Acquisizione",
            contact: property.owner,
            property: propertyLabel(property),
            note: `Scadenza ${mandate.endDate}.`,
          }),
          ...currentData.activities,
        ],
      }),
      `Incarico creato per ${propertyLabel(property)}.`,
    );
  }

  function renewMandate(mandate: MandateRecord) {
    const base = mandate.endDate && mandateState(mandate).days !== null ? mandate.endDate : todayIso();
    onCommit(
      (currentData) => ({
        ...currentData,
        mandates: currentData.mandates.map((item) =>
          item.id === mandate.id
            ? { ...item, endDate: addMonths(base, 12), status: "Attivo", updatedAt: nowLabel() }
            : item,
        ),
      }),
      "Incarico rinnovato di 12 mesi.",
    );
  }

  function closeMandate(mandate: MandateRecord) {
    onCommit(
      (currentData) => ({
        ...currentData,
        mandates: currentData.mandates.map((item) =>
          item.id === mandate.id ? { ...item, status: "Revocato", updatedAt: nowLabel() } : item,
        ),
      }),
      "Incarico revocato: resta nello storico.",
    );
  }

  function recallOwner(contact: ContactRecord) {
    const nextDate = addDays(todayIso(), 7);
    onCommit(
      (currentData) => ({
        ...currentData,
        contacts: currentData.contacts.map((item) =>
          item.id === contact.id
            ? {
                ...item,
                status: "Da ricontattare",
                details: {
                  ...(item.details ?? {}),
                  nextContactDate: nextDate,
                  nextContactReason: "Ricontatto censimento",
                },
                updatedAt: nowLabel(),
              }
            : item,
        ),
        activities: [
          createActivity({
            title: `Ricontatto ${contact.name}`,
            type: "Telefonata",
            contact: contact.name,
            note: `Programmato dal censimento per il ${nextDate}.`,
            day: "Domani",
          }),
          ...currentData.activities,
        ],
      }),
      `Ricontatto programmato per ${contact.name} il ${nextDate}.`,
    );
  }

  return (
    <div className="workspace-grid">
      {pageKey === "acquisizione-nuovo" ? (
        <Panel className="span-12 crm-form-panel" title="Nuovo incarico">
          <StructuredQuickForm
            requiredDefault={false}
            sections={sections}
            submitLabel="Registra incarico"
            onSubmit={(values) => {
              const property = propertyOf(data, values.property);
              if (!property) {
                onAction("Immobile non trovato: ricarica la pagina e riprova.");
                return;
              }
              createMandate(property, values);
            }}
          />
        </Panel>
      ) : null}

      <Panel className="span-12" title="Incarichi in portafoglio">
        <OfficeFilter offices={data.offices} value={officeFilter} onChange={setOfficeFilter} />
        <DataTable
          emptyMessage="Nessun incarico registrato: crea il primo da «Nuovo» oppure dagli immobili senza incarico qui sotto."
          columns={["Immobile", "Proprietario", "Tipo", "Forma", "Scadenza", "Stato", "Sede"]}
          rows={visibleMandates.map((mandate) => {
            const property = propertyOf(data, mandate.propertyId);
            const state = mandateState(mandate);
            return [
              propertyLabel(property),
              property?.owner || "-",
              mandate.type,
              mandate.exclusivity,
              mandate.endDate || "-",
              mandate.status === "Attivo" ? state.label : mandate.status,
              officeOf(data, mandate.officeId),
            ];
          })}
          actions={[
            { label: "Rinnova", onClick: (rowIndex) => { const mandate = visibleMandates[rowIndex]; if (mandate) renewMandate(mandate); } },
            { label: "Revoca", onClick: (rowIndex) => { const mandate = visibleMandates[rowIndex]; if (mandate) closeMandate(mandate); } },
          ]}
        />
      </Panel>

      {pageKey !== "acquisizione-coltivazione" ? (
        <Panel className="span-6" title="Immobili senza incarico">
          <DataTable
            emptyMessage={
              data.properties.length
                ? "Tutti gli immobili hanno un incarico attivo."
                : "Nessun immobile in archivio: crea la prima scheda da Immobili \u2192 Nuovo."
            }
            columns={["Immobile", "Proprietario", "Stato"]}
            rows={withoutMandate.slice(0, 20).map((property) => [
              propertyLabel(property),
              property.owner,
              property.status,
            ])}
            actions={[
              {
                label: "Crea incarico",
                onClick: (rowIndex) => {
                  const property = withoutMandate[rowIndex];
                  if (property) {
                    createMandate(property);
                  }
                },
              },
            ]}
          />
        </Panel>
      ) : null}

      <Panel className={pageKey === "acquisizione-coltivazione" ? "span-12" : "span-6"} title="Da coltivare">
        <DataTable
          emptyMessage="Nessun proprietario da coltivare: il censimento e' in ordine."
          columns={["Proprietario", "Telefono", "Stato", "Prossimo contatto"]}
          rows={cultivable.map((contact) => {
            const details = (contact.details ?? {}) as Record<string, string | undefined>;
            return [
              contact.name,
              contact.phone || "-",
              contact.status || "-",
              details.nextContactDate || "-",
            ];
          })}
          actions={[
            {
              label: "Ricontatta",
              onClick: (rowIndex) => {
                const contact = cultivable[rowIndex];
                if (contact) {
                  recallOwner(contact);
                }
              },
            },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trattative                                                          */
/* ------------------------------------------------------------------ */

export function DealsView({ pageKey, query, data, onCommit, onAction }: OperationsViewProps) {
  const [officeFilter, setOfficeFilter] = useState("");
  const [stageFilter, setStageFilter] = useState<DealFilter>("Aperte");
  const rows = useFilteredRows(data.deals, query, (deal) => {
    const property = propertyOf(data, deal.propertyId);
    return `${deal.clientName} ${propertyLabel(property)} ${deal.stage}`;
  });
  const visibleDeals = (officeFilter ? rows.filter((deal) => deal.officeId === officeFilter) : rows)
    .filter((deal) => matchesDealFilter(deal, stageFilter))
    .slice()
    .sort((first, second) => first.expiryDate.localeCompare(second.expiryDate));

  const stages = [...dealStageOrder, "Persa"];

  const sections: StructuredFormSection[] = [
    {
      title: "Nuova proposta",
      description: "La proposta e' un impegno con una scadenza: registrala subito, cosi' non si perde nessun esito.",
      fields: [
        { name: "property", label: "Immobile", type: "select", required: true, options: propertyOptions(data), placeholder: "Seleziona immobile" },
        { name: "clientContact", label: "Acquirente o conduttore (contatto)", type: "select", required: false, options: contactOptions(data), placeholder: "Seleziona contatto esistente" },
        { name: "clientName", label: "Nuovo acquirente o conduttore", required: false },
        { name: "request", label: "Richiesta collegata", type: "select", required: false, options: requestOptions(data), placeholder: "Nessuna richiesta" },
        { name: "type", label: "Tipo", type: "select", required: true, options: ["Vendita", "Affitto"] },
        { name: "offerAmount", label: "Importo offerto", type: "number", required: true },
        { name: "deposit", label: "Caparra", type: "number" },
        { name: "proposalDate", label: "Data proposta", type: "date", required: true },
        { name: "expiryDate", label: "Scadenza proposta", type: "date", required: true },
        { name: "commission", label: "Provvigione" },
        { name: "office", label: "Sede", type: "select", required: true, options: officeOptions(data) },
        { name: "agent", label: "Agente" },
        { name: "notes", label: "Note", type: "textarea", wide: true },
      ],
    },
  ];

  function advanceDeal(deal: DealRecord) {
    const next = nextDealStage(deal.stage);
    if (!next) {
      onAction("La trattativa e' gia' chiusa: non c'e' uno stadio successivo.");
      return;
    }
    const closed = next === "Chiusa";
    const property = propertyOf(data, deal.propertyId);
    const closing = closed ? dealClosingValues(deal, todayIso()) : {};
    onCommit(
      (currentData) => ({
        ...currentData,
        deals: currentData.deals.map((item) =>
          item.id === deal.id
            ? {
                ...item,
                stage: next,
                stageChangedAt: new Date().toISOString(),
                ...closing,
                updatedAt: nowLabel(),
              }
            : item,
        ),
        properties: closed
          ? currentData.properties.map((item) =>
              item.id === deal.propertyId
                ? { ...item, status: deal.type === "Affitto" ? "Affittato" : "Venduto", updatedAt: nowLabel() }
                : item,
            )
          : currentData.properties,
        mandates: closed
          ? currentData.mandates.map((mandate) =>
              mandate.propertyId === deal.propertyId && mandate.status === "Attivo"
                ? { ...mandate, status: "Concluso", updatedAt: nowLabel() }
                : mandate,
            )
          : currentData.mandates,
        requests: closed ? closeLinkedRequest(currentData.requests, deal) : currentData.requests,
        activities: [
          createActivity({
            title: `Trattativa «${next}» per ${deal.clientName}`,
            type: "Trattativa",
            contact: deal.clientName,
            property: propertyLabel(property),
            note: `Offerta ${deal.offerAmount || "-"}.`,
          }),
          ...currentData.activities,
        ],
      }),
      closed
        ? `Trattativa chiusa: ${propertyLabel(property)} segnato come ${deal.type === "Affitto" ? "affittato" : "venduto"}.`
        : `Trattativa passata a «${next}».`,
    );
  }

  function loseDeal(deal: DealRecord) {
    onCommit(
      (currentData) => ({
        ...currentData,
        deals: currentData.deals.map((item) =>
          item.id === deal.id
            ? { ...item, stage: "Persa", stageChangedAt: new Date().toISOString(), updatedAt: nowLabel() }
            : item,
        ),
        requests: closeLinkedRequest(currentData.requests, deal),
      }),
      `Trattativa con ${deal.clientName} segnata come persa.`,
    );
  }

  return (
    <div className="workspace-grid">
      {pageKey === "trattative-nuova" ? (
        <Panel className="span-12 crm-form-panel" title="Nuova proposta">
          <StructuredQuickForm
            requiredDefault={false}
            sections={sections}
            submitLabel="Registra proposta"
            onSubmit={(values) => {
              const property = propertyOf(data, values.property);
              if (!property) {
                onAction("Immobile non trovato: ricarica la pagina e riprova.");
                return;
              }
              const selectedContact = values.clientContact
                ? data.contacts.find((contact) => contact.id === values.clientContact)
                : undefined;
              const clientName = (selectedContact?.name || values.clientName || "").trim();
              if (!clientName) {
                onAction("Inserisci un acquirente o seleziona un contatto.");
                return;
              }
              const client = selectedContact ?? data.contacts.find((contact) => contact.name === clientName);
              const deal: DealRecord = {
                id: makeId("deal"),
                propertyId: property.id,
                clientName,
                clientContactId: client?.id,
                type: values.type === "Affitto" ? "Affitto" : "Vendita",
                stage: "Proposta",
                requestId: values.request || undefined,
                offerAmount: values.offerAmount,
                deposit: values.deposit,
                proposalDate: values.proposalDate || todayIso(),
                expiryDate: values.expiryDate || addDays(todayIso(), 15),
                closingDate: "",
                commission: values.commission,
                agent: values.agent || "",
                officeId: values.office || property.officeId || data.offices[0]?.id || "",
                notes: values.notes,
                stageChangedAt: new Date().toISOString(),
                updatedAt: nowLabel(),
              };
              onCommit(
                (currentData) => ({
                  ...currentData,
                  deals: [deal, ...currentData.deals],
                  activities: [
                    createActivity({
                      title: `Proposta di ${deal.clientName}`,
                      type: "Proposta",
                      contact: deal.clientName,
                      property: propertyLabel(property),
                      note: `Offerta ${deal.offerAmount}, scadenza ${deal.expiryDate}.`,
                    }),
                    ...currentData.activities,
                  ],
                }),
                `Proposta registrata per ${propertyLabel(property)}.`,
              );
            }}
          />
        </Panel>
      ) : null}

      {pageKey === "trattative-pipeline" ? (
        <Panel className="span-12" title="Percorso delle trattative">
          <div className="pipeline">
            {stages.map((stage) => {
              const count = data.deals.filter((deal) => deal.stage === stage).length;
              return (
                <div key={stage}>
                  <span>{stage}</span>
                  <strong>{count}</strong>
                  <small>pratiche</small>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      <Panel className="span-12" title="Proposte e trattative">
        <OfficeFilter offices={data.offices} value={officeFilter} onChange={setOfficeFilter} />
        <DealStageFilter value={stageFilter} onChange={setStageFilter} />
        <DataTable
          emptyMessage={`Nessuna trattativa ${dealFilterLabels[stageFilter]}: registra una proposta da «Nuova».`}
          columns={["Immobile", "Cliente", "Tipo", "Stadio", "Offerta", "Prezzo finale", "Provvigione incassata", "Scadenza", "Sede"]}
          rows={visibleDeals.map((deal) => [
            propertyLabel(propertyOf(data, deal.propertyId)),
            deal.clientName,
            deal.type,
            deal.stage,
            deal.offerAmount || "-",
            deal.closingPrice || "-",
            deal.commissionEarned || "-",
            deal.expiryDate || "-",
            officeOf(data, deal.officeId),
          ])}
          actions={[
            { label: "Avanza", onClick: (rowIndex) => { const deal = visibleDeals[rowIndex]; if (deal) advanceDeal(deal); } },
            { label: "Persa", onClick: (rowIndex) => { const deal = visibleDeals[rowIndex]; if (deal) loseDeal(deal); } },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Locazioni                                                           */
/* ------------------------------------------------------------------ */

function buildPayments(leaseId: string, startDate: string, amount: string, months = 12): LeasePayment[] {
  return Array.from({ length: months }, (_, index) => ({
    id: `${leaseId}-rata-${index + 1}`,
    dueDate: addMonths(startDate, index),
    amount,
    status: "Da incassare" as const,
  }));
}

export function LeasesView({ pageKey, query, data, onCommit, onAction }: OperationsViewProps) {
  const [officeFilter, setOfficeFilter] = useState("");

  const leaseRows = useFilteredRows(data.leases, query, (lease) => {
    const property = propertyOf(data, lease.propertyId);
    return `${lease.tenantName} ${propertyLabel(property)} ${lease.contractType}`;
  });
  const visibleLeases = (officeFilter ? leaseRows.filter((lease) => lease.officeId === officeFilter) : leaseRows)
    .slice()
    .sort((first, second) => first.endDate.localeCompare(second.endDate));

  const openPayments = data.leases
    .filter((lease) => !officeFilter || lease.officeId === officeFilter)
    .flatMap((lease) =>
      lease.payments
        .filter((payment) => payment.status !== "Incassato")
        .map((payment) => ({ lease, payment })),
    )
    .sort((first, second) => first.payment.dueDate.localeCompare(second.payment.dueDate));

  const sections: StructuredFormSection[] = [
    {
      title: "Nuovo contratto di locazione",
      description: "Registrazione entro 30 giorni, disdetta 6 mesi prima della scadenza: le scadenze si calcolano da qui.",
      fields: [
        { name: "property", label: "Immobile", type: "select", required: true, options: propertyOptions(data), placeholder: "Seleziona immobile" },
        { name: "tenantContact", label: "Inquilino (contatto)", type: "select", required: false, options: contactOptions(data), placeholder: "Seleziona contatto esistente" },
        { name: "tenantName", label: "Nuovo inquilino", required: false },
        { name: "contractType", label: "Tipo contratto", type: "select", required: true, options: leaseTypeOptions },
        { name: "rent", label: "Canone mensile", type: "number", required: true },
        { name: "deposit", label: "Deposito cauzionale", type: "number" },
        { name: "startDate", label: "Decorrenza", type: "date", required: true },
        { name: "endDate", label: "Scadenza (vuoto = calcolata)", type: "date" },
        { name: "registrationDate", label: "Data registrazione", type: "date" },
        { name: "taxRegime", label: "Regime fiscale", type: "select", required: true, options: ["Cedolare secca", "Ordinario"] },
        { name: "istatAdjustment", label: "Adeguamento ISTAT", type: "select", required: true, options: ["Si", "No"] },
        { name: "office", label: "Sede", type: "select", required: true, options: officeOptions(data) },
        { name: "agent", label: "Agente" },
        { name: "notes", label: "Note", type: "textarea", wide: true },
      ],
    },
  ];

  function registerPayment(leaseId: string, paymentId: string) {
    onCommit(
      (currentData) => ({
        ...currentData,
        leases: currentData.leases.map((lease) =>
          lease.id === leaseId
            ? {
                ...lease,
                payments: lease.payments.map((payment) =>
                  payment.id === paymentId
                    ? { ...payment, status: "Incassato", paidAt: todayIso() }
                    : payment,
                ),
                updatedAt: nowLabel(),
              }
            : lease,
        ),
      }),
      "Canone segnato come incassato.",
    );
  }

  function remindPayment(lease: LeaseRecord, payment: LeasePayment) {
    const property = propertyOf(data, lease.propertyId);
    onCommit(
      (currentData) => ({
        ...currentData,
        leases: currentData.leases.map((item) =>
          item.id === lease.id
            ? {
                ...item,
                payments: item.payments.map((row) =>
                  row.id === payment.id ? { ...row, status: "Sollecito" } : row,
                ),
                updatedAt: nowLabel(),
              }
            : item,
        ),
        activities: [
          createActivity({
            title: `Sollecito canone a ${lease.tenantName}`,
            type: "Sollecito",
            contact: lease.tenantName,
            property: propertyLabel(property),
            note: `Rata del ${payment.dueDate}: ${payment.amount}.`,
            day: "Oggi",
          }),
          ...currentData.activities,
        ],
      }),
      `Sollecito registrato per ${lease.tenantName}.`,
    );
  }

  function generatePayments(lease: LeaseRecord) {
    if (lease.payments.length) {
      onAction("Questo contratto ha gia' un piano di incassi.");
      return;
    }
    onCommit(
      (currentData) => ({
        ...currentData,
        leases: currentData.leases.map((item) =>
          item.id === lease.id
            ? { ...item, payments: buildPayments(item.id, item.startDate || todayIso(), item.rent), updatedAt: nowLabel() }
            : item,
        ),
      }),
      "Piano incassi creato per i prossimi 12 mesi.",
    );
  }

  function renewLease(lease: LeaseRecord) {
    const months = lease.contractType === "3+2 canone concordato" ? 24 : 48;
    onCommit(
      (currentData) => ({
        ...currentData,
        leases: currentData.leases.map((item) =>
          item.id === lease.id
            ? { ...item, endDate: addMonths(item.endDate || todayIso(), months), status: "Attivo", updatedAt: nowLabel() }
            : item,
        ),
      }),
      `Contratto rinnovato di ${months / 12} anni.`,
    );
  }

  function registerLease(lease: LeaseRecord) {
    const date = todayIso();
    onCommit(
      (currentData) => ({
        ...currentData,
        leases: currentData.leases.map((item) =>
          item.id === lease.id ? { ...markLeaseRegistered(item, date), updatedAt: nowLabel() } : item,
        ),
      }),
      `Contratto di ${lease.tenantName} registrato il ${date}: la scadenza sparisce dalla coda.`,
    );
  }

  function closeLease(lease: LeaseRecord) {
    onCommit(
      (currentData) => ({
        ...currentData,
        leases: currentData.leases.map((item) =>
          item.id === lease.id ? { ...item, status: "Chiuso", updatedAt: nowLabel() } : item,
        ),
      }),
      "Contratto chiuso: l'immobile torna disponibile per un nuovo match.",
    );
  }

  return (
    <div className="workspace-grid">
      {pageKey === "locazioni-nuova" ? (
        <Panel className="span-12 crm-form-panel" title="Nuovo contratto">
          <StructuredQuickForm
            requiredDefault={false}
            sections={sections}
            submitLabel="Registra contratto"
            onSubmit={(values) => {
              const property = propertyOf(data, values.property);
              if (!property) {
                onAction("Immobile non trovato: ricarica la pagina e riprova.");
                return;
              }
              const selectedContact = values.tenantContact
                ? data.contacts.find((contact) => contact.id === values.tenantContact)
                : undefined;
              const tenantName = (selectedContact?.name || values.tenantName || "").trim();
              if (!tenantName) {
                onAction("Inserisci un inquilino o seleziona un contatto.");
                return;
              }
              const tenant = selectedContact ?? data.contacts.find((contact) => contact.name === tenantName);
              const startDate = values.startDate || todayIso();
              const contractType = (values.contractType as LeaseType) || "4+4 canone libero";
              const leaseId = makeId("lease");
              const lease: LeaseRecord = {
                id: leaseId,
                propertyId: property.id,
                tenantName,
                tenantContactId: tenant?.id,
                contractType,
                rent: values.rent,
                deposit: values.deposit,
                startDate,
                endDate: values.endDate || suggestedLeaseEnd(startDate, contractType),
                registrationDate: values.registrationDate,
                taxRegime: values.taxRegime === "Ordinario" ? "Ordinario" : "Cedolare secca",
                istatAdjustment: values.istatAdjustment === "No" ? "No" : "Si",
                status: "Attivo",
                payments: buildPayments(leaseId, startDate, values.rent),
                agent: values.agent || "",
                officeId: values.office || property.officeId || data.offices[0]?.id || "",
                notes: values.notes,
                updatedAt: nowLabel(),
              };
              onCommit(
                (currentData) => ({
                  ...currentData,
                  leases: [lease, ...currentData.leases],
                  properties: currentData.properties.map((item) =>
                    item.id === property.id ? { ...item, status: "Affittato", updatedAt: nowLabel() } : item,
                  ),
                  activities: [
                    createActivity({
                      title: `Contratto ${lease.contractType} per ${lease.tenantName}`,
                      type: "Locazione",
                      contact: lease.tenantName,
                      property: propertyLabel(property),
                      note: `Canone ${lease.rent}, registrazione entro 30 giorni.`,
                    }),
                    ...currentData.activities,
                  ],
                }),
                `Contratto registrato per ${propertyLabel(property)}.`,
              );
            }}
          />
        </Panel>
      ) : null}

      <Panel className="span-12" title="Contratti di locazione">
        <OfficeFilter offices={data.offices} value={officeFilter} onChange={setOfficeFilter} />
        <DataTable
          emptyMessage="Nessun contratto di locazione: crea il primo da «Nuovo»."
          columns={["Immobile", "Inquilino", "Contratto", "Canone", "Decorrenza", "Scadenza", "Registrazione", "Sede"]}
          rows={visibleLeases.map((lease) => {
            const registration = leaseDeadlines(lease).find((deadline) => deadline.key === "registrazione");
            return [
              propertyLabel(propertyOf(data, lease.propertyId)),
              lease.tenantName,
              lease.contractType,
              lease.rent || "-",
              lease.startDate || "-",
              lease.endDate || "-",
              lease.registrationDate ||
                (registration ? `Entro il ${registration.date}` : "Registrato"),
              officeOf(data, lease.officeId),
            ];
          })}
          actions={[
            { label: "Registra", onClick: (rowIndex) => { const lease = visibleLeases[rowIndex]; if (lease) registerLease(lease); } },
            { label: "Incassi", onClick: (rowIndex) => { const lease = visibleLeases[rowIndex]; if (lease) generatePayments(lease); } },
            { label: "Rinnova", onClick: (rowIndex) => { const lease = visibleLeases[rowIndex]; if (lease) renewLease(lease); } },
            { label: "Chiudi", onClick: (rowIndex) => { const lease = visibleLeases[rowIndex]; if (lease) closeLease(lease); } },
          ]}
        />
      </Panel>

      <Panel
        className="span-12"
        title="Incassi da registrare"
        action="Aggiorna"
        onPanelAction={() => onAction(`${openPayments.length} rate aperte: segna incassato o invia sollecito dalla tabella.`)}
      >
        <div className="panel-toolbar">
          <span className="toolbar-button" aria-hidden="true">
            <Banknote size={16} />
            {openPayments.length} rate aperte
          </span>
        </div>
        <DataTable
          emptyMessage="Nessun canone da incassare: crea il piano incassi di un contratto con il pulsante «Incassi»."
          columns={["Immobile", "Inquilino", "Scadenza", "Importo", "Stato"]}
          rows={openPayments.map(({ lease, payment }) => [
            propertyLabel(propertyOf(data, lease.propertyId)),
            lease.tenantName,
            payment.dueDate,
            payment.amount || lease.rent || "-",
            paymentTone(payment).label,
          ])}
          actions={[
            {
              label: "Incassa",
              onClick: (rowIndex) => {
                const row = openPayments[rowIndex];
                if (row) {
                  registerPayment(row.lease.id, row.payment.id);
                }
              },
            },
            {
              label: "Sollecita",
              onClick: (rowIndex) => {
                const row = openPayments[rowIndex];
                if (row) {
                  remindPayment(row.lease, row.payment);
                }
              },
            },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sedi                                                                */
/* ------------------------------------------------------------------ */

export function OfficesView({ data, onCommit, onAction }: Pick<OperationsViewProps, "data" | "onCommit" | "onAction">) {
  const sections: StructuredFormSection[] = [
    {
      title: "Nuova sede",
      description: "Ogni incarico, trattativa e contratto puo' essere assegnato a una sede del gruppo.",
      fields: [
        { name: "name", label: "Nome sede", required: true, placeholder: "Es. Milano Centro" },
        { name: "city", label: "Citta'" },
        { name: "address", label: "Indirizzo", wide: true },
        { name: "phone", label: "Telefono", type: "tel" },
        { name: "manager", label: "Responsabile" },
        { name: "active", label: "Attiva", type: "select", required: true, options: ["Si", "No"] },
      ],
    },
  ];

  return (
    <div className="workspace-grid">
      <Panel className="span-12" title="Sedi del gruppo">
        <DataTable
          emptyMessage="Nessuna sede registrata."
          columns={["Sede", "Citta'", "Responsabile", "Telefono", "Attiva"]}
          rows={data.offices.map((office) => [
            office.name,
            office.city || "-",
            office.manager || "-",
            office.phone || "-",
            office.active,
          ])}
        />
      </Panel>
      <Panel className="span-12 crm-form-panel" title="Aggiungi sede">
        <StructuredQuickForm
          requiredDefault={false}
          sections={sections}
          submitLabel="Crea sede"
          onSubmit={(values) => {
            const office: OfficeRecord = {
              id: makeId("office"),
              name: values.name,
              city: values.city,
              address: values.address,
              phone: values.phone,
              manager: values.manager,
              color: "#ff675d",
              active: values.active === "No" ? "No" : "Si",
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({ ...currentData, offices: [...currentData.offices, office] }),
              `Sede ${office.name} creata.`,
            );
            onAction(`Sede ${office.name} creata.`);
          }}
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Migrazione: anteprima, conferma e annullamento                      */
/* ------------------------------------------------------------------ */

function MigrationStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="migration-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MigrationDetail({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }
  return (
    <div>
      <h3>{title}</h3>
      <ul>
        {items.slice(0, 6).map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
        {items.length > 6 ? <li>… e altri {items.length - 6}</li> : null}
      </ul>
    </div>
  );
}

/**
 * La migrazione non parte da sola: qui si vede cosa verrebbe creato o
 * collegato, si conferma, e resta la possibilita' di tornare indietro.
 */
export function MigrationPanel({
  data,
  pending,
  backupAvailable,
  onApply,
  onUndo,
  onDismiss,
}: {
  data: CrmData;
  pending: boolean;
  backupAvailable: boolean;
  onApply: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const report = useMemo(
    () => (pending ? previewOperationsMigration(data) : null),
    [data, pending],
  );

  if (!pending && !backupAvailable) {
    return null;
  }

  if (!pending && backupAvailable) {
    return (
      <section className="area-card area-actions-card">
        <header className="area-card-header">
          <h2>Migrazione applicata</h2>
          <span className="area-card-tag">reversibile</span>
        </header>
        <div className="area-list-section">
          <p>
            I dati sono stati convertiti nel nuovo modello. La copia di sicurezza creata prima
            della conversione è ancora disponibile: puoi tornare all'archivio di prima quando vuoi.
          </p>
          <div className="migration-actions">
            <button className="toolbar-button" type="button" onClick={onUndo}>
              Annulla migrazione
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!report) {
    return null;
  }

  const totalChanges =
    report.ownerContacts + report.mandates + report.leases + report.deals + report.linkedProperties;

  return (
    <section className="area-card area-actions-card">
      <header className="area-card-header">
        <h2>Conversione dei dati</h2>
        <span className="area-card-tag">anteprima</span>
      </header>
      <div className="area-list-section">
        <p>
          Nulla è stato ancora modificato. Applicando, il gestionale crea incarichi, contratti e
          trattative dai dati esistenti e collega i proprietari per identificativo. Prima di
          scrivere viene salvata una copia integrale dell'archivio attuale, così la conversione
          resta annullabile.
        </p>
        <div className="migration-summary">
          <MigrationStat value={report.offices} label="Sedi" />
          <MigrationStat value={report.ownerContacts} label="Proprietari creati" />
          <MigrationStat value={report.linkedProperties} label="Immobili collegati" />
          <MigrationStat value={report.mandates} label="Incarichi" />
          <MigrationStat value={report.leases} label="Contratti" />
          <MigrationStat value={report.deals} label="Trattative" />
        </div>
        <div className="migration-detail">
          <MigrationDetail title="Proprietari creati in rubrica" items={report.ownerContactNames} />
          <MigrationDetail title="Incarichi ricostruiti" items={report.mandateDetails} />
          <MigrationDetail title="Contratti di locazione ricostruiti" items={report.leaseDetails} />
          <MigrationDetail title="Trattative ricostruite" items={report.dealDetails} />
          {report.notes.length ? (
            <div>
              <h3>Da verificare</h3>
              <ul>
                {report.notes.slice(0, 8).map((note, index) => (
                  <li key={`${note}-${index}`}>{note}</li>
                ))}
                {report.notes.length > 8 ? <li>… e altre {report.notes.length - 8} segnalazioni</li> : null}
              </ul>
            </div>
          ) : null}
          {totalChanges === 0 ? (
            <p>Nessun dato da convertire: verranno create solo le sedi predefinite.</p>
          ) : null}
        </div>
        <div className="migration-actions">
          <button className="toolbar-button is-primary" type="button" onClick={onApply}>
            Applica migrazione
          </button>
          <button className="toolbar-button" type="button" onClick={onDismiss}>
            Non ora
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Prossimi passi (dashboard)                                          */
/* ------------------------------------------------------------------ */

export function NextActionsPanel({
  data,
  onOpenModule,
}: {
  data: CrmData;
  onOpenModule: (moduleKey: WorkspaceModuleKey, pageKey?: string, filterTerm?: string) => void;
}) {
  const actions = useMemo(() => buildNextActions(data), [data]);

  if (!actions.length) {
    return null;
  }

  return (
    <section className="area-card area-actions-card">
      <header className="area-card-header">
        <h2>Prossimi passi</h2>
        <span className="area-card-tag">{actions.length} da fare</span>
      </header>
      <div className="area-list-section">
        <div className="area-recall-list">
          <div className="area-recall-head">
            <span>Priorita'</span>
            <span>Cosa</span>
            <span>Quando</span>
          </div>
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onOpenModule(action.moduleKey, action.pageKey, action.query)}
            >
              <span>
                <strong>{action.kind}</strong>
                <small>{action.title}</small>
              </span>
              <b>{action.detail}</b>
              <em>{action.when || "da pianificare"}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
