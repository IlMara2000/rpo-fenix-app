/**
 * Oggetti operativi del gestionale: sedi, incarichi, trattative e locazioni.
 *
 * Sono separati dagli archivi (persone, immobili, richieste) perche' ognuno ha
 * un ciclo di vita e scadenze proprie: l'incarico scade, la proposta ha un
 * termine, il contratto di locazione ha registrazione, disdetta e rinnovo.
 * Le viste e il motore dei prossimi passi leggono solo da qui.
 */

export type WorkspaceModuleKey =
  | "start"
  | "agenda"
  | "censimento"
  | "acquisizione"
  | "nominativi"
  | "proprietari"
  | "immobili"
  | "richieste"
  | "trattative"
  | "locazioni"
  | "pubblicita"
  | "contattiPubblicita"
  | "attivita"
  | "obiettivi"
  | "utilita"
  | "impostazioni";

export type OfficeRecord = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  manager: string;
  color: string;
  active: "Si" | "No";
  updatedAt: string;
};

export const defaultOfficeId = "office-sede-principale";

export function defaultOffice(): OfficeRecord {
  return {
    id: defaultOfficeId,
    name: "Sede principale",
    city: "",
    address: "",
    phone: "",
    manager: "",
    color: "#ff675d",
    active: "Si",
    updatedAt: "Sede iniziale",
  };
}

export type MandateType = "Vendita" | "Locazione";
export type MandateExclusivity = "Esclusiva" | "Non esclusiva" | "Collaborazione" | "Segnalazione";
export type MandateStatus = "Attivo" | "Revocato" | "Concluso";

export type MandateRecord = {
  id: string;
  propertyId: string;
  ownerContactId?: string;
  type: MandateType;
  exclusivity: MandateExclusivity;
  askingPrice: string;
  minimumPrice: string;
  commission: string;
  startDate: string;
  endDate: string;
  status: MandateStatus;
  officeId: string;
  agent: string;
  notes: string;
  updatedAt: string;
};

export const mandateExclusivityOptions: MandateExclusivity[] = [
  "Esclusiva",
  "Non esclusiva",
  "Collaborazione",
  "Segnalazione",
];

export type DealStage =
  | "Proposta"
  | "Controproposta"
  | "Accettata"
  | "Compromesso"
  | "Rogito"
  | "Chiusa"
  | "Persa";

export const dealStageOrder: DealStage[] = [
  "Proposta",
  "Controproposta",
  "Accettata",
  "Compromesso",
  "Rogito",
  "Chiusa",
];

export type DealRecord = {
  id: string;
  propertyId: string;
  clientName: string;
  clientContactId?: string;
  type: "Vendita" | "Affitto";
  stage: DealStage;
  offerAmount: string;
  deposit: string;
  proposalDate: string;
  expiryDate: string;
  closingDate: string;
  commission: string;
  agent: string;
  officeId: string;
  notes: string;
  stageChangedAt: string;
  updatedAt: string;
};

export type LeaseType =
  | "4+4 canone libero"
  | "3+2 canone concordato"
  | "Transitorio"
  | "Studenti";

export const leaseTypeOptions: LeaseType[] = [
  "4+4 canone libero",
  "3+2 canone concordato",
  "Transitorio",
  "Studenti",
];

export type LeasePaymentStatus = "Da incassare" | "Incassato" | "Sollecito";

export type LeasePayment = {
  id: string;
  dueDate: string;
  amount: string;
  paidAt?: string;
  status: LeasePaymentStatus;
};

export type LeaseRecord = {
  id: string;
  propertyId: string;
  tenantName: string;
  tenantContactId?: string;
  contractType: LeaseType;
  rent: string;
  deposit: string;
  startDate: string;
  endDate: string;
  registrationDate: string;
  taxRegime: "Cedolare secca" | "Ordinario";
  istatAdjustment: "Si" | "No";
  status: "Attivo" | "Chiuso";
  payments: LeasePayment[];
  agent: string;
  officeId: string;
  notes: string;
  updatedAt: string;
};

