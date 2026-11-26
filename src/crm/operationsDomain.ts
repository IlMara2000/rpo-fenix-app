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
  /** Richiesta del cliente da cui nasce la proposta: alla chiusura si chiude anche lei. */
  requestId?: string;
  clientName: string;
  clientContactId?: string;
  type: "Vendita" | "Affitto";
  stage: DealStage;
  offerAmount: string;
  deposit: string;
  proposalDate: string;
  expiryDate: string;
  closingDate: string;
  closingPrice?: string;
  /** Provvigione dovuta o incassata, in euro: e' il valore sommabile. */
  commissionEarned?: string;
  /** Data in cui il cliente ha pagato la provvigione: se c'e', e' incassata. */
  commissionPaidAt?: string;
  /** Provvigione concordata in euro, accanto alla percentuale scritta in `commission`. */
  commissionAmount?: string;
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

/** Etichetta del select immobile: base + indirizzo e citta' per distinguere omonimi. */
export function propertyOptionLabel(property: any) {
  const base = propertyLabel(property);
  if (!property) {
    return base;
  }
  const details = (property.details ?? {}) as Record<string, string | undefined>;
  const city = details.municipality || property.zone;
  const street = details.street
    ? `${details.street}${details.streetNumber ? ` ${details.streetNumber}` : ""}`
    : "";
  const streetPart = street && street.trim().toLowerCase() !== String(property.title || "").trim().toLowerCase()
    ? street
    : "";
  const parts = [streetPart, city].filter(Boolean);
  if (!parts.length) {
    return base;
  }
  return `${base} — ${parts.join(", ")}`;
}

