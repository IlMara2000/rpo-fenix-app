import { useMemo } from "react";
import type {
  ActivityDetails,
  CensusContactDetails,
  ContactDetails,
  PropertyDetails,
  RequestDetails,
} from "./domain";
import type {
  DealRecord,
  LeaseRecord,
  MandateRecord,
  OfficeRecord,
} from "./operationsDomain";

/**
 * Tipi, costanti e funzioni condivisi dai moduli del gestionale.
 * Estratti da main.tsx per lasciare il Censimento in file propri: nessun
 * cambiamento di comportamento, solo lo spostamento delle definizioni.
 */

export type QuickFormField =
  | string
  | {
      name: string;
      options?: string[];
      required?: boolean;
      placeholder?: string;
    };

export type PropertyRecord = {
  id: string;
  code: string;
  title: string;
  zone: string;
  status: string;
  price: string;
  owner: string;
  portals: string;
  kind: "vendita" | "affitto";
  phone?: string;
  taxCode?: string;
  sheet?: string;
  parcel?: string;
  subaltern?: string;
  cadastralCategory?: string;
  rooms?: string;
  source?: string;
  /** Posizione sulla mappa: unica, condivisa da mappa, elenco e schede. */
  lat?: number;
  lng?: number;
  /** Sede operativa e scheda persona del proprietario (legame per id). */
  officeId?: string;
  ownerContactId?: string;
  details?: PropertyDetails;
  updatedAt: string;
};

export type RequestRecord = {
  id: string;
  client: string;
  target: string;
  area: string;
  match: string;
  proposal: string;
  status: string;
  details?: RequestDetails;
  /** Quando la richiesta e' entrata nella fase attuale: serve per i giorni in fase. */
  stageChangedAt?: string;
  updatedAt: string;
};

export type ContactRecord = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  type: string;
  status: string;
  source: string;
  owner: string;
  phone: string;
  email?: string;
  taxCode?: string;
  sheet?: string;
  parcel?: string;
  subaltern?: string;
  cadastralCategory?: string;
  rooms?: string;
  property?: string;
  note: string;
  nextStep: string;
  details?: ContactDetails | CensusContactDetails;
  updatedAt: string;
};

export type ActivityRecord = {
  id: string;
  time: string;
  title: string;
  type: string;
  owner: string;
  contact: string;
  property: string;
  status: string;
  note: string;
  day: "Oggi" | "Domani" | "Settimana" | "Passate" | "Future";
  details?: ActivityDetails;
  updatedAt: string;
};

export type MarketingChannelRecord = {
  id: string;
  name: string;
  status: string;
  progress: number;
  updatedAt: string;
};

export type CensusAreaRecord = {
  id: string;
  zone: string;
  buildings: number;
  contacts: number;
  updatedAt: string;
};

export type CensusStreetRecord = {
  id: string;
  zone: string;
  street: string;
  complexes: number;
  updatedAt: string;
};

export type CensusComplexRecord = {
  id: string;
  zone: string;
  street: string;
  name: string;
  units: number;
  owners: number;
  updatedAt: string;
};

export type GoalRecord = {
  id: string;
  label: string;
  current: number;
  target: number;
  owner: string;
  updatedAt: string;
};

export type CrmData = {
  properties: PropertyRecord[];
  requests: RequestRecord[];
  contacts: ContactRecord[];
  activities: ActivityRecord[];
  marketingChannels: MarketingChannelRecord[];
  censusAreas: CensusAreaRecord[];
  censusStreets: CensusStreetRecord[];
  censusComplexes: CensusComplexRecord[];
  goals: GoalRecord[];
  activityLog: string[];
  offices: OfficeRecord[];
  mandates: MandateRecord[];
  deals: DealRecord[];
  leases: LeaseRecord[];
  /** 1 = migrazione al modello operativo gia' eseguita. */
  operationsModel?: number;
};

export type CrmCommit = (updater: (data: CrmData) => CrmData, message: string) => void;

export const cadastralCategoryOptions = [
  "",
  "A/1",
  "A/2",
  "A/3",
  "A/4",
  "A/5",
  "A/6",
  "A/7",
  "A/8",
  "A/9",
  "A/10",
  "A/11",
  "B/1",
  "B/2",
  "B/3",
  "B/4",
  "B/5",
  "B/6",
  "B/7",
  "B/8",
  "C/1",
  "C/2",
  "C/3",
  "C/4",
  "C/5",
  "C/6",
  "C/7",
  "D/1",
  "D/2",
  "D/3",
  "D/4",
  "D/5",
  "D/6",
  "D/7",
  "D/8",
  "D/9",
  "D/10",
  "E/1",
  "E/2",
  "E/3",
  "E/4",
  "E/5",
  "E/6",
  "E/7",
  "E/8",
  "E/9",
  "F/1",
  "F/2",
  "F/3",
  "F/4",
  "F/5",
  "F/6",
  "F/7",
];