/* ------------------------------------------------------------------ */
/* Date e importi                                                      */
/* ------------------------------------------------------------------ */

/** Legge una data ISO (`2026-11-24`) come mezzanotte locale, senza fusi orari. */
export function parseIsoDate(value?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || "").trim());
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(date = new Date()) {
  return toIsoDate(date);
}

export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value) ?? new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function addMonths(value: string, months: number): string {
  const date = parseIsoDate(value) ?? new Date();
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  // 31 gennaio + 1 mese non deve diventare 3 marzo.
  if (date.getDate() < day) {
    date.setDate(0);
  }
  return toIsoDate(date);
}

export function daysUntil(value: string | undefined, from = new Date()): number | null {
  const target = parseIsoDate(value);
  if (!target) {
    return null;
  }
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function formatDateIt(value?: string): string {
  const date = parseIsoDate(value);
  return date ? new Intl.DateTimeFormat("it-IT", { dateStyle: "short" }).format(date) : "-";
}

export function propertyLabel(property: { code?: string; title: string } | undefined) {
  if (!property) {
    return "Immobile non trovato";
  }
  return property.code ? `${property.code} · ${property.title}` : property.title;
}

/* ------------------------------------------------------------------ */
/* Stati e scadenze                                                    */
/* ------------------------------------------------------------------ */

export type DeadlineTone = "scaduto" | "urgente" | "vicino" | "ok";

export function toneForDays(days: number): DeadlineTone {
  if (days < 0) {
    return "scaduto";
  }
  if (days <= 7) {
    return "urgente";
  }
  if (days <= 30) {
    return "vicino";
  }
  return "ok";
}

export function mandateState(mandate: MandateRecord, today = new Date()) {
  if (mandate.status !== "Attivo") {
    return { label: mandate.status, tone: "ok" as DeadlineTone, days: null };
  }
  const days = daysUntil(mandate.endDate, today);
  if (days === null) {
    return { label: "Senza scadenza", tone: "vicino" as DeadlineTone, days };
  }
  const tone = toneForDays(days);
  const label =
    tone === "scaduto"
      ? `Scaduto da ${Math.abs(days)} gg`
      : tone === "urgente"
        ? `Scade fra ${days} gg`
        : `Attivo · ${formatDateIt(mandate.endDate)}`;
  return { label, tone, days };
}

export type LeaseDeadline = {
  key: string;
  label: string;
  date: string;
  days: number;
};

/** Le scadenze che contano davvero in una locazione abitativa. */
export function leaseDeadlines(lease: LeaseRecord, from = new Date()): LeaseDeadline[] {
  const deadlines: LeaseDeadline[] = [];
  const push = (key: string, label: string, date: string) => {
    const days = daysUntil(date, from);
    if (days === null) {
      return;
    }
    deadlines.push({ key, label, date, days });
  };

  if (!lease.registrationDate && lease.startDate) {
    push("registrazione", "Registrazione contratto", addDays(lease.startDate, 30));
  }
  if (lease.endDate) {
    push("disdetta", "Termine preavviso disdetta", addDays(lease.endDate, -180));
    push("fine", "Fine contratto", lease.endDate);
  }
  return deadlines.sort((first, second) => first.days - second.days);
}

const leaseMonths: Record<LeaseType, number> = {
  "4+4 canone libero": 48,
  "3+2 canone concordato": 36,
  "Transitorio": 12,
  "Studenti": 12,
};

export function suggestedLeaseEnd(startDate: string, type: LeaseType): string {
  return addMonths(startDate, leaseMonths[type] ?? 48);
}

export function nextDealStage(stage: DealStage): DealStage | null {
  const index = dealStageOrder.indexOf(stage);
  if (index < 0 || index >= dealStageOrder.length - 1) {
    return null;
  }
  return dealStageOrder[index + 1];
}
