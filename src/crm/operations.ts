import {
  addDays,
  addMonths,
  daysUntil,
  defaultOffice,
  defaultOfficeId,
  formatDateIt,
  leaseDeadlines,
  mandateState,
  propertyLabel,
  suggestedLeaseEnd,
  todayIso,
  toneForDays,
  type DealRecord,
  type LeasePayment,
  type LeaseRecord,
  type LeaseType,
  type MandateExclusivity,
  type MandateRecord,
  type MandateType,
  type WorkspaceModuleKey,
} from "./operationsDomain";
import type { ContactRecord, CrmData, PropertyRecord, RequestRecord } from "./kit";

/**
 * Migrazione dal modello piatto (immobili, contatti, richieste) agli oggetti
 * operativi. Gira una volta sola, e' idempotente e non cancella niente:
 * trasforma quello che c'era e segnala i casi dubbi in un report leggibile.
 */

export type MigrationReport = {
  offices: number;
  mandates: number;
  leases: number;
  deals: number;
  ownerContacts: number;
  notes: string[];
  /** Dettaglio leggibile nell'anteprima, prima di applicare la migrazione. */
  officeNames: string[];
  ownerContactNames: string[];
  mandateDetails: string[];
  leaseDetails: string[];
  dealDetails: string[];
  linkedProperties: string[];
};

/** Anteprima senza effetti: calcola il report di cosa verrebbe creato o collegato. */
export function previewOperationsMigration(data: CrmData, today = new Date()): MigrationReport {
  return migrateOperationsData(data, today).report;
}