export const roomOptions = ["", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "7", "8", "9", "10+"];

export const searchFilterFields: QuickFormField[] = [
  "Nome",
  "Cognome",
  "Numero",
  "Codice fiscale",
  "Foglio",
  "Particella",
  "Subalterno",
  {
    name: "Categoria catastale",
    options: cadastralCategoryOptions,
  },
  {
    name: "Vani",
    options: roomOptions,
  },
];

export const crmStorageKey = "fenix-suite-crm-data-v2";

export function propertyOwnerNames(property: PropertyRecord) {
  return property.owner
    .split(",")
    .map((owner) => owner.trim())
    .filter(Boolean);
}

export function nowLabel() {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

export function currentTimeLabel() {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function fieldValue(values: Record<string, string>, field: string, fallback = "") {
  return String(values[field] || "").trim() || fallback;
}

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function activeFilters(filters: Record<string, string>) {
  return Object.entries(filters).filter(([, value]) => normalizeSearchValue(value));
}

export function matchesStructuredFilters(filters: Record<string, string>, fields: Record<string, string>) {
  const selectedFilters = activeFilters(filters);

  if (!selectedFilters.length) {
    return true;
  }

  return selectedFilters.every(([key, value]) => {
    const filterValue = normalizeSearchValue(value);
    const fieldValue = normalizeSearchValue(fields[key] || "");
    if (key === "Categoria catastale" || key === "Vani") {
      return fieldValue === filterValue;
    }
    return fieldValue.includes(filterValue);
  });
}

export function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

export function formatFullName(firstName: string, lastName: string, fallback = "Nuovo cliente") {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

export function valuesSummary(values: Record<string, string>, fallback = "tutti i dati") {
  return Object.values(values).filter(Boolean).join(" / ") || fallback;
}

export function sameLabel(first: string, second: string) {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

export function appendOwnerLabel(currentOwner: string, ownerName: string) {
  const owners = currentOwner
    .split(",")
    .map((owner) => owner.trim())
    .filter((owner) => owner && !/proprietario da associare/i.test(owner));

  if (!owners.some((owner) => sameLabel(owner, ownerName))) {
    owners.push(ownerName);
  }

  return owners.join(", ");
}

export function removeOwnerLabel(currentOwner: string, ownerName: string) {
  const owners = currentOwner
    .split(",")
    .map((owner) => owner.trim())
    .filter(
      (owner) =>
        owner &&
        !sameLabel(owner, ownerName) &&
        !/proprietario da associare/i.test(owner),
    );

  return owners.join(", ") || "Proprietario da associare";
}

export function cadastralLabel(record: {
  sheet?: string;
  parcel?: string;
  subaltern?: string;
  cadastralCategory?: string;
  rooms?: string;
}) {
  const cadastralParts = [
    record.sheet ? `F.${record.sheet}` : "",
    record.parcel ? `P.${record.parcel}` : "",
    record.subaltern ? `Sub.${record.subaltern}` : "",
  ].filter(Boolean);
  const registryParts = [record.cadastralCategory, record.rooms ? `${record.rooms} vani` : ""].filter(Boolean);
  return [...cadastralParts, ...registryParts].join(" / ") || "-";
}

export function createActivity(input: Partial<ActivityRecord> & Pick<ActivityRecord, "title" | "type">): ActivityRecord {
  const updatedAt = nowLabel();
  return {
    id: makeId("activity"),
    time: input.time || currentTimeLabel(),
    title: input.title,
    type: input.type,
    owner: input.owner || "Daniele",
    contact: input.contact || "",
    property: input.property || "",
    status: input.status || "Aperta",
    note: input.note || "",
    day: input.day || "Oggi",
    details: input.details,
    updatedAt,
  };
}

export function useFilteredRows<T>(
  items: T[],
  query: string,
  projector: (item: T) => string,
) {
  return useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }
    return items.filter((item) => projector(item).toLowerCase().includes(normalized));
  }, [items, projector, query]);
}