/** Etichetta del select sede: nome + indirizzo e citta'. */
export function officeOptionLabel(office: { name: string; address?: string; city?: string } | undefined) {
  if (!office) {
    return "Sede";
  }
  const parts = [office.address, office.city].filter(Boolean);
  return parts.length ? `${office.name} — ${parts.join(", ")}` : office.name;
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

/**
 * Legge un importo scritto a mano: "250.000" e "1.250,50" all'italiana,
 * "1,250.50" all'inglese. Un separatore seguito da una o due cifre e'
 * decimale, altrimenti tutti i separatori sono migliaia (250.000 = 250000).
 */
function parseAmount(value: string): number {
  const digits = String(value || "").replace(/[^\d.,]/g, "");
  if (!/\d/.test(digits)) {
    return NaN;
  }
  const trailing = /[.,](\d+)$/.exec(digits);
  const normalized =
    trailing && trailing[1].length <= 2
      ? `${digits.slice(0, -trailing[1].length - 1).replace(/[.,]/g, "")}.${trailing[1]}`
      : digits.replace(/[.,]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

/**
 * Provvigione in euro da una percentuale concordata ("3% + IVA") e da una
 * base: serve a rendere sommabile anche chi scrive solo la percentuale.
 */
export function commissionInEuro(commission: string, base: string): string {
  const percent = /(\d+(?:[.,]\d+)?)\s*%/.exec(commission || "");
  const amount = parseAmount(base);
  if (!percent || !(amount > 0)) {
    return "";
  }
  const rate = Number(percent[1].replace(",", "."));
  return String(Math.round((amount * rate) / 100));
}

/**
 * Valori da fissare alla chiusura, salvo quelli gia' impostati: il prezzo
 * finale e' l'offerta accettata, la provvigione dovuta quella concordata.
 */
export function dealClosingValues(deal: DealRecord, today: string) {
  const closingPrice = deal.closingPrice || deal.offerAmount;
  return {
    closingDate: deal.closingDate || today,
    closingPrice,
    commissionEarned:
      deal.commissionEarned || deal.commissionAmount || commissionInEuro(deal.commission, closingPrice),
  };
}

/** Stato della provvigione derivato dalla data di incasso: dovuta o incassata. */
export function commissionLabel(deal: DealRecord): string {
  if (!deal.commissionEarned) {
    return "-";
  }
  return deal.commissionPaidAt
    ? `${deal.commissionEarned} € · incassata il ${formatDateIt(deal.commissionPaidAt)}`
    : `${deal.commissionEarned} € · dovuta`;
}

/**
 * Importo in euro all'italiana. Non usa Intl per il raggruppamento: in
 * alcune build di Node restituisce "7500" senza punto delle migliaia.
 */
export function formatEuro(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const [integer, decimals] = String(Math.abs(rounded)).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${rounded < 0 ? "-" : ""}${grouped}${decimals ? `,${decimals}` : ""} €`;
}

const monthLabels = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

/** Riga del riepilogo economico: un mese di chiusura o una sede. */
export type DealEconomicsRow = {
  key: string;
  label: string;
  deals: number;
  finalPrices: number;
  due: number;
  collected: number;
};

export type DealEconomics = {
  rows: DealEconomicsRow[];
  totals: DealEconomicsRow;
  /** Trattative chiuse senza un importo di provvigione leggibile. */
  withoutCommission: number;
};

export type DealEconomicsGroupBy = "periodo" | "sede";

function amountOrZero(value?: string): number {
  const amount = parseAmount(value || "");
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function dealPeriod(closingDate?: string) {
  const match = /^(\d{4})-(\d{2})/.exec(String(closingDate || ""));
  if (!match) {
    return { key: "", label: "Senza data di chiusura" };
  }
  const month = monthLabels[Number(match[2]) - 1];
  return { key: `${match[1]}-${match[2]}`, label: `${month ?? match[2]} ${match[1]}` };
}

/**
 * Riepilogo economico delle sole trattative chiuse: prezzi finali,
 * provvigioni dovute e incassate, per mese di chiusura o per sede. Gli
 * importi passano da `parseAmount`, cosi' "250.000" non vale 250.
 */
export function dealEconomics(
  deals: DealRecord[],
  offices: Pick<OfficeRecord, "id" | "name">[] = [],
  groupBy: DealEconomicsGroupBy = "periodo",
): DealEconomics {
  const rows = new Map<string, DealEconomicsRow>();
  const totals: DealEconomicsRow = { key: "totale", label: "Totale", deals: 0, finalPrices: 0, due: 0, collected: 0 };
  const officeOrder = new Map(offices.map((office, index) => [office.id, index]));
  let withoutCommission = 0;

  deals
    .filter((deal) => deal.stage === "Chiusa")
    .forEach((deal) => {
      const index = officeOrder.get(deal.officeId);
      const group =
        groupBy === "sede"
          ? index === undefined
            ? { key: "", label: "Sede non assegnata" }
            : { key: deal.officeId, label: offices[index].name }
          : dealPeriod(deal.closingDate);

      const row =
        rows.get(group.key) ?? { key: group.key, label: group.label, deals: 0, finalPrices: 0, due: 0, collected: 0 };
      const due = amountOrZero(deal.commissionEarned);
      const collected = deal.commissionPaidAt ? due : 0;
      const finalPrice = amountOrZero(deal.closingPrice || deal.offerAmount);
      if (!due) {
        withoutCommission += 1;
      }
      [row, totals].forEach((target) => {
        target.deals += 1;
        target.finalPrices += finalPrice;
        target.due += due;
        target.collected += collected;
      });
      rows.set(group.key, row);
    });

  // Array.from e non spread: i test transpilano il dominio con il target
  // predefinito, dove lo spread di un Map diventa una lista vuota.
  const sorted = Array.from(rows.values()).sort((first, second) => {
    if (groupBy === "sede") {
      const firstIndex = officeOrder.get(first.key);
      const secondIndex = officeOrder.get(second.key);
      if (firstIndex === undefined || secondIndex === undefined) {
        return firstIndex === undefined ? 1 : secondIndex === undefined ? -1 : 0;
      }
      return firstIndex - secondIndex;
    }
    // Il mese piu' recente in alto; le chiusure senza data in fondo.
    if (!first.key || !second.key) {
      return first.key ? -1 : second.key ? 1 : 0;
    }
    return second.key.localeCompare(first.key);
  });

  return { rows: sorted, totals, withoutCommission };
}

export function nextDealStage(stage: DealStage): DealStage | null {
  const index = dealStageOrder.indexOf(stage);
  if (index < 0 || index >= dealStageOrder.length - 1) {
    return null;
  }
  return dealStageOrder[index + 1];
}

/** La tabella trattative mostra un blocco alla volta: le aperte di default. */
export type DealFilter = "Aperte" | "Chiuse" | "Perse";

export function matchesDealFilter(deal: { stage: DealStage }, filter: DealFilter) {
  if (filter === "Chiuse") {
    return deal.stage === "Chiusa";
  }
  if (filter === "Perse") {
    return deal.stage === "Persa";
  }
  return deal.stage !== "Chiusa" && deal.stage !== "Persa";
}

/**
 * Registrare il contratto fissa la data: da li' in poi la scadenza dei 30
 * giorni non ha piu' senso e sparisce dalla coda dei prossimi passi.
 */
export function markLeaseRegistered(lease: LeaseRecord, today: string): LeaseRecord {
  return { ...lease, registrationDate: lease.registrationDate || today };
}