export type OperationsMigration = {
  data: CrmData;
  report: MigrationReport;
  changed: boolean;
};

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function numeric(value?: string) {
  const parsed = Number.parseFloat(String(value || "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ownerNames(property: PropertyRecord) {
  return property.owner
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && !/proprietario da associare/i.test(name));
}

function findContactByName(contacts: ContactRecord[], name: string) {
  const needle = name.trim().toLowerCase();
  return contacts.find((contact) => contact.name.trim().toLowerCase() === needle);
}

/** Ricostruisce gli oggetti operativi dagli archivi esistenti. */
export function migrateOperationsData(data: CrmData, today = new Date()): OperationsMigration {
  if (data.operationsModel === 1) {
    return {
      data,
      report: {
        offices: data.offices?.length ?? 0,
        mandates: data.mandates?.length ?? 0,
        leases: data.leases?.length ?? 0,
        deals: data.deals?.length ?? 0,
        ownerContacts: 0,
        notes: [],
        officeNames: (data.offices ?? []).map((office) => office.name),
        ownerContactNames: [],
        mandateDetails: [],
        leaseDetails: [],
        dealDetails: [],
        linkedProperties: [],
      },
      changed: false,
    };
  }

  const notes: string[] = [];
  const offices = data.offices?.length ? data.offices : [defaultOffice()];
  const contacts: ContactRecord[] = [...data.contacts];
  const properties: PropertyRecord[] = [...data.properties];
  const mandates: MandateRecord[] = [];
  const leases: LeaseRecord[] = [];
  const deals: DealRecord[] = [];
  const ownerContactNames: string[] = [];
  const mandateDetails: string[] = [];
  const leaseDetails: string[] = [];
  const dealDetails: string[] = [];
  const linkedPropertyLabels: string[] = [];
  let ownerContacts = 0;

  // 1. Ogni proprietario citato su un immobile diventa una persona in rubrica,
  //    con un id stabile, cosi' la scheda persona mostra subito i suoi immobili.
  const propertyOwnerIds = new Map<string, string>();
  properties.forEach((property) => {
    const primaryOwnerId = property.ownerContactId;
    if (primaryOwnerId && contacts.some((contact) => contact.id === primaryOwnerId)) {
      propertyOwnerIds.set(property.id, primaryOwnerId);
      return;
    }
    const names = ownerNames(property);
    names.forEach((name, index) => {
      let contact = findContactByName(contacts, name);
      if (!contact) {
        contact = {
          id: `contact-owner-${slug(name) || `senza-nome-${contacts.length + 1}`}`,
          name,
          type: "Proprietario",
          status: "Da censire",
          source: "Migrazione immobili",
          owner: property.details?.assignedAgent || "",
          phone: index === 0 ? property.phone || "" : "",
          email: "",
          note: `Creato dalla migrazione dell'immobile ${property.code || property.title}.`,
          nextStep: "Primo contatto da programmare",
          updatedAt: todayIso(today),
        };
        contacts.push(contact);
        ownerContacts += 1;
        ownerContactNames.push(name);
      }
      if (index === 0) {
        propertyOwnerIds.set(property.id, contact.id);
        linkedPropertyLabels.push(propertyLabel(property));
      }
    });
    if (names.length === 0) {
      notes.push(`${propertyLabel(property)}: nessun proprietario indicato, resta da associare.`);
    }
  });

  const linkedProperties = properties.map((property) => {
    const ownerContactId = propertyOwnerIds.get(property.id) ?? property.ownerContactId;
    return ownerContactId ? { ...property, ownerContactId } : property;
  });

  // 2. Incarichi: da quelli scritti in chiaro sulla scheda immobile.
  linkedProperties.forEach((property) => {
    const details = (property.details ?? {}) as Record<string, string | undefined>;
    const hasMandateData =
      Boolean(details.mandateType || details.mandateEndDate || details.mandateStartDate) ||
      ["In gestione", "In trattativa", "Venduto", "Affittato"].includes(property.status);
    if (!hasMandateData) {
      return;
    }
    const type: MandateType = property.kind === "affitto" ? "Locazione" : "Vendita";
    const exclusivity = /esclusiva/i.test(details.mandateType || "") && !/non/i.test(details.mandateType || "")
      ? "Esclusiva"
      : (details.mandateType as MandateExclusivity) || "Non esclusiva";
    mandates.push({
      id: `mandate-${property.id}`,
      propertyId: property.id,
      ownerContactId: property.ownerContactId,
      type,
      exclusivity: ["Esclusiva", "Non esclusiva", "Collaborazione", "Segnalazione"].includes(exclusivity)
        ? exclusivity
        : "Non esclusiva",
      askingPrice: details.askingPrice || property.price || "",
      minimumPrice: details.minimumPrice || "",
      commission: details.commissionTerms || details.commission || "",
      startDate: details.mandateStartDate || details.acquisitionDate || todayIso(today),
      endDate: details.mandateEndDate || addMonths(todayIso(today), 6),
      status: property.status === "Venduto" || property.status === "Affittato" ? "Concluso" : "Attivo",
      officeId: property.officeId || defaultOfficeId,
      agent: details.assignedAgent || "",
      notes: "Ricostruito dalla scheda immobile.",
      updatedAt: todayIso(today),
    });
    mandateDetails.push(
      `${propertyLabel(property)} \u00b7 ${type} ${exclusivity.toLowerCase()} \u00b7 scade ${details.mandateEndDate || addMonths(todayIso(today), 6)}`,
    );
  });

  // 3. Locazioni: solo per immobili gia' affittati o con un contratto indicato.
  linkedProperties.forEach((property) => {
    const details = (property.details ?? {}) as Record<string, string | undefined>;
    const looksLeased =
      property.kind === "affitto" &&
      (property.status === "Affittato" || Boolean(details.tenantName || details.leaseStartDate));
    if (!looksLeased) {
      return;
    }
    const startDate = details.leaseStartDate || details.availabilityDate || todayIso(today);
    const contractType = (details.contractType as LeaseType) || "4+4 canone libero";
    const rent = details.monthlyRent || property.price || "";
    leases.push({
      id: `lease-${property.id}`,
      propertyId: property.id,
      tenantName: details.tenantName || "Inquilino da associare",
      contractType: ["4+4 canone libero", "3+2 canone concordato", "Transitorio", "Studenti"].includes(contractType)
        ? contractType
        : "4+4 canone libero",
      rent,
      deposit: details.deposit || "",
      startDate,
      endDate: details.leaseEndDate || suggestedLeaseEnd(startDate, contractType),
      registrationDate: details.registrationDate || "",
      taxRegime: /ordinario/i.test(details.taxRegime || "") ? "Ordinario" : "Cedolare secca",
      istatAdjustment: /no/i.test(details.istatAdjustment || "") ? "No" : "Si",
      status: property.status === "Affittato" ? "Attivo" : "Chiuso",
      payments: [],
      agent: details.assignedAgent || "",
      officeId: property.officeId || defaultOfficeId,
      notes: "Ricostruito dalla scheda immobile.",
      updatedAt: todayIso(today),
    });
    leaseDetails.push(
      `${propertyLabel(property)} \u00b7 ${details.tenantName || "inquilino da associare"} \u00b7 ${contractType}`,
    );
  });

  // 4. Trattative: le richieste gia' in stato Trattativa diventano proposte aperte.
  data.requests
    .filter((request: RequestRecord) => /trattativ/i.test(request.status))
    .forEach((request) => {
      const property =
        linkedProperties.find((item) => item.title === request.proposal) ??
        linkedProperties.find((item) => request.proposal && item.title.includes(request.proposal));
      if (!property) {
        notes.push(`Richiesta di ${request.client}: immobile «${request.proposal}» non trovato, trattativa non creata.`);
        return;
      }
      const client = data.contacts.find(
        (contact) => contact.name.trim().toLowerCase() === request.client.trim().toLowerCase(),
      );
      deals.push({
        id: `deal-${request.id}`,
        propertyId: property.id,
        clientName: request.client,
        clientContactId: client?.id,
        type: property.kind === "affitto" ? "Affitto" : "Vendita",
        stage: "Proposta",
        offerAmount: "",
        deposit: "",
        proposalDate: todayIso(today),
        expiryDate: addDays(todayIso(today), 15),
        closingDate: "",
        commission: "",
        agent: client?.owner || "",
        officeId: property.officeId || defaultOfficeId,
        notes: `Ricostruita dalla richiesta ${request.target}.`,
        stageChangedAt: new Date().toISOString(),
        updatedAt: todayIso(today),
      });
      dealDetails.push(`${request.client} \u00b7 ${propertyLabel(property)}`);
    });

  if (!mandates.length && linkedProperties.length) {
    notes.push("Nessun incarico ricostruito: le schede non hanno dati di mandato. Li trovi in Acquisizione.");
  }

  return {
    data: {
      ...data,
      offices,
      mandates,
      deals,
      leases,
      contacts,
      properties: linkedProperties,
      operationsModel: 1,
    },
    report: {
      offices: offices.length,
      mandates: mandates.length,
      leases: leases.length,
      deals: deals.length,
      ownerContacts,
      notes,
      officeNames: offices.map((office) => office.name),
      ownerContactNames,
      mandateDetails,
      leaseDetails,
      dealDetails,
      linkedProperties: linkedPropertyLabels,
    },
    changed: true,
  };
}

/* ------------------------------------------------------------------ */
/* Prossimi passi                                                      */
/* ------------------------------------------------------------------ */

export type NextActionKind =
  | "Incarico"
  | "Locazione"
  | "Affitto"
  | "Trattativa"
  | "Richiesta"
  | "Contatto"
  | "Censimento"
  | "Immobile"
  | "Sede";

export type NextAction = {
  id: string;
  kind: NextActionKind;
  title: string;
  detail: string;
  when: string;
  priority: number;
  moduleKey: WorkspaceModuleKey;
  pageKey: string;
  query?: string;
  contactId?: string;
};

function priorityForDays(days: number | null) {
  if (days === null) {
    return 4;
  }
  if (days < 0) {
    return 1;
  }
  if (days <= 7) {
    return 2;
  }
  if (days <= 30) {
    return 3;
  }
  return 4;
}

function whenLabel(days: number | null) {
  if (days === null) {
    return "";
  }
  if (days < 0) {
    return `scaduto da ${Math.abs(days)} gg`;
  }
  if (days === 0) {
    return "oggi";
  }
  return `fra ${days} gg`;
}

/**
 * La coda di lavoro del gestionale: scadenze vere, ordinate per urgenza.
 * Non salva niente, cosi' non puo' restare disallineata rispetto ai dati.
 */
export function buildNextActions(data: CrmData, today = new Date()): NextAction[] {
  const actions: NextAction[] = [];
  const properties = new Map(data.properties.map((property) => [property.id, property]));

  data.mandates.forEach((mandate) => {
    const state = mandateState(mandate, today);
    if (mandate.status !== "Attivo" || state.days === null || state.days > 90) {
      return;
    }
    const property = properties.get(mandate.propertyId);
    actions.push({
      id: `mandate-${mandate.id}`,
      kind: "Incarico",
      title: state.days < 0 ? "Incarico scaduto: rinnova o chiudi" : "Incarico in scadenza",
      detail: `${propertyLabel(property)} · ${mandate.type}`,
      when: whenLabel(state.days),
      priority: priorityForDays(state.days),
      moduleKey: "acquisizione",
      pageKey: "acquisizione-incarichi",
      query: property?.code,
    });
  });

  data.leases.forEach((lease) => {
    if (lease.status !== "Attivo") {
      return;
    }
    const property = properties.get(lease.propertyId);
    leaseDeadlines(lease, today).forEach((deadline) => {
      if (deadline.days > 60) {
        return;
      }
      actions.push({
        id: `lease-${lease.id}-${deadline.key}`,
        kind: "Locazione",
        title: deadline.label,
        detail: `${propertyLabel(property)} · ${lease.tenantName}`,
        when: whenLabel(deadline.days),
        priority: priorityForDays(deadline.days),
        moduleKey: "locazioni",
        pageKey: "locazioni-elenco",
        query: property?.code,
      });
    });
    lease.payments
      .filter((payment) => payment.status !== "Incassato")
      .forEach((payment) => {
        const days = daysUntil(payment.dueDate, today);
        if (days === null || days > 7) {
          return;
        }
        actions.push({
          id: `rent-${lease.id}-${payment.id}`,
          kind: "Affitto",
          title: payment.status === "Sollecito" ? "Canone sollecitato" : "Canone da incassare",
          detail: `${propertyLabel(property)} · ${lease.tenantName}`,
          when: whenLabel(days),
          priority: days < 0 ? 1 : 2,
          moduleKey: "locazioni",
          pageKey: "locazioni-incassi",
          query: property?.code,
        });
      });
  });

  data.deals.forEach((deal) => {
    if (deal.stage === "Chiusa" || deal.stage === "Persa") {
      return;
    }
    const days = daysUntil(deal.expiryDate, today);
    if (days === null || days > 7) {
      return;
    }
    const property = properties.get(deal.propertyId);
    actions.push({
      id: `deal-${deal.id}`,
      kind: "Trattativa",
      title: days < 0 ? "Proposta scaduta: esito da registrare" : "Proposta in scadenza",
      detail: `${propertyLabel(property)} · ${deal.clientName}`,
      when: whenLabel(days),
      priority: days < 0 ? 1 : 2,
      moduleKey: "trattative",
      pageKey: "trattative-elenco",
      query: deal.clientName,
    });
  });

  data.requests
    .filter((request) => !/chiusa|persa/i.test(request.status))
    .forEach((request) => {
      const changed = request.stageChangedAt ? daysUntil(request.stageChangedAt.slice(0, 10), today) : null;
      const staleDays = changed === null ? null : Math.abs(changed);
      if (staleDays === null || staleDays < 14) {
        return;
      }
      actions.push({
        id: `request-${request.id}`,
        kind: "Richiesta",
        title: `Ferma da ${staleDays} giorni in «${request.status}»`,
        detail: `${request.client} · ${request.target}`,
        when: "",
        priority: 3,
        moduleKey: "richieste",
        pageKey: "richieste-elenco",
        query: request.client,
      });
    });

  data.contacts.forEach((contact) => {
    const details = (contact.details ?? {}) as Record<string, string | undefined>;
    const next = details.nextContactDate;
    if (!next) {
      return;
    }
    const days = daysUntil(next, today);
    if (days === null || days > 0) {
      return;
    }
    // Il motivo del ricontatto decide dove finisce l'azione: un censimento
    // resta censimento, un ricontatto commerciale e' un contatto. Senza
    // motivo, l'essere proprietario basta a tenerlo nella coda di censimento.
    const reason = String(details.nextContactReason || "").trim();
    const isOwner = /proprietar/i.test(`${contact.type} ${contact.status}`);
    const isCensus = /censiment|acquisiz|valutaz|proprietar/i.test(reason);
    const kind: NextActionKind = isCensus
      ? "Censimento"
      : reason
        ? "Contatto"
        : isOwner
          ? "Censimento"
          : "Contatto";

    actions.push({
      id: `contact-${contact.id}`,
      kind,
      title: "Ricontatto in scadenza",
      detail: `${contact.name} · ${details.nextContactReason || contact.nextStep || contact.status}`,
      when: whenLabel(days),
      priority: 1,
      moduleKey: "nominativi",
      pageKey: "nominativi-elenco",
      query: contact.name,
      contactId: contact.id,
    });
  });

  const withoutMandate = data.properties.filter(
    (property) =>
      !/bozza|archiviat/i.test(property.status) &&
      !data.mandates.some((mandate) => mandate.propertyId === property.id && mandate.status === "Attivo"),
  );
  if (withoutMandate.length) {
    actions.push({
      id: "properties-without-mandate",
      kind: "Immobile",
      title: `${withoutMandate.length} immobili senza incarico attivo`,
      detail: "Senza mandato non si puo' vendere: regolarizza l'acquisizione.",
      when: "",
      priority: 3,
      moduleKey: "acquisizione",
      pageKey: "acquisizione-incarichi",
    });
  }

  return actions
    .sort((first, second) => first.priority - second.priority)
    .slice(0, 12);
}

/** Etichetta compatta dello stato di un pagamento. */
export function paymentTone(payment: LeasePayment, today = new Date()) {
  if (payment.status === "Incassato") {
    return { label: "Incassato", tone: "ok" as const };
  }
  const days = daysUntil(payment.dueDate, today) ?? 0;
  if (payment.status === "Sollecito") {
    return { label: "Sollecito inviato", tone: "scaduto" as const };
  }
  return days < 0
    ? { label: `Scaduto da ${Math.abs(days)} gg`, tone: "scaduto" as const }
    : { label: `Entro ${formatDateIt(payment.dueDate)}`, tone: toneForDays(days) };
}
