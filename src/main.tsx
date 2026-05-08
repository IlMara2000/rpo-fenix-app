import { StrictMode, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Blocks,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Cloud,
  DatabaseBackup,
  FileBadge,
  Filter,
  GalleryVerticalEnd,
  Gauge,
  Globe2,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  Mail,
  MapPinned,
  MessageSquareText,
  MousePointerClick,
  PanelsTopLeft,
  PhoneCall,
  Plus,
  RefreshCcwDot,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import "./styles.css";
import { PlanimetrieTool } from "./PlanimetrieTool";
import { RpoTool } from "./RpoTool";

declare global {
  interface Window {
    __fenixSuiteRoot?: Root;
  }
}

type Feature = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

type Screen = "marketing" | "login" | "workspace";
type ModuleKey =
  | "start"
  | "immobili"
  | "richieste"
  | "nominativi"
  | "agenda"
  | "pubblicita"
  | "contattiPubblicita"
  | "censimento"
  | "obiettivi"
  | "utilita"
  | "impostazioni";

type ModulePage = {
  key: string;
  label: string;
  description: string;
  Icon: LucideIcon;
};

type ModuleItem = {
  key: ModuleKey;
  label: string;
  description: string;
  Icon: LucideIcon;
};

type QuickFormField =
  | string
  | {
      name: string;
      options: string[];
    };

type ProgramCard = {
  title: string;
  description: string;
  path: string;
  Icon: LucideIcon;
  hiddenInSelector?: boolean;
};

type PropertyRecord = {
  id: string;
  code: string;
  title: string;
  zone: string;
  status: string;
  price: string;
  owner: string;
  portals: string;
  kind: "vendita" | "affitto";
  updatedAt: string;
};

type RequestRecord = {
  id: string;
  client: string;
  target: string;
  area: string;
  match: string;
  proposal: string;
  status: string;
  updatedAt: string;
};

type ContactRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  source: string;
  owner: string;
  phone: string;
  note: string;
  nextStep: string;
  updatedAt: string;
};

type ActivityRecord = {
  id: string;
  time: string;
  title: string;
  type: string;
  owner: string;
  contact: string;
  property: string;
  status: string;
  note: string;
  day: "Oggi" | "Domani" | "Settimana";
  updatedAt: string;
};

type MarketingChannelRecord = {
  id: string;
  name: string;
  status: string;
  progress: number;
  updatedAt: string;
};

type CensusAreaRecord = {
  id: string;
  zone: string;
  buildings: number;
  contacts: number;
  updatedAt: string;
};

type CensusStreetRecord = {
  id: string;
  zone: string;
  street: string;
  complexes: number;
  updatedAt: string;
};

type CensusComplexRecord = {
  id: string;
  zone: string;
  street: string;
  name: string;
  units: number;
  owners: number;
  updatedAt: string;
};

type GoalRecord = {
  id: string;
  label: string;
  current: number;
  target: number;
  owner: string;
  updatedAt: string;
};

type UserRole =
  | "TITOLARE"
  | "ASSOCIATO"
  | "COORDINATORE/TRICE"
  | "AGENTE"
  | "TELEFONISTA"
  | "SVILUPPATORE";

type AccountStatus = "Attivo" | "Sospeso";

type AccountRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  managerId?: string;
  updatedAt: string;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type CrmData = {
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
};

type CrmCommit = (updater: (data: CrmData) => CrmData, message: string) => void;

const accountEmail = "daniele.marangoni@grfenix.com";
const accountPasswordHash =
  "35b47eca325c70ec48ba4d8489301c7ee82b6a50ac330938158dcfe1a5fded11";
const accountsStorageKey = "fenix-suite-accounts-v1";
const sessionStorageKey = "fenix-suite-current-user-v1";
const legacySessionKey = "fenix-suite-session";

const roleOptions: UserRole[] = [
  "TITOLARE",
  "ASSOCIATO",
  "COORDINATORE/TRICE",
  "AGENTE",
  "TELEFONISTA",
  "SVILUPPATORE",
];

const roleDescriptions: Record<UserRole, string> = {
  TITOLARE: "Gestisce account, dati, impostazioni e ogni area del CRM.",
  ASSOCIATO: "Gestisce gli altri account e usa le funzioni operative del CRM.",
  "COORDINATORE/TRICE": "Usa il CRM e gestisce solo gli account delle telefoniste.",
  AGENTE: "Usa le funzioni base: clienti, immobili, agenda e attivita operative.",
  TELEFONISTA: "Usa le funzioni base per chiamate, note, clienti e agenda.",
  SVILUPPATORE: "Usa il CRM e interviene su problemi tecnici di account e sito.",
};

const searchFilterFields: QuickFormField[] = [
  "Nome",
  "Cognome",
  "Numero",
  "Codice fiscale",
  "Foglio",
  "Particella",
  "Subalterno",
  {
    name: "Categoria catastale",
    options: ["", "A/1", "A/2", "A/3", "A/4", "A/5", "A/6", "A/7", "A/8", "A/9", "A/10", "A/11", "C/1", "C/2", "C/6", "C/7"],
  },
  {
    name: "Vani",
    options: ["", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "7", "8", "9", "10+"],
  },
];

const defaultAccount: AccountRecord = {
  id: "account-daniele-marangoni",
  name: "Daniele Marangoni",
  email: accountEmail,
  passwordHash: accountPasswordHash,
  role: "SVILUPPATORE",
  status: "Attivo",
  updatedAt: "Account iniziale",
};

const externalTools = [
  {
    title: "RPO",
    description:
      "Accedi al modulo Registro Pubblico delle Opposizioni per bonifica e gestione liste.",
    href: "/rpo",
    Icon: ShieldCheck,
  },
  {
    title: "PLANIMETRIE",
    description:
      "Apri il modulo planimetrie per consultare e gestire elaborati grafici e documentazione.",
    href: "/planimetrie",
    Icon: PanelsTopLeft,
  },
];

const selectorPrograms: ProgramCard[] = [
  {
    title: "PROGRAMMA CRM",
    description:
      "Gestionale operativo per clienti, immobili, agenda, censimento e attivita di agenzia.",
    path: "/crm",
    Icon: Gauge,
    hiddenInSelector: true,
  },
  {
    title: "PROGRAMMA RPO",
    description:
      "Suite completa per l'estrazione, il taglio e la bonifica dei numeri di telefono con il portale del Registro Pubblico delle Opposizioni.",
    path: "/rpo",
    Icon: PhoneCall,
  },
  {
    title: "PLANIMETRIE",
    description:
      "Modulo per generare e gestire planimetrie arredate partendo da immagini, schizzi o documentazione grafica.",
    path: "/planimetrie",
    Icon: PanelsTopLeft,
    hiddenInSelector: true,
  },
];

const modules: ModuleItem[] = [
  {
    key: "start",
    label: "Oggi",
    description: "Chiamate, appunti e avanzamento della giornata.",
    Icon: Gauge,
  },
  {
    key: "nominativi",
    label: "Clienti",
    description: "Persone, proprietari, telefoni, note e prossimo contatto.",
    Icon: UsersRound,
  },
  {
    key: "censimento",
    label: "Censimento",
    description: "Zone, stabili, contatti territoriali e sviluppo censimento.",
    Icon: MapPinned,
  },
  {
    key: "immobili",
    label: "Immobili",
    description: "Schede immobili, proprietari, prezzi e pubblicazione.",
    Icon: Home,
  },
  {
    key: "agenda",
    label: "Agenda",
    description: "Telefonate, visite, appuntamenti e follow-up.",
    Icon: CalendarDays,
  },
  {
    key: "utilita",
    label: "Strumenti",
    description: "Backup, portali, pubblicita, censimento e configurazioni.",
    Icon: Wrench,
  },
];

const modulePages: Record<ModuleKey, ModulePage[]> = {
  start: [
    {
      key: "start-dashboard",
      label: "Progressi",
      description: "Progressi giornalieri e andamento mensile rispetto agli obiettivi del team collegato.",
      Icon: LayoutDashboard,
    },
  ],
  immobili: [
    {
      key: "immobili-tutti",
      label: "Elenco",
      description: "Archivio completo con filtri, stato pratica, portali e azioni rapide.",
      Icon: ListChecks,
    },
    {
      key: "immobili-nuovo",
      label: "Nuovo",
      description: "Inserimento scheda immobile con proprietario, incarico, prezzi, media e pubblicazione.",
      Icon: Plus,
    },
    {
      key: "immobili-vendite",
      label: "Vendite",
      description: "Elenco vendite con incarichi, prezzo, stato commerciale e sincronizzazione.",
      Icon: Home,
    },
    {
      key: "immobili-affitti",
      label: "Affitti",
      description: "Gestione locazioni annuali e disponibilita.",
      Icon: CalendarDays,
    },
  ],
  richieste: [
    {
      key: "richieste-elenco",
      label: "Elenco",
      description: "Archivio richieste, stato e proposta collegata.",
      Icon: BriefcaseBusiness,
    },
    {
      key: "richieste-nuova",
      label: "Nuova",
      description: "Creazione richiesta cliente con budget, zone, tipologie e matching.",
      Icon: Plus,
    },
    {
      key: "richieste-matching",
      label: "Matching",
      description: "Abbinamento automatico fra richieste e immobili attivi.",
      Icon: RefreshCcwDot,
    },
  ],
  nominativi: [
    {
      key: "nominativi-elenco",
      label: "Elenco",
      description: "Database clienti da qualificare e usare per proporre immobili compatibili.",
      Icon: UsersRound,
    },
    {
      key: "nominativi-nuovo",
      label: "Nuovo",
      description: "Inserimento cliente con telefono, esigenza, provenienza e prossimo ricontatto.",
      Icon: UserRound,
    },
  ],
  agenda: [
    {
      key: "agenda-calendario",
      label: "Agenda",
      description: "Calendario operativo per oggi, domani e settimana.",
      Icon: CalendarDays,
    },
    {
      key: "attivita-nuova",
      label: "Nuova",
      description: "Nuova attivita, telefonata, appuntamento o visita collegata a contatto e immobile.",
      Icon: Plus,
    },
    {
      key: "agenda-storico",
      label: "Storico",
      description: "Storico attivita e ricerca per operatore, data, cliente o immobile.",
      Icon: Search,
    },
  ],
  pubblicita: [
    {
      key: "pubblicita-portali",
      label: "Pubblicita",
      description: "Pubblicazioni, portali, campagne, vetrina e materiali marketing.",
      Icon: Globe2,
    },
  ],
  contattiPubblicita: [
    {
      key: "contatti-p-nuovo",
      label: "Nuovo",
      description: "Inserimento lead pubblicitario ricevuto da portali, sito o campagne.",
      Icon: Plus,
    },
    {
      key: "contatti-p-elenco",
      label: "Elenco",
      description: "Lista contatti pubblicitari da qualificare e convertire in nominativi.",
      Icon: ListChecks,
    },
  ],
  censimento: [
    {
      key: "censimento-zone",
      label: "Zona",
      description: "Fase 1: creazione o selezione della zona di riferimento.",
      Icon: MapPinned,
    },
    {
      key: "censimento-vie",
      label: "Via",
      description: "Fase 2: creazione o selezione della via dentro la zona.",
      Icon: MapPinned,
    },
    {
      key: "censimento-complessi",
      label: "Complesso",
      description: "Fase 3: creazione o selezione del palazzo dentro la via.",
      Icon: Building2,
    },
    {
      key: "censimento-proprietari",
      label: "Proprietari",
      description: "Fase 4: creazione, selezione e gestione dei proprietari degli immobili.",
      Icon: UsersRound,
    },
  ],
  obiettivi: [
    {
      key: "obiettivi-elenco",
      label: "Elenco",
      description: "Obiettivi per periodo, operatore e agenzia.",
      Icon: Target,
    },
  ],
  utilita: [
    {
      key: "account-ruoli",
      label: "Account",
      description: "Utenti, ruoli, permessi e manutenzione degli accessi.",
      Icon: UsersRound,
    },
    {
      key: "utilita-backup",
      label: "Backup",
      description: "Backup, esportazioni e archivio operativo.",
      Icon: DatabaseBackup,
    },
    {
      key: "utilita-portali",
      label: "Portali",
      description: "Code di esportazione e stato invio ai portali.",
      Icon: UploadCloud,
    },
    {
      key: "pubblicita-portali",
      label: "Pubblicita",
      description: "Pubblicazioni, portali, campagne, vetrina e materiali marketing.",
      Icon: Globe2,
    },
    {
      key: "obiettivi-elenco",
      label: "Obiettivi",
      description: "Obiettivi per periodo, operatore e agenzia.",
      Icon: Target,
    },
    {
      key: "impostazioni-azienda",
      label: "Impostazioni",
      description: "Dati aziendali, sedi, utenti e permessi.",
      Icon: Settings,
    },
  ],
  impostazioni: [
    {
      key: "impostazioni-cantieri",
      label: "Cantieri",
      description: "Anagrafiche cantieri e immobili collegati.",
      Icon: Building2,
    },
    {
      key: "impostazioni-tipologie",
      label: "Tipologie",
      description: "Tipologie immobiliari disponibili nelle schede.",
      Icon: Home,
    },
    {
      key: "impostazioni-tipi-gestione",
      label: "Tipi gestione",
      description: "Vendita, locazione e configurazioni commerciali.",
      Icon: BriefcaseBusiness,
    },
    {
      key: "impostazioni-stati",
      label: "Stati conservazione",
      description: "Stati e condizioni degli immobili.",
      Icon: BadgeCheck,
    },
    {
      key: "impostazioni-accessori",
      label: "Accessori",
      description: "Accessori globali, per tipologia e per gestione.",
      Icon: Blocks,
    },
    {
      key: "impostazioni-modulistica",
      label: "Modulistica",
      description: "Contratti, modelli e documenti.",
      Icon: FileBadge,
    },
    {
      key: "impostazioni-cartelli",
      label: "Setup cartelli",
      description: "Preset grafici per cartelli e vetrina.",
      Icon: GalleryVerticalEnd,
    },
    {
      key: "impostazioni-distanze",
      label: "Distanze",
      description: "Punti di interesse e distanze standard.",
      Icon: MapPinned,
    },
    {
      key: "impostazioni-azienda",
      label: "Dati agenzia",
      description: "Dati aziendali, sedi, utenti e permessi.",
      Icon: Building2,
    },
    {
      key: "impostazioni-aree",
      label: "Aree geografiche",
      description: "Frazioni, localita e zone operative.",
      Icon: Globe2,
    },
    {
      key: "impostazioni-provenienze",
      label: "Provenienze",
      description: "Portali, giornalini, siti web e altri canali.",
      Icon: CircleDot,
    },
    {
      key: "impostazioni-email-cp",
      label: "E-mail Contatti P.",
      description: "Mailbox e mittenti accettati per lead pubblicitari.",
      Icon: Mail,
    },
  ],
};

function getInitialModule(): ModuleKey {
  return "start";
}

function getInitialPage(moduleKey: ModuleKey) {
  return modulePages[moduleKey][0].key;
}

function isValidRole(role: string): role is UserRole {
  return roleOptions.includes(role as UserRole);
}

function isValidAccountStatus(status: string): status is AccountStatus {
  return status === "Attivo" || status === "Sospeso";
}

function isFenixEmail(email: string) {
  return email.toLowerCase().endsWith("@grfenix.com");
}

function hasOwnerOverride(user: Pick<SessionUser, "email" | "role">) {
  return user.email.toLowerCase() === accountEmail && user.role === "SVILUPPATORE";
}

function canUseTools(user: SessionUser) {
  return hasOwnerOverride(user) || ["TITOLARE", "ASSOCIATO", "COORDINATORE/TRICE", "SVILUPPATORE"].includes(user.role);
}

function canManageAccounts(user: SessionUser) {
  return hasOwnerOverride(user) || user.role === "TITOLARE" || user.role === "ASSOCIATO" || user.role === "COORDINATORE/TRICE";
}

function canUseDeveloperTools(user: SessionUser) {
  return hasOwnerOverride(user) || user.role === "TITOLARE" || user.role === "SVILUPPATORE";
}

function canAccessUtilityPage(user: SessionUser, pageKey: string) {
  if (hasOwnerOverride(user) || user.role === "TITOLARE") {
    return true;
  }

  if (user.role === "ASSOCIATO") {
    return pageKey === "account-ruoli";
  }

  if (user.role === "COORDINATORE/TRICE") {
    return pageKey === "account-ruoli";
  }

  if (user.role === "SVILUPPATORE") {
    return ["account-ruoli", "utilita-backup", "impostazioni-azienda"].includes(pageKey);
  }

  return false;
}

function getVisibleModules(user: SessionUser) {
  return modules.filter((module) => module.key !== "utilita" || canUseTools(user));
}

function getVisibleModulePages(moduleKey: ModuleKey, user: SessionUser) {
  const pages = modulePages[moduleKey];
  return moduleKey === "utilita"
    ? pages.filter((page) => canAccessUtilityPage(user, page.key))
    : pages;
}

function getAssignableRoles(user: SessionUser) {
  if (hasOwnerOverride(user) || user.role === "TITOLARE") {
    return roleOptions;
  }

  if (user.role === "ASSOCIATO") {
    return roleOptions.filter((role) => role !== "TITOLARE");
  }

  if (user.role === "COORDINATORE/TRICE") {
    return ["TELEFONISTA"] as UserRole[];
  }

  return [] as UserRole[];
}

function isManagedByCurrentUser(account: AccountRecord, user: SessionUser) {
  return account.managerId === user.id;
}

function getAccountScope(accounts: AccountRecord[], user: SessionUser) {
  if (hasOwnerOverride(user) || user.role === "TITOLARE") {
    return {
      label: "Tutta agenzia",
      accounts: accounts.filter((account) => account.status === "Attivo"),
    };
  }

  if (user.role === "ASSOCIATO" || user.role === "COORDINATORE/TRICE") {
    return {
      label: "Account collegati",
      accounts: accounts.filter((account) => isManagedByCurrentUser(account, user) && account.status === "Attivo"),
    };
  }

  return {
    label: "Personale",
    accounts: accounts.filter((account) => account.id === user.id && account.status === "Attivo"),
  };
}

function toSessionUser(account: AccountRecord): SessionUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  };
}

function normalizeAccount(input: Partial<AccountRecord>, index: number): AccountRecord | null {
  const email = String(input.email || "").trim().toLowerCase();
  const passwordHash = String(input.passwordHash || "");
  const role = String(input.role || "");

  if (!email || !passwordHash || !isValidRole(role)) {
    return null;
  }

  return {
    id: String(input.id || `account-${index}-${email.replace(/[^a-z0-9]/g, "-")}`),
    name: String(input.name || email),
    email,
    passwordHash,
    role,
    status: isValidAccountStatus(String(input.status || "")) ? input.status as AccountStatus : "Attivo",
    managerId: typeof input.managerId === "string" ? input.managerId : undefined,
    updatedAt: String(input.updatedAt || "Importato"),
  };
}

function loadAccounts(): AccountRecord[] {
  const savedAccounts = localStorage.getItem(accountsStorageKey);
  const parsedAccounts = savedAccounts ? safeJsonParse(savedAccounts) : null;
  const normalized = Array.isArray(parsedAccounts)
    ? parsedAccounts
        .map((account, index) => normalizeAccount(account as Partial<AccountRecord>, index))
        .filter((account): account is AccountRecord => Boolean(account))
    : [];
  const withoutDefault = normalized.filter((account) => account.email !== defaultAccount.email);
  return [defaultAccount, ...withoutDefault];
}

function saveAccounts(accounts: AccountRecord[]) {
  localStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
}

function getStoredSessionUser(): SessionUser | null {
  const savedSession = localStorage.getItem(sessionStorageKey);
  const parsedSession = savedSession ? safeJsonParse(savedSession) : null;

  if (
    parsedSession &&
    typeof parsedSession === "object" &&
    "email" in parsedSession &&
    "role" in parsedSession &&
    isValidRole(String((parsedSession as SessionUser).role))
  ) {
    return {
      id: String((parsedSession as SessionUser).id || defaultAccount.id),
      name: String((parsedSession as SessionUser).name || defaultAccount.name),
      email: String((parsedSession as SessionUser).email || defaultAccount.email).toLowerCase(),
      role: (parsedSession as SessionUser).role,
    };
  }

  if (localStorage.getItem(legacySessionKey) === "active") {
    return toSessionUser(defaultAccount);
  }

  return null;
}

function storeSessionUser(user: SessionUser) {
  localStorage.setItem(legacySessionKey, "active");
  localStorage.setItem(sessionStorageKey, JSON.stringify(user));
}

function clearSessionUser() {
  localStorage.removeItem(legacySessionKey);
  localStorage.removeItem(sessionStorageKey);
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

const features: Feature[] = [
  {
    title: "Ricerca Cloud C.S.E.",
    description:
      "Motore di ricerca interno per intercettare opportunita immobiliari, confrontare schede e proporre risultati piu pertinenti ai clienti.",
    Icon: Cloud,
  },
  {
    title: "Affitti turistici",
    description:
      "Planning periodi, listini e disponibilita in una vista unica pensata per stagionalita, prenotazioni e gestione rapida degli immobili.",
    Icon: CalendarDays,
  },
  {
    title: "Censimento",
    description:
      "Mappa zone, contatti e ricontatti per costruire nuove acquisizioni con attivita ordinate per zona e avanzamento.",
    Icon: MapPinned,
  },
  {
    title: "Layout responsive",
    description:
      "Interfaccia ottimizzata per tablet e smartphone, utile quando agenti e collaboratori lavorano fuori ufficio.",
    Icon: Smartphone,
  },
  {
    title: "Multi sito",
    description:
      "Gestione coordinata di piu siti web, schede ottimizzate e pubblicazioni coerenti per ogni canale proprietario.",
    Icon: Globe2,
  },
  {
    title: "Plugin WordPress",
    description:
      "Sincronizzazione veloce con siti WordPress tramite flussi guidati per mantenere gli annunci sempre aggiornati.",
    Icon: PanelsTopLeft,
  },
  {
    title: "Contratti",
    description:
      "Modelli personalizzati per vendita e locazione, compilazione assistita e archivio documentale collegato alle pratiche.",
    Icon: FileBadge,
  },
  {
    title: "SMS WhatsApp Email",
    description:
      "Contatti immediati, promemoria appuntamenti e invio schede tramite i canali piu comodi per cliente e agenzia.",
    Icon: MessageSquareText,
  },
  {
    title: "Cartelli vetrina",
    description:
      "Schede stampabili, QR code e materiali di vetrina pronti per presentare gli immobili con grafica coerente.",
    Icon: GalleryVerticalEnd,
  },
  {
    title: "Agenda",
    description:
      "Appuntamenti, collaboratori e storico attivita in un calendario operativo sincronizzabile con strumenti esterni.",
    Icon: CalendarDays,
  },
  {
    title: "Backup sicurezza",
    description:
      "Archivio scaricabile e dati protetti da copie automatiche, con permessi e procedure pensate per continuita operativa.",
    Icon: ShieldCheck,
  },
  {
    title: "Ruoli permessi",
    description:
      "Accessi personalizzabili per collaboratori, uffici e funzioni sensibili, cosi ogni profilo vede solo cio che serve.",
    Icon: LockKeyhole,
  },
  {
    title: "Web marketing",
    description:
      "Strumenti commerciali per promuovere immobili, seguire lead e misurare le azioni piu utili alla vendita.",
    Icon: ChartNoAxesCombined,
  },
  {
    title: "Incroci automatici",
    description:
      "Matching fra clienti e immobili con compatibilita, suggerimenti di contatto ed esclusioni dalle ricerche future.",
    Icon: RefreshCcwDot,
  },
  {
    title: "Sincronizzazione portali",
    description:
      "Pubblicazione rapida sui portali immobiliari, con schede coerenti e aggiornamenti controllati da un unico pannello.",
    Icon: MousePointerClick,
  },
  {
    title: "Pannello cruscotto",
    description:
      "Dashboard iniziale con scadenze, appuntamenti, andamento agenzia e lavori recenti sempre sotto controllo.",
    Icon: LayoutDashboard,
  },
  {
    title: "Anagrafiche",
    description:
      "Schede complete per clienti, proprietari ed esigenze, con contatti veloci e storico comunicazioni integrato.",
    Icon: UsersRound,
  },
  {
    title: "Immobili",
    description:
      "Archivio annunci, media, caratteristiche e pubblicazione: ogni scheda puo essere catalogata secondo le esigenze.",
    Icon: Home,
  },
];

const crmStorageKey = "fenix-suite-crm-data-v2";

const initialCrmData: CrmData = {
  properties: [],
  requests: [],
  contacts: [],
  activities: [],
  marketingChannels: [],
  censusAreas: [],
  censusStreets: [],
  censusComplexes: [],
  goals: [],
  activityLog: [],
};

function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPath: string) {
    window.history.pushState(null, "", nextPath);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (path.startsWith("/crm")) {
    return <CrmApp />;
  }

  if (path.startsWith("/planimetrie")) {
    return <PlanimetrieTool onNavigate={navigate} />;
  }

  if (path.startsWith("/rpo")) {
    return <RpoTool onNavigate={navigate} />;
  }

  return <ProgramSelector onNavigate={navigate} />;
}

function ProgramSelector({ onNavigate }: { onNavigate: (path: string) => void }) {
  const visiblePrograms = selectorPrograms.filter((program) => !program.hiddenInSelector);

  useEffect(() => {
    document.title = "Fenix Group | Suite";
  }, []);

  return (
    <main className="suite-selector-shell">
      <section className="suite-selector" aria-label="Selezione programma">
        <img className="suite-selector-logo" src="/logo.png" alt="Fenix Group Real Estate" />
        <div className="suite-selector-label">Seleziona un programma</div>
        <div className={`suite-program-grid ${visiblePrograms.length === 1 ? "single" : ""}`}>
          {visiblePrograms.map(({ title, description, path, Icon }) => (
            <button
              className="suite-program-card"
              key={path}
              type="button"
              onClick={() => onNavigate(path)}
            >
              <span className="suite-program-icon" aria-hidden="true">
                <Icon size={34} strokeWidth={2.1} />
              </span>
              <strong>{title}</strong>
              <small>{description}</small>
            </button>
          ))}
        </div>
        <footer>Realindidden System © 2026</footer>
      </section>
    </main>
  );
}

function CrmApp() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => getStoredSessionUser());
  const [screen, setScreen] = useState<Screen>(() => (getStoredSessionUser() ? "workspace" : "marketing"));

  function openLogin() {
    setScreen("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMarketing() {
    setScreen("marketing");
    window.location.hash = "top";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openWorkspace(user: SessionUser) {
    storeSessionUser(user);
    setSessionUser(user);
    setScreen("workspace");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function updateSession(user: SessionUser) {
    storeSessionUser(user);
    setSessionUser(user);
  }

  function logout() {
    clearSessionUser();
    setSessionUser(null);
    setScreen("marketing");
  }

  if (screen === "workspace" && sessionUser) {
    return <Workspace currentUser={sessionUser} onLogout={logout} onSessionUpdate={updateSession} />;
  }

  if (screen === "login") {
    return <LoginScreen onBack={openMarketing} onSuccess={openWorkspace} />;
  }

  return (
    <main className="site-shell">
      <Header onLogin={openLogin} />
      <Hero onLogin={openLogin} />
      <AccessSection onLogin={openLogin} />
      <FeatureSection />
      <ProcessBand />
      <ContactSection />
      <Footer />
    </main>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
    </span>
  );
}

function Header({ onLogin }: { onLogin: () => void }) {
  return (
    <header className="topbar" aria-label="Navigazione principale">
      <a className="brand" href="#top" aria-label="Fenix Suite home">
        <BrandMark />
        <span className="brand-copy">
          <strong>Fenix Suite</strong>
          <small>Real Estate Platform</small>
        </span>
      </a>
      <nav className="desktop-nav">
        <a href="#funzioni">Funzioni</a>
        <a href="#workflow">Workflow</a>
        <a href="#richiedi">Contatti</a>
      </nav>
      <button className="login-link button-reset" type="button" onClick={onLogin}>
        Accedi
      </button>
    </header>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <div className="system-label">Gestionale Immobiliare</div>
        <h1>
          <span>Fenix Suite</span>
          <span className="hero-subline">per agenzie immobiliari</span>
        </h1>
        <p>
          Una piattaforma professionale per gestire immobili, clienti, agenda,
          portali, documenti e attivita commerciali in un unico ambiente.
        </p>
        <p className="hero-secondary">
          Interfaccia chiara, dati ordinati e workflow pensati per agenzie che
          vogliono ridurre passaggi manuali e lavorare con piu controllo.
        </p>
        <div className="hero-actions">
          <button className="primary-action" type="button" onClick={onLogin}>
            Accedi
          </button>
          <button className="secondary-action" type="button" onClick={scrollToInfo}>
            Richiedi informazioni
          </button>
        </div>
      </div>
      <DashboardPreview />
    </section>
  );
}

function DashboardPreview() {
  const previewSteps = [
    { time: "1", title: "Inserisci cliente" },
    { time: "2", title: "Qualifica esigenza" },
    { time: "3", title: "Pianifica ricontatto" },
  ];
  const previewActions = [
    { name: "Immobili", tag: "Schede e portali", score: "Pronto" },
    { name: "Censimento", tag: "Zone e contatti", score: "Pronto" },
    { name: "Agenda", tag: "Attivita e visite", score: "Pronto" },
  ];

  return (
    <div className="dashboard-preview" aria-label="Anteprima dashboard gestionale">
      <div className="dash-head">
        <div>
          <span className="system-label">Pannello cruscotto</span>
          <strong>Pipeline agenzia</strong>
        </div>
        <span className="live-dot">Live</span>
      </div>
      <div className="dash-metrics">
        <div>
          <small>Immobili</small>
          <strong>0</strong>
        </div>
        <div>
          <small>Clienti</small>
          <strong>0</strong>
        </div>
        <div>
          <small>Censimento</small>
          <strong>0</strong>
        </div>
      </div>
      <div className="dash-grid">
        <div className="timeline-panel">
          <div className="panel-title">
            <CalendarDays size={18} />
            Flusso iniziale
          </div>
          {previewSteps.map((item) => (
            <div className="timeline-item" key={item.time}>
              <span>{item.time}</span>
              <p>{item.title}</p>
            </div>
          ))}
        </div>
        <div className="lead-panel">
          <div className="panel-title">
            <Sparkles size={18} />
            Moduli pronti
          </div>
          {previewActions.map((row) => (
            <div className="lead-row" key={row.name}>
              <span>
                <strong>{row.name}</strong>
                <small>{row.tag}</small>
              </span>
              <b>{row.score}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccessSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="access-section" id="accesso">
      <div className="access-copy">
        <span className="system-label">Accesso programmi</span>
        <h2>Seleziona il modulo operativo</h2>
        <p>
          Entra nel gestionale interno Fenix Suite oppure apri gli strumenti Fenix
          gia disponibili online.
        </p>
      </div>
      <div className="access-grid">
        <button
          className="access-card access-card-button"
          type="button"
          onClick={onLogin}
        >
          <span className="access-icon" aria-hidden="true">
            <KeyRound size={26} strokeWidth={1.8} />
          </span>
          <span>
            <strong>FENIX SUITE</strong>
            <small>Accedi al gestionale interno con cruscotto, immobili, clienti e agenda.</small>
          </span>
          <ChevronRight size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>
        {externalTools.map(({ title, description, href, Icon }) => (
          <a className="access-card" href={href} key={title}>
            <span className="access-icon" aria-hidden="true">
              <Icon size={26} strokeWidth={1.8} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ArrowUpRight size={22} strokeWidth={1.8} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="section" id="funzioni">
      <div className="section-heading">
        <span className="system-label">Funzioni principali</span>
        <h2>Funzioni operative per gestire l'intero ciclo immobiliare</h2>
        <p>
          Dalla prima acquisizione alla pubblicazione sui portali, Fenix Suite
          centralizza le attivita quotidiane dell'agenzia in una dashboard ordinata
          e facile da consultare.
        </p>
      </div>
      <div className="feature-grid">
        {features.map(({ title, description, Icon }) => (
          <article className="feature-card" key={title}>
            <div className="icon-tile" aria-hidden="true">
              <Icon size={24} strokeWidth={1.8} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProcessBand() {
  return (
    <section className="process-band" id="workflow">
      <div className="process-copy">
        <span className="system-label">Workflow agenzia</span>
        <h2>Da lead a incarico, senza cambiare ambiente.</h2>
      </div>
      <div className="process-steps" aria-label="Flusso operativo">
        <div>
          <Cloud size={22} />
          <strong>Acquisisci</strong>
          <span>Portali, sito, censimento</span>
        </div>
        <div>
          <Building2 size={22} />
          <strong>Organizza</strong>
          <span>Immobili, anagrafiche, contratti</span>
        </div>
        <div>
          <BadgeCheck size={22} />
          <strong>Pubblica</strong>
          <span>Marketing, vetrina, sincronizzazioni</span>
        </div>
        <div>
          <Blocks size={22} />
          <strong>Misura</strong>
          <span>Cruscotto, agenda, sicurezza</span>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="contact-section" id="richiedi">
      <div className="contact-copy">
        <span className="system-label">Richiedi informazioni</span>
        <h2>Parla con un consulente Fenix Suite</h2>
        <p>
          Compila il modulo per ricevere dettagli, assistenza o una presentazione del gestionale
          e valutare come adattarlo al flusso operativo della tua agenzia.
        </p>
        <div className="contact-strip">
          <Mail size={18} />
          <span>Risposta entro un giorno lavorativo</span>
        </div>
      </div>
      <form
        className="contact-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          form.classList.add("form-sent");
        }}
      >
        <div className="form-row">
          <label>
            Nome e cognome
            <input required type="text" placeholder="Nome cognome" />
          </label>
          <label>
            Email
            <input required type="email" placeholder="mario@agenzia.it" />
          </label>
        </div>
        <label>
          Argomento
          <select defaultValue="">
            <option value="" disabled>
              Seleziona un argomento
            </option>
            <option>Presentazione gestionale</option>
            <option>Informazioni commerciali</option>
            <option>Assistenza tecnica</option>
          </select>
        </label>
        <label>
          Messaggio
          <textarea placeholder="Scrivi qui il tuo messaggio..." rows={5} />
        </label>
        <label className="privacy-check">
          <input required type="checkbox" />
          <span>Ho letto e accetto la privacy policy.</span>
        </label>
        <button className="primary-action form-button" type="submit">
          Invia
        </button>
        <p className="form-success" role="status">
          Messaggio registrato.
        </p>
      </form>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>Fenix Suite</span>
      <span>Real estate platform © 2026</span>
      <span>Termini e condizioni | Privacy Policy</span>
    </footer>
  );
}

function LoginScreen({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (user: SessionUser) => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const passwordHash = await sha256Hex(password);
    setLoading(false);

    const account = loadAccounts().find(
      (item) => item.email === email && item.passwordHash === passwordHash && item.status === "Attivo",
    );

    if (account) {
      onSuccess(toSessionUser(account));
      return;
    }

    setError("Credenziali non valide per Fenix Suite.");
  }

  return (
    <main className="login-screen">
      <button className="back-link button-reset" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        Torna al sito
      </button>
      <section className="login-panel" aria-label="Accesso Fenix Suite">
        <div className="login-copy">
          <div className="login-brand">
            <BrandMark />
            <span>
              <strong>Fenix Suite</strong>
              <small>Area interna gestionale</small>
            </span>
          </div>
          <span className="system-label">Accesso riservato</span>
          <h1>Entra nel gestionale operativo.</h1>
          <p>
            La suite interna raccoglie cruscotto, immobili, clienti, censimento,
            agenda, censimento e strumenti collegati in un unico ambiente.
          </p>
          <div className="login-highlights">
            <span>
              <ShieldCheck size={18} />
              Sessione locale protetta
            </span>
            <span>
              <DatabaseBackup size={18} />
              Dati salvati nel browser
            </span>
          </div>
        </div>
        <form className="login-form" onSubmit={submitLogin}>
          <label>
            Email
            <input
              name="email"
              required
              type="email"
              autoComplete="username"
              placeholder="nome@grfenix.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              required
              type="password"
              autoComplete="current-password"
              placeholder="password"
            />
          </label>
          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary-action form-button" type="submit" disabled={loading}>
            {loading ? "Verifica..." : "Accedi a Fenix Suite"}
          </button>
          <p className="login-note">
            Account registrato per l'accesso. La password non e' salvata in chiaro
            nell'interfaccia.
          </p>
        </form>
      </section>
    </main>
  );
}

function Workspace({
  currentUser,
  onLogout,
  onSessionUpdate,
}: {
  currentUser: SessionUser;
  onLogout: () => void;
  onSessionUpdate: (user: SessionUser) => void;
}) {
  const [activeModule, setActiveModule] = useState<ModuleKey>(() => getInitialModule());
  const [activePage, setActivePage] = useState(() => getInitialPage(getInitialModule()));
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Dashboard aggiornata.");
  const [crmData, setCrmData] = usePersistentCrmData();
  const [accounts, setAccounts] = usePersistentAccounts();
  const [agendaResetVersion, setAgendaResetVersion] = useState(0);
  const visibleModules = getVisibleModules(currentUser);
  const safeActiveModule = visibleModules.some((item) => item.key === activeModule)
    ? activeModule
    : "start";
  const currentPages = getVisibleModulePages(safeActiveModule, currentUser);
  const currentModule = visibleModules.find((item) => item.key === safeActiveModule) ?? visibleModules[0];
  const currentPage =
    currentPages.find((item) => item.key === activePage) ??
    currentPages[0];
  const creationPage = currentPages.find((page) =>
    page.label.toLowerCase().includes("nuov"),
  );

  function runAction(message: string) {
    setNotice(message);
  }

  function commitData(updater: (data: CrmData) => CrmData, message: string) {
    setCrmData((previousData) => {
      const updatedData = updater(previousData);
      return {
        ...updatedData,
        activityLog: [`${nowLabel()} - ${message}`, ...updatedData.activityLog].slice(0, 80),
      };
    });
    setNotice(message);
  }

  function updateAccounts(updater: (accountList: AccountRecord[]) => AccountRecord[], message: string) {
    setAccounts((previousAccounts) => {
      const nextAccounts = updater(previousAccounts);
      const updatedCurrentUser = nextAccounts.find((account) => account.id === currentUser.id);
      if (updatedCurrentUser) {
        window.queueMicrotask(() => onSessionUpdate(toSessionUser(updatedCurrentUser)));
      }
      return nextAccounts;
    });
    setNotice(message);
  }

  function openModule(moduleKey: ModuleKey, pageKey?: string) {
    if (!getVisibleModules(currentUser).some((item) => item.key === moduleKey)) {
      setNotice("Il tuo ruolo non consente di aprire questa sezione.");
      return;
    }

    const visiblePages = getVisibleModulePages(moduleKey, currentUser);
    const module = visibleModules.find((item) => item.key === moduleKey);
    const page = visiblePages.find((item) => item.key === pageKey) ?? visiblePages[0];
    if (moduleKey === "agenda" && !pageKey) {
      setAgendaResetVersion((version) => version + 1);
    }
    setActiveModule(moduleKey);
    setActivePage(page.key);
    localStorage.setItem("fenix-suite-active-module", moduleKey);
    localStorage.setItem("fenix-suite-active-page", page.key);
    setNotice(`${module?.label ?? "Modulo"} / ${page.label}: pronto.`);
  }

  return (
    <main className="workspace-shell">
      <aside className="app-sidebar">
        <button
          className="app-brand button-reset"
          type="button"
          onClick={() => openModule("start")}
        >
          <BrandMark />
          <span>
            <strong>Fenix Suite</strong>
          <small>Gestionale immobiliare</small>
          </span>
        </button>
        <div className="crm-version">
          <span>{currentUser.role}</span>
          <b>CRM</b>
        </div>
        <nav className="module-nav" aria-label="Moduli gestionale">
          {visibleModules.map(({ key, label, Icon }) => (
            <button
              className={key === safeActiveModule ? "active" : ""}
              key={key}
              type="button"
              onClick={() => openModule(key)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="app-main">
        <header className="app-header">
          <div className="app-search">
            <Search size={18} />
            <input
              aria-label="Cerca nel gestionale"
              placeholder="Cerca immobili, clienti, zone..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="app-header-actions">
            <button type="button" onClick={onLogout}>
              <LogOut size={16} />
              Esci
            </button>
          </div>
        </header>

        <section className="workspace-content">
          <div className="workspace-status" role="status">
            <span>
              <CheckCircle2 size={16} />
              {notice}
            </span>
            <small>Utente: {currentUser.name} / {currentUser.role}</small>
          </div>

          <section className="module-heading">
            <div>
              <span className="system-label">Fenix CRM / {currentModule.label}</span>
              <h1>{currentPage.label}</h1>
              <p>{currentPage.description}</p>
            </div>
            {creationPage && currentPage.key !== creationPage.key ? (
              <button
                className="module-action"
                type="button"
                onClick={() => openModule(safeActiveModule, creationPage.key)}
              >
                <Plus size={18} />
                Nuovo
              </button>
            ) : null}
          </section>

          <ModuleTabs
            pages={currentPages}
            activePage={currentPage.key}
            onSelect={(pageKey) => {
              setActivePage(pageKey);
              localStorage.setItem("fenix-suite-active-module", safeActiveModule);
              localStorage.setItem("fenix-suite-active-page", pageKey);
              const page = currentPages.find((item) => item.key === pageKey);
              setNotice(`${currentModule.label} / ${page?.label ?? "Sezione"}: pronto.`);
            }}
          />

          <ModuleView
            moduleKey={safeActiveModule}
            pageKey={currentPage.key}
            query={query}
            data={crmData}
            onCommit={commitData}
            onAction={runAction}
            onOpenModule={openModule}
            currentUser={currentUser}
            accounts={accounts}
            onAccountsChange={updateAccounts}
            agendaResetVersion={agendaResetVersion}
          />
        </section>
      </section>
    </main>
  );
}

function ModuleTabs({
  pages,
  activePage,
  onSelect,
}: {
  pages: ModulePage[];
  activePage: string;
  onSelect: (pageKey: string) => void;
}) {
  if (pages.length <= 1) {
    return null;
  }

  return (
    <nav className="submodule-nav" aria-label="Sottomenu modulo">
      {pages.map(({ key, label, Icon }) => (
        <button
          className={key === activePage ? "active" : ""}
          key={key}
          type="button"
          onClick={() => onSelect(key)}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function ModuleView({
  moduleKey,
  pageKey,
  query,
  data,
  onCommit,
  onAction,
  onOpenModule,
  currentUser,
  accounts,
  onAccountsChange,
  agendaResetVersion,
}: {
  moduleKey: ModuleKey;
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenModule: (moduleKey: ModuleKey, pageKey?: string) => void;
  currentUser: SessionUser;
  accounts: AccountRecord[];
  onAccountsChange: (updater: (accountList: AccountRecord[]) => AccountRecord[], message: string) => void;
  agendaResetVersion: number;
}) {
  if (moduleKey === "immobili") {
    return <PropertiesView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "richieste") {
    return <RequestsView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "nominativi") {
    return <ContactsView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "agenda") {
    return <AgendaView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} resetVersion={agendaResetVersion} />;
  }
  if (moduleKey === "pubblicita") {
    return <MarketingView data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "contattiPubblicita") {
    return <AdvertisingContactsView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "censimento") {
    return <CensusView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "obiettivi") {
    return <GoalsView query={query} data={data} onCommit={onCommit} />;
  }
  if (moduleKey === "utilita") {
    if (pageKey === "account-ruoli") {
      return (
        <AccountsView
          accounts={accounts}
          currentUser={currentUser}
          onAccountsChange={onAccountsChange}
          onAction={onAction}
        />
      );
    }
    if (pageKey === "pubblicita-portali") {
      return <MarketingView data={data} onCommit={onCommit} onAction={onAction} />;
    }
    if (pageKey === "obiettivi-elenco") {
      return <GoalsView query={query} data={data} onCommit={onCommit} />;
    }
    if (pageKey.startsWith("impostazioni-")) {
      return <SettingsView pageKey={pageKey} query={query} onCommit={onCommit} />;
    }
    return <UtilitiesView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "impostazioni") {
    return <SettingsView pageKey={pageKey} query={query} onCommit={onCommit} />;
  }
  return (
    <StartView
      accounts={accounts}
      currentUser={currentUser}
      data={data}
      onCommit={onCommit}
      onOpenModule={onOpenModule}
    />
  );
}

function StartView({
  accounts,
  currentUser,
  data,
  onCommit,
  onOpenModule,
}: {
  accounts: AccountRecord[];
  currentUser: SessionUser;
  data: CrmData;
  onCommit: CrmCommit;
  onOpenModule: (moduleKey: ModuleKey, pageKey?: string) => void;
}) {
  const accountScope = getAccountScope(accounts, currentUser);
  const scopeOwners = new Set(
    accountScope.accounts.flatMap((account) => [
      account.name.toLowerCase(),
      account.name.split(" ")[0]?.toLowerCase() || "",
      account.email.split("@")[0]?.split(".")[0]?.toLowerCase() || "",
    ]),
  );
  const isInScope = (owner: string) =>
    accountScope.label === "Tutta agenzia" || !owner || scopeOwners.has(owner.toLowerCase());
  const scopedContacts = data.contacts.filter((contact) => isInScope(contact.owner));
  const scopedActivities = data.activities.filter((activity) => isInScope(activity.owner));
  const scopedGoals = data.goals.filter((goal) => isInScope(goal.owner));
  const callQueue = scopedContacts
    .filter((contact) => /ricontattare|lead|valutazione|visita/i.test(contact.status))
    .slice(0, 5);
  const fallbackQueue = callQueue.length ? callQueue : scopedContacts.slice(0, 5);
  const todayCalls = scopedActivities.filter(
    (activity) => activity.day === "Oggi" && /telefonata/i.test(activity.type),
  ).length;
  const urgentFollowUps = scopedContacts.filter((contact) => /ricontattare|lead/i.test(contact.status)).length;
  const openAppointments = scopedActivities.filter(
    (activity) => activity.day === "Oggi" && /visita|appuntamento|incarico/i.test(activity.type),
  ).length;
  const monthlyContacts = scopedContacts.length;
  const monthlyProperties = data.properties.length;
  const monthlyActivities = scopedActivities.length;
  const monthlyGoals = scopedGoals.length;

  function registerCall(contact: ContactRecord) {
    onCommit(
      (currentData) => ({
        ...currentData,
        contacts: currentData.contacts.map((item) =>
          item.id === contact.id
            ? {
                ...item,
                status: "Chiamato oggi",
                nextStep: "Aggiornare esito chiamata",
                updatedAt: nowLabel(),
              }
            : item,
        ),
        activities: [
          createActivity({
            title: `Telefonata ${contact.name}`,
            type: "Telefonata",
            contact: contact.name,
            note: `Chiamata avviata da Start al numero ${contact.phone || "non indicato"}.`,
          }),
          ...currentData.activities,
        ],
      }),
      `Telefonata registrata per ${contact.name}.`,
    );
  }

  return (
    <div className="workspace-grid">
      <Panel className="span-12 crm-flow-panel" title="Percorso rapido">
        <div className="crm-flow-grid">
          <button type="button" onClick={() => onOpenModule("nominativi", "nominativi-nuovo")}>
            <UsersRound size={20} />
            <span>
              <strong>Salva cliente</strong>
              <small>Nome, telefono, esigenza o nota.</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => onOpenModule("censimento", "censimento-zone")}>
            <MapPinned size={20} />
            <span>
              <strong>Apri censimento</strong>
              <small>Zone, stabili e contatti territoriali.</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => onOpenModule("immobili", "immobili-nuovo")}>
            <Home size={20} />
            <span>
              <strong>Inserisci immobile</strong>
              <small>Scheda, proprietario e prezzo.</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => onOpenModule("agenda", "attivita-nuova")}>
            <CalendarDays size={20} />
            <span>
              <strong>Pianifica attivita</strong>
              <small>Telefonata, visita o ricontatto.</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </Panel>

      <div className="kpi-row">
        <KpiCard label="Chiamate oggi" value={String(todayCalls)} trend="giornaliero" Icon={PhoneCall} />
        <KpiCard label="Da seguire" value={String(urgentFollowUps)} trend="giornaliero" Icon={CalendarCheck2} />
        <KpiCard label="Clienti mese" value={String(monthlyContacts)} trend={accountScope.label} Icon={UsersRound} />
        <KpiCard label="Appuntamenti" value={String(openAppointments)} trend="settimana" Icon={CalendarDays} />
      </div>

      <Panel className="span-12" title="Progressi mensili">
        <div className="progress-overview">
          <ProgressLine current={monthlyContacts} label="Clienti censiti nel database" target={Math.max(20, monthlyContacts)} />
          <ProgressLine current={monthlyProperties} label="Immobili in gestione" target={Math.max(10, monthlyProperties)} />
          <ProgressLine current={monthlyActivities} label="Attivita registrate" target={Math.max(40, monthlyActivities)} />
          <ProgressLine current={monthlyGoals} label="Obiettivi configurati" target={Math.max(4, monthlyGoals)} />
        </div>
      </Panel>

      <Panel className="span-12" title="Ambito di analisi">
        <div className="scope-strip">
          <span>
            <strong>{accountScope.label}</strong>
            <small>{accountScope.accounts.length} account attivi inclusi nei progressi</small>
          </span>
          <span>
            <strong>Giornaliero</strong>
            <small>Telefonate, ricontatti e agenda del giorno</small>
          </span>
          <span>
            <strong>Mensile</strong>
            <small>Analisi disponibili entrando nelle sezioni operative</small>
          </span>
        </div>
      </Panel>

      <Panel className="span-5" title="Clienti da richiamare" action="Ricontatti">
        <div className="call-queue">
          {fallbackQueue.length ? (
            fallbackQueue.map((contact, index) => (
              <article key={contact.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{contact.name}</strong>
                  <small>{contact.status} - {contact.source}</small>
                </div>
                <button type="button" onClick={() => registerCall(contact)}>
                  Chiama
                </button>
              </article>
            ))
          ) : (
            <EmptyState title="Nessun ricontatto" text="Aggiungi un nominativo o salva un appunto veloce per creare la prima attivita." />
          )}
        </div>
      </Panel>

      <Panel className="span-4" title="Aggiungi nota veloce">
        <QuickForm
          button="Salva nota"
          fields={["Nome o telefono", "Esigenza", "Budget / zona", "Prossimo passo"]}
          onSubmit={(values) => {
            const nameOrPhone = fieldValue(values, "Nome o telefono", "Nominativo veloce");
            const existingContact = data.contacts.find(
              (contact) => contact.name.toLowerCase() === nameOrPhone.toLowerCase() || contact.phone === nameOrPhone,
            );
            const note = [
              fieldValue(values, "Esigenza", "Esigenza da qualificare"),
              fieldValue(values, "Budget / zona", "Budget/zona da definire"),
            ].join(" - ");
            onCommit(
              (currentData) => ({
                ...currentData,
                contacts: existingContact
                  ? currentData.contacts.map((contact) =>
                      contact.id === existingContact.id
                        ? {
                            ...contact,
                            note,
                            nextStep: fieldValue(values, "Prossimo passo", "Ricontatto"),
                            status: "Appunto aggiornato",
                            updatedAt: nowLabel(),
                          }
                        : contact,
                    )
                  : [
                      {
                        id: makeId("contact"),
                        name: nameOrPhone,
                        type: fieldValue(values, "Esigenza", "Da qualificare"),
                        status: "Nuovo appunto",
                        source: "Start",
                        owner: "Daniele",
                        phone: nameOrPhone.includes("+") || /\d{6,}/.test(nameOrPhone) ? nameOrPhone : "",
                        note,
                        nextStep: fieldValue(values, "Prossimo passo", "Richiamare"),
                        updatedAt: nowLabel(),
                      },
                      ...currentData.contacts,
                    ],
                activities: [
                  createActivity({
                    title: `Appunto veloce ${nameOrPhone}`,
                    type: "Nota",
                    contact: nameOrPhone,
                    note,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Appunto salvato per ${nameOrPhone}.`,
            );
          }}
        />
      </Panel>

      <Panel className="span-3" title="Prossimi impegni">
        <div className="compact-list">
          {data.activities.filter((item) => item.day === "Oggi").length ? (
            data.activities.filter((item) => item.day === "Oggi").slice(0, 5).map((item) => (
              <div key={item.id}>
                <span>{item.time}</span>
                <strong>{item.title}</strong>
                <small>{item.type}</small>
              </div>
            ))
          ) : (
            <EmptyState title="Agenda libera" text="Crea una nuova attivita dalla sezione Agenda." />
          )}
        </div>
      </Panel>

      <Panel className="span-8" title="Clienti recenti">
        <DataTable
          columns={["Nome", "Tipo", "Situazione", "Fonte", "Responsabile"]}
          rows={data.contacts.slice(0, 8).map((contact) => [
            contact.name,
            contact.type,
            contact.status,
            contact.source,
            contact.owner,
          ])}
        />
      </Panel>

      <Panel className="span-4" title="Schema semplice">
        <Checklist
          items={["Chiama i ricontatti urgenti", "Aggiorna la scheda cliente", "Collega esigenza e immobile", "Pianifica prossimo contatto"]}
        />
      </Panel>

      <Panel className="span-12" title="Immobili pronti da proporre">
        <DataTable
          columns={["Codice", "Immobile", "Zona", "Stato", "Prezzo", "Proprietario"]}
          rows={data.properties.slice(0, 8).map((item) => [
            item.code,
            item.title,
            item.zone,
            item.status,
            item.price,
            item.owner,
          ])}
        />
      </Panel>

      <Panel className="span-12" title="Storico operazioni">
        <div className="compact-list">
          {data.activityLog.length ? (
            data.activityLog.slice(0, 6).map((item) => (
              <div key={item}>
                <span>Log</span>
                <strong>{item}</strong>
                <small>Persistito in locale</small>
              </div>
            ))
          ) : (
            <EmptyState title="Storico vuoto" text="Le operazioni salvate nel CRM compariranno qui in ordine cronologico." />
          )}
        </div>
      </Panel>
    </div>
  );
}

function PropertiesView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const baseRows = data.properties.filter((item) => {
    if (pageKey === "immobili-vendite") {
      return item.kind === "vendita";
    }
    if (pageKey === "immobili-affitti") {
      return item.kind === "affitto";
    }
    return true;
  });
  const rows = useFilteredRows(baseRows, query, (item) =>
    [item.code, item.title, item.zone, item.status, item.owner].join(" "),
  );
  const searchMode = pageKey === "immobili-ricerca-op" || pageKey === "immobili-ricerca-cli";
  const newMode = pageKey === "immobili-nuovo";

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Immobili"
        page={labelForPage("immobili", pageKey)}
        path={pathForPage(pageKey)}
        items={["Nuovo immobile -> proprietario -> scheda", "Scheda -> clienti compatibili", "Scheda -> portali, cartelli, contratti"]}
      />
      {searchMode ? (
        <Panel className="span-5" title={pageKey === "immobili-ricerca-op" ? "Ricerca proprietario" : "Ricerca cliente"}>
          <QuickForm
            button="Cerca"
            fields={searchFilterFields}
            required={false}
            onSubmit={(values) =>
              onAction(`Ricerca immobili eseguita per ${valuesSummary(values)}.`)
            }
          />
        </Panel>
      ) : null}
      <Panel className={searchMode ? "span-7" : "span-8"} title={newMode ? "Schede recenti" : "Archivio immobili"} action="Filtri salvati">
        <DataTable
          columns={["Codice", "Immobile", "Zona", "Stato", "Prezzo", "Portali"]}
          rows={rows.map((item) => [
            item.code,
            item.title,
            item.zone,
            item.status,
            item.price,
            item.portals,
          ])}
          actions={[
            {
              label: "Apri",
              onClick: (rowIndex) => {
                const property = rows[rowIndex];
                if (!property) {
                  return;
                }
                onCommit(
                  (currentData) => ({
                    ...currentData,
                    properties: currentData.properties.map((item) =>
                      item.id === property.id
                        ? { ...item, status: "Scheda aperta", updatedAt: nowLabel() }
                        : item,
                    ),
                  }),
                  `Scheda ${property.code} aperta e aggiornata.`,
                );
              },
            },
          ]}
        />
      </Panel>
      <Panel className={newMode ? "span-4 crm-form-panel" : "span-4"} title={newMode ? "Nuovo immobile" : "Azioni scheda"}>
        <QuickForm
          button={newMode ? "Crea scheda" : "Salva filtro"}
          fields={newMode ? ["Titolo immobile", "Zona", "Prezzo richiesto", "Proprietario"] : searchFilterFields}
          required={newMode}
          onSubmit={(values) => {
            if (!newMode) {
              onAction(`Filtro immobili salvato: ${valuesSummary(values)}.`);
              return;
            }
            const title = fieldValue(values, "Titolo immobile", "Nuovo immobile");
            const price = fieldValue(values, "Prezzo richiesto", "Da valutare");
            const newProperty: PropertyRecord = {
              id: makeId("property"),
              code: `FS-${String(250 + data.properties.length).padStart(3, "0")}`,
              title,
              zone: fieldValue(values, "Zona", "Zona da definire"),
              status: "Bozza",
              price,
              owner: fieldValue(values, "Proprietario", "Proprietario da associare"),
              portals: "Bozza",
              kind: price.toLowerCase().includes("mese") ? "affitto" : "vendita",
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                properties: [newProperty, ...currentData.properties],
                activities: [
                  createActivity({
                    title: `Nuova scheda ${newProperty.code}`,
                    type: "Immobile",
                    property: newProperty.title,
                    note: `Scheda creata per ${newProperty.owner}.`,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Scheda ${newProperty.code} creata in bozza.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-4" title="Checklist scheda">
        <Checklist
          items={["Dati proprietario", "Caratteristiche", "Foto", "Planimetria", "Portali"]}
        />
      </Panel>
      <Panel className="span-8" title="Pubblicazione e documenti">
        <div className="tool-grid">
          <ToolButton label="Carica foto" Icon={UploadCloud} onClick={() => onCommit((currentData) => ({
            ...currentData,
            properties: currentData.properties.map((item, index) =>
              index === 0 ? { ...item, status: "Foto aggiornate", updatedAt: nowLabel() } : item,
            ),
          }), "Foto registrate sulla prima scheda disponibile.")} />
          <ToolButton label="Genera cartello" Icon={GalleryVerticalEnd} onClick={() => onCommit((currentData) => ({
            ...currentData,
            activities: [
              createActivity({
                title: "Cartello vetrina generato",
                type: "Documento",
                property: currentData.properties[0]?.title || "",
                note: "Cartello pronto per stampa o vetrina.",
              }),
              ...currentData.activities,
            ],
          }), "Cartello vetrina generato e salvato nello storico.")} />
          <ToolButton label="Contratto" Icon={FileBadge} onClick={() => onCommit((currentData) => ({
            ...currentData,
            activities: [
              createActivity({
                title: "Modello contratto preparato",
                type: "Documento",
                property: currentData.properties[0]?.title || "",
                note: "Documento collegato alla pratica immobile.",
              }),
              ...currentData.activities,
            ],
          }), "Modello contratto preparato.")} />
          <ToolButton label="Sincronizza" Icon={RefreshCcwDot} onClick={() => onCommit((currentData) => ({
            ...currentData,
            properties: currentData.properties.map((item) =>
              item.portals === "Privato" ? item : { ...item, portals: "7/7", status: "In pubblicazione", updatedAt: nowLabel() },
            ),
            marketingChannels: currentData.marketingChannels.map((channel) =>
              channel.name === "Portali immobiliari"
                ? { ...channel, status: "Portali sincronizzati ora", progress: 100, updatedAt: nowLabel() }
                : channel,
            ),
          }), "Sincronizzazione portali completata.")} />
        </div>
      </Panel>
    </div>
  );
}

function RequestsView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const rows = useFilteredRows(data.requests, query, (item) =>
    [item.client, item.target, item.area, item.proposal].join(" "),
  );
  const pipelineCounts = {
    Nuove: data.requests.filter((item) => item.status === "Nuova").length,
    Qualificate: data.requests.filter((item) => item.status === "Qualificata").length,
    Visita: data.requests.filter((item) => item.status === "Visita").length,
    Trattativa: data.requests.filter((item) => item.status === "Trattativa").length,
    Chiuse: data.requests.filter((item) => item.status === "Chiusa").length,
  };

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Richieste"
        page={labelForPage("richieste", pageKey)}
        path={pathForPage(pageKey)}
        items={["Nominativo -> richiesta", "Richiesta -> matching immobili", "Proposta -> agenda visita"]}
      />
      <Panel
        className="span-8"
        title={pageKey === "richieste-matching" ? "Incroci automatici" : "Richieste clienti"}
        action="Matching automatico"
        onPanelAction={() =>
          onCommit(
            (currentData) => ({
              ...currentData,
              requests: currentData.requests.map((request, index) => ({
                ...request,
                match: `${Math.max(72, 95 - index * 4)}%`,
                proposal: currentData.properties[index % Math.max(currentData.properties.length, 1)]?.title || request.proposal,
                status: request.status === "Nuova" ? "Qualificata" : request.status,
                updatedAt: nowLabel(),
              })),
            }),
            "Matching automatico aggiornato su tutte le richieste.",
          )
        }
      >
        <DataTable
          columns={["Cliente", "Richiesta", "Zona", "Match", "Proposta"]}
          rows={rows.map((item) => [
            item.client,
            item.target,
            item.area,
            item.match,
            item.proposal,
          ])}
          actions={[
            {
              label: "Visita",
              onClick: (rowIndex) => {
                const request = rows[rowIndex];
                if (!request) {
                  return;
                }
                onCommit(
                  (currentData) => ({
                    ...currentData,
                    requests: currentData.requests.map((item) =>
                      item.id === request.id
                        ? { ...item, status: "Visita", updatedAt: nowLabel() }
                        : item,
                    ),
                    activities: [
                      createActivity({
                        title: `Visita per ${request.client}`,
                        type: "Visita",
                        contact: request.client,
                        property: request.proposal,
                        note: `Richiesta: ${request.target} - ${request.area}.`,
                        day: "Domani",
                      }),
                      ...currentData.activities,
                    ],
                  }),
                  `Visita pianificata per ${request.client}.`,
                );
              },
            },
          ]}
        />
      </Panel>
      <Panel className={pageKey === "richieste-nuova" ? "span-4 crm-form-panel" : "span-4"} title={pageKey === "richieste-nuova" ? "Nuova richiesta" : "Filtro richieste"}>
        <QuickForm
          button={pageKey === "richieste-nuova" ? "Salva richiesta" : "Applica filtro"}
          fields={pageKey === "richieste-nuova" ? ["Cliente", "Budget", "Zone preferite", "Tipologia"] : searchFilterFields}
          required={pageKey === "richieste-nuova"}
          onSubmit={(values) => {
            if (pageKey !== "richieste-nuova") {
              onAction(`Filtro richieste applicato: ${valuesSummary(values)}.`);
              return;
            }
            const proposal = data.properties[0]?.title || "Da abbinare";
            const newRequest: RequestRecord = {
              id: makeId("request"),
              client: fieldValue(values, "Cliente", "Nuovo cliente"),
              target: `${fieldValue(values, "Tipologia", "Immobile")} entro ${fieldValue(values, "Budget", "budget da definire")}`,
              area: fieldValue(values, "Zone preferite", "Zona da definire"),
              match: proposal === "Da abbinare" ? "0%" : "91%",
              proposal,
              status: "Nuova",
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                requests: [newRequest, ...currentData.requests],
                contacts: currentData.contacts.some((contact) => contact.name === newRequest.client)
                  ? currentData.contacts
                  : [
                      {
                        id: makeId("contact"),
                        name: newRequest.client,
                        type: "Acquirente",
                        status: "Richiesta inserita",
                        source: "Richieste",
                        owner: "Daniele",
                        phone: "",
                        note: newRequest.target,
                        nextStep: "Matching immobili",
                        updatedAt: nowLabel(),
                      },
                      ...currentData.contacts,
                    ],
                activities: [
                  createActivity({
                    title: `Nuova richiesta ${newRequest.client}`,
                    type: "Richiesta",
                    contact: newRequest.client,
                    property: newRequest.proposal,
                    note: `${newRequest.target} - ${newRequest.area}.`,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Richiesta salvata per ${newRequest.client}.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-12" title="Pipeline richieste">
        <div className="pipeline">
          {["Nuove", "Qualificate", "Visita", "Trattativa", "Chiuse"].map((stage, index) => (
            <div key={stage}>
              <span>{stage}</span>
              <strong>{Object.values(pipelineCounts)[index]}</strong>
              <small>{["lead", "schede inviate", "appuntamenti", "negoziazioni", "mese"][index]}</small>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ContactsView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const rows = useFilteredRows(data.contacts, query, (item) =>
    [item.name, item.type, item.status, item.source, item.owner].join(" "),
  );
  const firstVisibleContact = rows[0];

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Clienti"
        page={labelForPage("nominativi", pageKey)}
        path={pathForPage(pageKey)}
        items={["Cliente -> esigenza", "Cliente -> attivita", "Cliente -> immobili proprietario"]}
      />
      {pageKey === "nominativi-richieste" ? (
        <RequestsView pageKey="richieste-elenco" query={query} data={data} onCommit={onCommit} onAction={onAction} />
      ) : (
        <>
      <Panel className="span-8" title="Database clienti" action="Segmenti">
        <DataTable
          columns={["Nome", "Tipo", "Stato", "Provenienza", "Owner"]}
          rows={rows.map((item) => [
            item.name,
            item.type,
            item.status,
            item.source,
            item.owner,
          ])}
          actions={[
            {
              label: "Chiama",
              onClick: (rowIndex) => {
                const contact = rows[rowIndex];
                if (!contact) {
                  return;
                }
                onCommit(
                  (currentData) => ({
                    ...currentData,
                    contacts: currentData.contacts.map((item) =>
                      item.id === contact.id
                        ? { ...item, status: "Telefonata registrata", nextStep: "Follow-up", updatedAt: nowLabel() }
                        : item,
                    ),
                    activities: [
                      createActivity({
                        title: `Telefonata ${contact.name}`,
                        type: "Telefonata",
                        contact: contact.name,
                        note: `Telefonata rapida da anagrafica al numero ${contact.phone || "non indicato"}.`,
                      }),
                      ...currentData.activities,
                    ],
                  }),
                  `Telefonata registrata per ${contact.name}.`,
                );
              },
            },
          ]}
        />
      </Panel>
      <Panel className={pageKey === "nominativi-nuovo" ? "span-4 crm-form-panel" : "span-4"} title={pageKey === "nominativi-nuovo" ? "Nuovo cliente" : "Filtro clienti"}>
        <QuickForm
          button={pageKey === "nominativi-nuovo" ? "Aggiungi cliente" : "Filtra"}
          fields={pageKey === "nominativi-nuovo" ? ["Nome", "Esigenza", "Provenienza", "Telefono"] : searchFilterFields}
          required={pageKey === "nominativi-nuovo"}
          onSubmit={(values) => {
            if (pageKey !== "nominativi-nuovo") {
              onAction(`Filtro clienti applicato: ${valuesSummary(values)}.`);
              return;
            }
            const newContact: ContactRecord = {
              id: makeId("contact"),
              name: fieldValue(values, "Nome", "Nuovo cliente"),
              type: fieldValue(values, "Esigenza", "Da qualificare"),
              status: "Nuovo cliente",
              source: fieldValue(values, "Provenienza", "Manuale"),
              owner: "Daniele",
              phone: fieldValue(values, "Telefono"),
              note: "Inserito manualmente.",
              nextStep: "Primo contatto",
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                contacts: [newContact, ...currentData.contacts],
                activities: [
                  createActivity({
                    title: `Nuovo cliente ${newContact.name}`,
                    type: "Anagrafica",
                    contact: newContact.name,
                    note: `${newContact.type} da ${newContact.source}.`,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Cliente ${newContact.name} aggiunto.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-12" title="Comunicazioni rapide">
        <div className="tool-grid">
          <ToolButton label="Email scheda" Icon={Mail} onClick={() => onCommit((currentData) => ({
            ...currentData,
            activities: [
              createActivity({
                title: `Email scheda ${firstVisibleContact?.name || "contatto"}`,
                type: "Email",
                contact: firstVisibleContact?.name || "",
                property: currentData.properties[0]?.title || "",
                note: "Bozza email scheda preparata.",
              }),
              ...currentData.activities,
            ],
          }), "Bozza email preparata e salvata nello storico.")} />
          <ToolButton label="WhatsApp" Icon={MessageSquareText} onClick={() => onCommit((currentData) => ({
            ...currentData,
            activities: [
              createActivity({
                title: `WhatsApp ${firstVisibleContact?.name || "contatto"}`,
                type: "WhatsApp",
                contact: firstVisibleContact?.name || "",
                note: "Messaggio WhatsApp preparato.",
              }),
              ...currentData.activities,
            ],
          }), "Messaggio WhatsApp preparato.")} />
          <ToolButton label="Telefonata" Icon={PhoneCall} onClick={() => {
            if (!firstVisibleContact) {
              onAction("Nessun cliente disponibile per la telefonata.");
              return;
            }
            onCommit((currentData) => ({
              ...currentData,
              contacts: currentData.contacts.map((contact) =>
                contact.id === firstVisibleContact.id
                  ? { ...contact, status: "Telefonata registrata", updatedAt: nowLabel() }
                  : contact,
              ),
              activities: [
                createActivity({
                  title: `Telefonata ${firstVisibleContact.name}`,
                  type: "Telefonata",
                  contact: firstVisibleContact.name,
                  note: "Telefonata rapida registrata.",
                }),
                ...currentData.activities,
              ],
            }), `Telefonata registrata per ${firstVisibleContact.name}.`);
          }} />
          <ToolButton label="Privacy" Icon={ShieldCheck} onClick={() => onCommit((currentData) => ({
            ...currentData,
            contacts: firstVisibleContact
              ? currentData.contacts.map((contact) =>
                  contact.id === firstVisibleContact.id
                    ? { ...contact, status: "Privacy verificata", updatedAt: nowLabel() }
                    : contact,
                )
              : currentData.contacts,
          }), "Consensi privacy verificati sul cliente selezionato.")} />
        </div>
      </Panel>
        </>
      )}
    </div>
  );
}

function AgendaView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
  resetVersion,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  resetVersion: number;
}) {
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const rows = useFilteredRows(data.activities, query, (item) =>
    [item.time, item.title, item.type, item.owner, item.contact, item.property, item.status, item.note, item.day].join(" "),
  );
  const monthStats = [
    { label: "Attivita mese", value: rows.length, detail: "tutte le attivita registrate" },
    { label: "Telefonate", value: rows.filter((item) => /telefonata/i.test(item.type)).length, detail: "contatti telefonici" },
    { label: "Visite", value: rows.filter((item) => /visita|appuntamento/i.test(item.type)).length, detail: "visite e appuntamenti" },
    { label: "Completate", value: rows.filter((item) => /completata/i.test(item.status)).length, detail: "attivita chiuse" },
  ];

  useEffect(() => {
    if (pageKey === "agenda-calendario") {
      setCalendarMode("week");
    }
  }, [pageKey, resetVersion]);

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Attivita"
        page={labelForPage("agenda", pageKey)}
        path={pathForPage(pageKey)}
        items={["Attivita -> cliente", "Attivita -> immobile", "Agenda -> storico e promemoria"]}
      />
      <Panel className="span-8" title={pageKey === "agenda-storico" ? "Ricerca storico attivita" : "Agenda operativa"}>
        {pageKey === "agenda-storico" ? (
          <DataTable
            columns={["Ora", "Titolo", "Tipo", "Contatto", "Stato"]}
            rows={rows.map((item) => [
              item.time,
              item.title,
              item.type,
              item.contact || "-",
              item.status,
            ])}
            actions={[
              {
                label: "Chiudi",
                onClick: (rowIndex) => {
                  const activity = rows[rowIndex];
                  if (!activity) {
                    return;
                  }
                  onCommit(
                    (currentData) => ({
                      ...currentData,
                      activities: currentData.activities.map((item) =>
                        item.id === activity.id
                          ? { ...item, status: "Completata", updatedAt: nowLabel() }
                          : item,
                      ),
                    }),
                    `Attivita "${activity.title}" completata.`,
                  );
                },
              },
            ]}
          />
        ) : (
          <>
            <div className="agenda-modebar" aria-label="Visualizzazione agenda">
              <button
                className={calendarMode === "week" ? "active" : ""}
                type="button"
                onClick={() => setCalendarMode("week")}
              >
                Settimana
              </button>
              <button
                className={calendarMode === "month" ? "active" : ""}
                type="button"
                onClick={() => setCalendarMode("month")}
              >
                Mese
              </button>
            </div>
            {calendarMode === "week" ? (
              <div className="agenda-board">
                {(["Oggi", "Domani", "Settimana"] as ActivityRecord["day"][]).map((column) => (
                  <div key={column}>
                    <h3>{column}</h3>
                    {rows.filter((item) => item.day === column).length ? (
                      rows.filter((item) => item.day === column).slice(0, 6).map((item) => (
                        <article key={`${column}-${item.id}`}>
                          <span>{item.time}</span>
                          <strong>{item.title}</strong>
                          <small>{item.owner} - {item.type} - {item.status}</small>
                        </article>
                      ))
                    ) : (
                      <EmptyState title="Nessuna attivita" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="month-board">
                {monthStats.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>
      <Panel className={pageKey === "attivita-nuova" ? "span-4 crm-form-panel" : "span-4"} title={pageKey === "attivita-nuova" ? "Nuova attivita" : "Filtro agenda"}>
        <QuickForm
          button={pageKey === "attivita-nuova" ? "Pianifica" : "Cerca"}
          fields={pageKey === "attivita-nuova" ? ["Cliente", "Data e ora", "Luogo", "Immobile"] : searchFilterFields}
          required={pageKey === "attivita-nuova"}
          onSubmit={(values) => {
            if (pageKey !== "attivita-nuova") {
              onAction(`Ricerca agenda eseguita: ${valuesSummary(values)}.`);
              return;
            }
            const client = fieldValue(values, "Cliente", "Cliente da definire");
            const dateTime = fieldValue(values, "Data e ora", currentTimeLabel());
            const newActivity = createActivity({
              time: dateTime,
              title: `Appuntamento ${client}`,
              type: "Appuntamento",
              contact: client,
              property: fieldValue(values, "Immobile"),
              note: fieldValue(values, "Luogo", "Luogo da definire"),
              day: /domani/i.test(dateTime) ? "Domani" : "Oggi",
            });
            onCommit(
              (currentData) => ({
                ...currentData,
                activities: [newActivity, ...currentData.activities],
                contacts: currentData.contacts.map((contact) =>
                  contact.name === client
                    ? { ...contact, status: "Appuntamento pianificato", nextStep: dateTime, updatedAt: nowLabel() }
                    : contact,
                ),
              }),
              `Appuntamento inserito per ${client}.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-12" title="Promemoria automatici">
        <Checklist
          items={["Invio promemoria visita", "Conferma appuntamento", "Follow-up post visita", "Aggiorna storico cliente"]}
        />
      </Panel>
    </div>
  );
}

function MarketingView({
  data,
  onCommit,
}: {
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Pubblicita"
        page="Pubblicita"
        path="/pubblicita"
        items={["Immobile -> pubblicazione", "Pubblicazione -> portale", "Lead -> contatto pubblicita"]}
      />
      <Panel
        className="span-7"
        title="Pubblicazioni e portali"
        action="Sincronizza"
        onPanelAction={() =>
          onCommit(
            (currentData) => ({
              ...currentData,
              marketingChannels: currentData.marketingChannels.map((channel) => ({
                ...channel,
                status: `${channel.name} sincronizzato`,
                progress: Math.min(100, Math.max(channel.progress, 92)),
                updatedAt: nowLabel(),
              })),
            }),
            "Pubblicazioni e portali sincronizzati.",
          )
        }
      >
        <div className="channel-list">
          {data.marketingChannels.length ? (
            data.marketingChannels.map((channel) => (
              <div key={channel.name}>
                <span>
                  <strong>{channel.name}</strong>
                  <small>{channel.status} - {channel.updatedAt}</small>
                </span>
                <i>
                  <b style={{ width: `${channel.progress}%` }} />
                </i>
              </div>
            ))
          ) : (
            <EmptyState title="Nessuna pubblicazione" text="Prepara una campagna o crea una scheda immobile per iniziare." />
          )}
        </div>
      </Panel>
      <Panel className="span-5" title="Campagna rapida">
        <QuickForm
          button="Prepara campagna"
          fields={["Immobile", "Canale", "Budget"]}
          onSubmit={(values) => {
            const channelName = fieldValue(values, "Canale", "Campagna custom");
            const property = fieldValue(values, "Immobile", data.properties[0]?.title || "Immobile da definire");
            const newChannel: MarketingChannelRecord = {
              id: makeId("channel"),
              name: channelName,
              status: `Campagna per ${property} - budget ${fieldValue(values, "Budget", "da definire")}`,
              progress: 10,
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                marketingChannels: [newChannel, ...currentData.marketingChannels],
                activities: [
                  createActivity({
                    title: `Campagna ${channelName}`,
                    type: "Marketing",
                    property,
                    note: newChannel.status,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Campagna ${channelName} preparata.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-12" title="Materiali di vetrina">
        <div className="tool-grid">
          <ToolButton label="Cartello con QR" Icon={GalleryVerticalEnd} onClick={() => onCommit((currentData) => ({
            ...currentData,
            activities: [
              createActivity({
                title: "Cartello con QR pronto",
                type: "Marketing",
                property: currentData.properties[0]?.title || "",
                note: "Materiale vetrina generato.",
              }),
              ...currentData.activities,
            ],
          }), "Cartello con QR pronto.")} />
          <ToolButton label="Scheda PDF" Icon={FileBadge} onClick={() => onCommit((currentData) => ({
            ...currentData,
            activities: [
              createActivity({
                title: "Scheda PDF generata",
                type: "Documento",
                property: currentData.properties[0]?.title || "",
                note: "Scheda commerciale esportata.",
              }),
              ...currentData.activities,
            ],
          }), "Scheda PDF generata.")} />
          <ToolButton label="Multi sito" Icon={Globe2} onClick={() => onCommit((currentData) => ({
            ...currentData,
            marketingChannels: currentData.marketingChannels.map((channel) =>
              channel.name === "Sito agenzia"
                ? { ...channel, status: "Multi sito aggiornato ora", progress: 100, updatedAt: nowLabel() }
                : channel,
            ),
          }), "Multi sito aggiornato.")} />
          <ToolButton label="Report lead" Icon={BarChart3} onClick={() => onCommit((currentData) => ({
            ...currentData,
            activities: [
              createActivity({
                title: "Report lead aggiornato",
                type: "Report",
                note: `${currentData.contacts.length} clienti analizzati.`,
              }),
              ...currentData.activities,
            ],
          }), "Report lead aggiornato.")} />
        </div>
      </Panel>
    </div>
  );
}

function AdvertisingContactsView({
  pageKey,
  query,
  data,
  onCommit,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const leadContacts = data.contacts.filter((contact) =>
    /portale|sito|campagna/i.test(contact.source) || /lead pubblicitario/i.test(contact.status),
  );
  const rows = useFilteredRows(leadContacts, query, (contact) =>
    [contact.name, contact.type, contact.status, contact.source, contact.note, contact.nextStep].join(" "),
  );

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Contatti Pubblicita"
        page={labelForPage("contattiPubblicita", pageKey)}
        path={pathForPage(pageKey)}
        items={["Lead -> nominativo", "Lead -> richiesta", "Lead -> attivita di ricontatto"]}
      />
      <Panel className="span-8" title="Contatti pubblicitari">
        <DataTable
          columns={["Contatto", "Interesse", "Stato", "Provenienza"]}
          rows={rows.map((contact) => [
            contact.name,
            contact.note || contact.type,
            contact.status,
            contact.source,
          ])}
          actions={[
            {
              label: "Converti",
              onClick: (rowIndex) => {
                const contact = rows[rowIndex];
                if (!contact) {
                  return;
                }
                const proposal = data.properties[0]?.title || "Da abbinare";
                onCommit(
                  (currentData) => ({
                    ...currentData,
                    contacts: currentData.contacts.map((item) =>
                      item.id === contact.id
                        ? { ...item, status: "Convertito in nominativo", nextStep: "Creare richiesta", updatedAt: nowLabel() }
                        : item,
                    ),
                    requests: [
                      {
                        id: makeId("request"),
                        client: contact.name,
                        target: contact.type || "Richiesta da lead",
                        area: "Da qualificare",
                        match: proposal === "Da abbinare" ? "0%" : "87%",
                        proposal,
                        status: "Nuova",
                        updatedAt: nowLabel(),
                      },
                      ...currentData.requests,
                    ],
                  }),
                  `Lead ${contact.name} convertito in nominativo e richiesta.`,
                );
              },
            },
          ]}
        />
      </Panel>
      <Panel className="span-4" title={pageKey === "contatti-p-nuovo" ? "Nuovo contatto pubblicita" : "Qualifica lead"}>
        <QuickForm
          button={pageKey === "contatti-p-nuovo" ? "Salva lead" : "Converti"}
          fields={["Nome contatto", "Provenienza", "Immobile richiesto", "Nota"]}
          onSubmit={(values) => {
            const name = fieldValue(values, "Nome contatto", "Lead pubblicitario");
            const property = fieldValue(values, "Immobile richiesto", data.properties[0]?.title || "Da abbinare");
            const newContact: ContactRecord = {
              id: makeId("contact"),
              name,
              type: property,
              status: pageKey === "contatti-p-nuovo" ? "Lead pubblicitario" : "Convertito in nominativo",
              source: fieldValue(values, "Provenienza", "Portale"),
              owner: "Daniele",
              phone: "",
              note: fieldValue(values, "Nota", "Lead da qualificare"),
              nextStep: "Ricontatto commerciale",
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                contacts: [newContact, ...currentData.contacts],
                activities: [
                  createActivity({
                    title: `Lead pubblicitario ${name}`,
                    type: "Lead",
                    contact: name,
                    property,
                    note: newContact.note,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Lead pubblicitario ${name} salvato.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-12" title="Flusso presa in carico">
        <WorkflowSteps steps={["Ricezione lead", "Qualifica", "Crea nominativo", "Crea richiesta", "Agenda ricontatto"]} />
      </Panel>
    </div>
  );
}

function CensusView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const censusAreas = useFilteredRows(data.censusAreas, query, (area) =>
    [area.zone, String(area.buildings), String(area.contacts), area.updatedAt].join(" "),
  );
  const savedCensusStreets = data.censusStreets ?? [];
  const savedCensusComplexes = data.censusComplexes ?? [];
  const censusStreets = useFilteredRows(savedCensusStreets, query, (street) =>
    [street.zone, street.street, String(street.complexes)].join(" "),
  );
  const censusComplexes = useFilteredRows(savedCensusComplexes, query, (complex) =>
    [complex.zone, complex.street, complex.name, String(complex.units), String(complex.owners)].join(" "),
  );
  const censusOwners = useFilteredRows(
    data.contacts.filter((contact) => /proprietario/i.test(contact.type) || contact.source === "Censimento"),
    query,
    (contact) => [contact.name, contact.type, contact.status, contact.note, contact.phone].join(" "),
  );
  const ownersTotal = data.contacts.filter((contact) => /proprietario/i.test(contact.type) || contact.source === "Censimento").length;
  const phaseCards = [
    {
      label: "1. Zona",
      value: data.censusAreas.length,
      text: "Crea o seleziona il territorio di riferimento.",
    },
    {
      label: "2. Via",
      value: savedCensusStreets.length,
      text: "Collega la via alla zona corretta.",
    },
    {
      label: "3. Complesso",
      value: savedCensusComplexes.length,
      text: "Inserisci il palazzo dentro la via scelta.",
    },
    {
      label: "4. Proprietari",
      value: ownersTotal,
      text: "Gestisci clienti che diventano proprietari degli immobili.",
    },
  ];
  const pageTitle =
    pageKey === "censimento-vie"
      ? "Vie censite"
      : pageKey === "censimento-complessi"
        ? "Complessi e palazzi"
        : pageKey === "censimento-proprietari"
          ? "Proprietari immobili"
          : "Zone censite";
  const formTitle =
    pageKey === "censimento-vie"
      ? "Crea o seleziona via"
      : pageKey === "censimento-complessi"
        ? "Crea o seleziona complesso"
        : pageKey === "censimento-proprietari"
          ? "Collega proprietario"
          : "Crea o seleziona zona";
  const formFields =
    pageKey === "censimento-vie"
      ? ["Zona", "Via"]
      : pageKey === "censimento-complessi"
        ? ["Zona", "Via", "Palazzo / Complesso", "Unita"]
        : pageKey === "censimento-proprietari"
          ? ["Zona", "Via", "Complesso", "Proprietario", "Telefono", "Immobile collegato"]
          : ["Zona"];
  const tableColumns =
    pageKey === "censimento-vie"
      ? ["Zona", "Via", "Complessi", "Aggiornato"]
      : pageKey === "censimento-complessi"
        ? ["Zona", "Via", "Complesso", "Unita", "Proprietari"]
        : pageKey === "censimento-proprietari"
          ? ["Proprietario", "Tipo", "Percorso", "Telefono", "Stato"]
          : ["Zona", "Vie/Palazzi", "Proprietari", "Aggiornato"];
  const tableRows =
    pageKey === "censimento-vie"
      ? censusStreets.map((street) => [street.zone, street.street, String(street.complexes), street.updatedAt])
      : pageKey === "censimento-complessi"
        ? censusComplexes.map((complex) => [
            complex.zone,
            complex.street,
            complex.name,
            String(complex.units || "-"),
            String(complex.owners),
          ])
        : pageKey === "censimento-proprietari"
          ? censusOwners.map((owner) => [
              owner.name,
              owner.type,
              owner.note || "-",
              owner.phone || "-",
              owner.status,
            ])
          : censusAreas.map((area) => [
              area.zone,
              String(area.buildings),
              String(area.contacts),
              area.updatedAt,
            ]);

  function ensureArea(
    areas: CensusAreaRecord[],
    zone: string,
    contactDelta = 0,
    buildingDelta = 0,
  ) {
    const existing = areas.some((area) => sameLabel(area.zone, zone));
    if (!existing) {
      return [
        {
          id: makeId("area"),
          zone,
          buildings: Math.max(0, buildingDelta),
          contacts: Math.max(0, contactDelta),
          updatedAt: nowLabel(),
        },
        ...areas,
      ];
    }

    return areas.map((area) =>
      sameLabel(area.zone, zone)
        ? {
            ...area,
            buildings: Math.max(0, area.buildings + buildingDelta),
            contacts: Math.max(0, area.contacts + contactDelta),
            updatedAt: nowLabel(),
          }
        : area,
    );
  }

  function ensureStreet(streets: CensusStreetRecord[], zone: string, street: string, complexDelta = 0) {
    const existing = streets.some((item) => sameLabel(item.zone, zone) && sameLabel(item.street, street));
    if (!existing) {
      return [
        {
          id: makeId("street"),
          zone,
          street,
          complexes: Math.max(0, complexDelta),
          updatedAt: nowLabel(),
        },
        ...streets,
      ];
    }

    return streets.map((item) =>
      sameLabel(item.zone, zone) && sameLabel(item.street, street)
        ? {
            ...item,
            complexes: Math.max(0, item.complexes + complexDelta),
            updatedAt: nowLabel(),
          }
        : item,
    );
  }

  function ensureComplex(
    complexes: CensusComplexRecord[],
    zone: string,
    street: string,
    name: string,
    units = 0,
    ownerDelta = 0,
  ) {
    const existing = complexes.some(
      (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, name),
    );
    if (!existing) {
      return [
        {
          id: makeId("complex"),
          zone,
          street,
          name,
          units,
          owners: Math.max(0, ownerDelta),
          updatedAt: nowLabel(),
        },
        ...complexes,
      ];
    }

    return complexes.map((item) =>
      sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, name)
        ? {
            ...item,
            units: units > 0 ? units : item.units,
            owners: Math.max(0, item.owners + ownerDelta),
            updatedAt: nowLabel(),
          }
        : item,
    );
  }

  function linkOwnerToProperty(properties: PropertyRecord[], propertyLabel: string, zone: string, ownerName: string) {
    if (!propertyLabel) {
      return properties;
    }

    const existing = properties.some((property) => sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel));
    if (!existing) {
      return [
        {
          id: makeId("property"),
          code: `FS-${String(250 + properties.length).padStart(3, "0")}`,
          title: propertyLabel,
          zone,
          status: "Censito",
          price: "Da valutare",
          owner: ownerName,
          portals: "Privato",
          kind: "vendita",
          updatedAt: nowLabel(),
        },
        ...properties,
      ];
    }

    return properties.map((property) =>
      sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel)
        ? {
            ...property,
            owner: appendOwnerLabel(property.owner, ownerName),
            status: "Proprietario collegato",
            updatedAt: nowLabel(),
          }
        : property,
    );
  }

  function saveCensus(values: Record<string, string>) {
    const zone = fieldValue(values, "Zona", "Zona da definire");
    const street = fieldValue(values, "Via", "Via da definire");
    const complexName = fieldValue(values, "Palazzo / Complesso") || fieldValue(values, "Complesso", "Complesso da definire");
    const unitsValue = Number.parseInt(fieldValue(values, "Unita", "0"), 10);
    const units = Number.isFinite(unitsValue) && unitsValue > 0 ? unitsValue : 0;

    if (pageKey === "censimento-zone") {
      onCommit(
        (currentData) => ({
          ...currentData,
          censusAreas: ensureArea(currentData.censusAreas, zone),
        }),
        `Zona ${zone} salvata.`,
      );
      return;
    }

    if (pageKey === "censimento-vie") {
      onCommit(
        (currentData) => ({
          ...currentData,
          censusAreas: ensureArea(currentData.censusAreas, zone),
          censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street),
        }),
        `Via ${street} collegata alla zona ${zone}.`,
      );
      return;
    }

    if (pageKey === "censimento-complessi") {
      onCommit(
        (currentData) => {
          const complexExists = (currentData.censusComplexes ?? []).some(
            (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, complexName),
          );
          const complexDelta = complexExists ? 0 : 1;
          return {
            ...currentData,
            censusAreas: ensureArea(currentData.censusAreas, zone, 0, complexDelta),
            censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street, complexDelta),
            censusComplexes: ensureComplex(currentData.censusComplexes ?? [], zone, street, complexName, units),
          };
        },
        `Complesso ${complexName} salvato in ${street}.`,
      );
      return;
    }

    const ownerName = fieldValue(values, "Proprietario", "Proprietario da definire");
    const phone = fieldValue(values, "Telefono");
    const propertyLabel = fieldValue(values, "Immobile collegato");
    const ownerPath = `Zona: ${zone} / Via: ${street} / Complesso: ${complexName}`;

    onCommit(
      (currentData) => {
        const linkedAlready = currentData.contacts.some(
          (contact) =>
            sameLabel(contact.name, ownerName) &&
            /proprietario/i.test(contact.type) &&
            contact.note.toLowerCase().includes(complexName.toLowerCase()),
        );
        const ownerDelta = linkedAlready ? 0 : 1;
        const complexExists = (currentData.censusComplexes ?? []).some(
          (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, complexName),
        );
        const complexDelta = complexExists ? 0 : 1;
        const contactExists = currentData.contacts.some((contact) => sameLabel(contact.name, ownerName));
        const updatedContacts = contactExists
          ? currentData.contacts.map((contact) =>
              sameLabel(contact.name, ownerName)
                ? {
                    ...contact,
                    type: /proprietario/i.test(contact.type) ? contact.type : `${contact.type} / Proprietario`,
                    status: "Proprietario collegato",
                    phone: phone || contact.phone,
                    note: ownerPath,
                    nextStep: propertyLabel ? `Collegato a ${propertyLabel}` : "Associare immobile",
                    updatedAt: nowLabel(),
                  }
                : contact,
            )
          : [
              {
                id: makeId("contact"),
                name: ownerName,
                type: "Proprietario",
                status: "Proprietario censito",
                source: "Censimento",
                owner: "Daniele",
                phone,
                note: ownerPath,
                nextStep: propertyLabel ? `Collegato a ${propertyLabel}` : "Associare immobile",
                updatedAt: nowLabel(),
              },
              ...currentData.contacts,
            ];

        return {
          ...currentData,
          contacts: updatedContacts,
          properties: linkOwnerToProperty(currentData.properties, propertyLabel, zone, ownerName),
          censusAreas: ensureArea(currentData.censusAreas, zone, ownerDelta, complexDelta),
          censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street, complexDelta),
          censusComplexes: ensureComplex(currentData.censusComplexes ?? [], zone, street, complexName, 0, ownerDelta),
          activities: [
            createActivity({
              title: `Proprietario ${ownerName}`,
              type: "Censimento",
              contact: ownerName,
              property: propertyLabel,
              note: ownerPath,
            }),
            ...currentData.activities,
          ],
        };
      },
      propertyLabel
        ? `${ownerName} collegato come proprietario a ${propertyLabel}.`
        : `${ownerName} salvato come proprietario censito.`,
    );
  }

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Censimento"
        page={labelForPage("censimento", pageKey)}
        path={pathForPage(pageKey)}
        items={["Zona -> Via", "Via -> Complesso", "Complesso -> Proprietari", "Cliente collegato a immobile -> Proprietario"]}
      />

      <Panel className="span-12" title="Fasi censimento">
        <div className="census-phase-grid">
          {phaseCards.map((phase, index) => (
            <article className={index === modulePages.censimento.findIndex((page) => page.key === pageKey) ? "active" : ""} key={phase.label}>
              <span>{phase.label}</span>
              <strong>{phase.value}</strong>
              <small>{phase.text}</small>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        className="span-8"
        title={pageTitle}
        action="Selezione"
        onPanelAction={() => onAction("Usa la tabella per controllare il livello corrente del censimento.")}
      >
        <DataTable
          columns={tableColumns}
          rows={tableRows}
          actions={[
            {
              label: pageKey === "censimento-proprietari" ? "Agenda" : "Apri",
              onClick: (rowIndex) => {
                if (pageKey === "censimento-proprietari") {
                  const owner = censusOwners[rowIndex];
                  if (!owner) {
                    return;
                  }
                  onCommit(
                    (currentData) => ({
                      ...currentData,
                      activities: [
                        createActivity({
                          title: `Ricontatto proprietario ${owner.name}`,
                          type: "Censimento",
                          contact: owner.name,
                          note: owner.note,
                          day: "Domani",
                        }),
                        ...currentData.activities,
                      ],
                    }),
                    `Ricontatto proprietario fissato per ${owner.name}.`,
                  );
                  return;
                }
                const selected = tableRows[rowIndex]?.slice(0, 3).filter(Boolean).join(" / ");
                onAction(selected ? `Selezionato: ${selected}.` : "Elemento censimento selezionato.");
              },
            },
          ]}
        />
      </Panel>
      <Panel className="span-4 crm-form-panel" title={formTitle}>
        <QuickForm
          button="Salva"
          fields={formFields}
          required
          onSubmit={saveCensus}
        />
      </Panel>

      <Panel className="span-12" title="Mappa censimento">
        {data.censusAreas.length ? (
          <div className="map-strip">
            {data.censusAreas.map((area) => (
              <button key={area.zone} type="button" onClick={() => onAction(`Zona ${area.zone} selezionata.`)}>
                <MapPinned size={18} />
                <strong>{area.zone}</strong>
                <span>{area.buildings} palazzi / {area.contacts} proprietari</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="Nessuna zona censita" text="Crea la prima zona per iniziare il censimento gerarchico." />
        )}
      </Panel>
    </div>
  );
}

function GoalsView({ query, data, onCommit }: { query: string; data: CrmData; onCommit: CrmCommit }) {
  const rows = useFilteredRows(data.goals, query, (goal) =>
    [goal.label, goal.owner, String(goal.current), String(goal.target), goal.updatedAt].join(" "),
  );

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Obiettivi"
        page="Elenco"
        path="/obiettivi"
        items={["Obiettivo -> periodo", "Obiettivo -> operatore", "Obiettivo -> cruscotto Start"]}
      />
      <Panel className="span-8" title="Obiettivi agenzia" action="Mese corrente">
        <div className="goal-stack">
          {rows.length ? (
            rows.map((goal) => (
              <ProgressLine
                current={goal.current}
                key={goal.label}
                label={goal.label}
                target={goal.target}
              />
            ))
          ) : (
            <EmptyState title="Nessun obiettivo" text="Crea il primo target operativo per iniziare a misurare il lavoro." />
          )}
        </div>
      </Panel>
      <Panel className="span-4" title="Nuovo obiettivo">
        <QuickForm
          button="Crea obiettivo"
          fields={["Titolo", "Target", "Responsabile"]}
          onSubmit={(values) => {
            const target = Number.parseInt(fieldValue(values, "Target", "1"), 10);
            const newGoal: GoalRecord = {
              id: makeId("goal"),
              label: fieldValue(values, "Titolo", "Nuovo obiettivo"),
              current: 0,
              target: Number.isFinite(target) && target > 0 ? target : 1,
              owner: fieldValue(values, "Responsabile", "Team Fenix"),
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                goals: [newGoal, ...currentData.goals],
              }),
              `Obiettivo "${newGoal.label}" creato.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-12" title="Classifica operativa">
        {rows.length ? (
          <div className="pipeline">
            {rows.slice(0, 4).map((goal) => (
              <div key={goal.id}>
                <span>{goal.label}</span>
                <strong>{goal.current}</strong>
                <small>{goal.owner} / target {goal.target}</small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Classifica vuota" text="Gli obiettivi creati compariranno qui con avanzamento e responsabile." />
        )}
      </Panel>
    </div>
  );
}

function UtilitiesView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const logRows = useFilteredRows(data.activityLog, query, (item) => item);

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Utilita"
        page={labelForPage("utilita", pageKey)}
        path={pathForPage(pageKey)}
        items={["Preferenze -> interfaccia", "Backup -> archivio", "Portali -> esportazioni"]}
      />
      <Panel className="span-6" title="Strumenti collegati">
        <div className="tool-grid compact-tools">
          {externalTools.map((tool) => (
            <a className="tool-button" href={tool.href} key={tool.title}>
              <tool.Icon size={20} />
              <span>{tool.title}</span>
              <ArrowUpRight size={15} />
            </a>
          ))}
        </div>
      </Panel>
      <Panel className="span-6" title="Import export">
        <div className="tool-grid">
          <ToolButton label={pageKey === "utilita-portali" ? "Esporta portali" : "Importa Excel"} Icon={UploadCloud} onClick={() => {
            if (pageKey === "utilita-portali") {
              downloadCrmData({
                ...data,
                properties: data.properties.filter((property) => property.portals !== "Privato"),
              });
              onCommit((currentData) => currentData, "Esportazione portali scaricata in JSON.");
              return;
            }
            onAction("Import Excel pronto: in questa versione locale i dati si inseriscono dai form modulo.");
          }} />
          <ToolButton label={pageKey === "utilita-backup" ? "Nuova copia" : "Backup dati"} Icon={DatabaseBackup} onClick={() => {
            downloadCrmData(data);
            onCommit((currentData) => currentData, "Backup dati scaricato.");
          }} />
          <ToolButton label="Pulizia duplicati" Icon={ListChecks} onClick={() => onCommit((currentData) => {
            const known = new Set<string>();
            const contactsWithoutDuplicates = currentData.contacts.filter((contact) => {
              const signature = `${contact.name.toLowerCase()}-${contact.phone}`;
              if (known.has(signature)) {
                return false;
              }
              known.add(signature);
              return true;
            });
            return {
              ...currentData,
              contacts: contactsWithoutDuplicates,
            };
          }, "Pulizia duplicati completata sui clienti.")} />
          <ToolButton label="Log attivita" Icon={ClipboardCheck} onClick={() => onAction(`${data.activityLog.length} operazioni presenti nello storico locale.`)} />
        </div>
      </Panel>
      <Panel className="span-12" title="Procedure rapide">
        <Checklist
          items={["Verifica portali", "Scarica archivio", "Controlla privacy", "Aggiorna report mensile"]}
        />
      </Panel>
      <Panel className="span-12" title="Log attivita">
        <div className="compact-list">
          {logRows.length ? (
            logRows.slice(0, 10).map((item) => (
              <div key={item}>
                <span>Operazione</span>
                <strong>{item}</strong>
                <small>Archivio locale Fenix Suite</small>
              </div>
            ))
          ) : (
            <EmptyState title="Nessuna operazione" text="Salvataggi, esportazioni e aggiornamenti verranno registrati qui." />
          )}
        </div>
      </Panel>
    </div>
  );
}

function AccountsView({
  accounts,
  currentUser,
  onAccountsChange,
  onAction,
}: {
  accounts: AccountRecord[];
  currentUser: SessionUser;
  onAccountsChange: (updater: (accountList: AccountRecord[]) => AccountRecord[], message: string) => void;
  onAction: (message: string) => void;
}) {
  const [accountError, setAccountError] = useState("");
  const manager = canManageAccounts(currentUser);
  const developer = canUseDeveloperTools(currentUser);
  const fullOverride = hasOwnerOverride(currentUser);
  const currentAccount = accounts.find((account) => account.id === currentUser.id);
  const availableRoles = getAssignableRoles(currentUser);
  const defaultNewRole = availableRoles.includes("AGENTE") ? "AGENTE" : availableRoles[0] ?? "TELEFONISTA";

  function canManageTarget(account: AccountRecord) {
    if (!manager) {
      return false;
    }
    if (fullOverride || currentUser.role === "TITOLARE") {
      return true;
    }
    if (currentUser.role === "ASSOCIATO") {
      return isManagedByCurrentUser(account, currentUser) && account.role !== "TITOLARE" && account.id !== currentUser.id;
    }
    if (currentUser.role === "COORDINATORE/TRICE") {
      return isManagedByCurrentUser(account, currentUser) && account.role === "TELEFONISTA" && account.id !== currentUser.id;
    }
    return false;
  }

  function roleChoicesForAccount(account: AccountRecord) {
    if (!canManageTarget(account) || account.id === currentUser.id) {
      return [account.role];
    }

    return availableRoles.includes(account.role)
      ? availableRoles
      : [account.role, ...availableRoles];
  }

  function canMaintainTarget(account: AccountRecord) {
    if (!developer) {
      return false;
    }
    return fullOverride || account.role !== "TITOLARE";
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const name = String(form.get("name") || "").trim();
    const role = String(form.get("role") || "");
    const password = String(form.get("password") || "");

    if (!email || !name || !password || !isValidRole(role)) {
      setAccountError("Completa nome, email, ruolo e password.");
      return;
    }

    if (!isFenixEmail(email)) {
      setAccountError("Usa solo email aziendali che terminano con @grfenix.com.");
      return;
    }

    if (!availableRoles.includes(role)) {
      setAccountError("Il tuo ruolo non consente di assegnare questo permesso.");
      return;
    }

    if (accounts.some((account) => account.email === email)) {
      setAccountError("Esiste gia un account con questa email.");
      return;
    }

    const newAccount: AccountRecord = {
      id: makeId("account"),
      name,
      email,
      passwordHash: await sha256Hex(password),
      role,
      status: "Attivo",
      managerId: currentUser.id,
      updatedAt: nowLabel(),
    };

    onAccountsChange(
      (currentAccounts) => [newAccount, ...currentAccounts],
      `Account ${name} creato con ruolo ${role}.`,
    );
    event.currentTarget.reset();
  }

  function changeRole(account: AccountRecord, role: UserRole) {
    if (!canManageTarget(account) || account.id === currentUser.id) {
      onAction("Non puoi modificare il ruolo di questo account.");
      return;
    }
    onAccountsChange(
      (currentAccounts) =>
        currentAccounts.map((item) =>
          item.id === account.id ? { ...item, role, updatedAt: nowLabel() } : item,
        ),
      `Ruolo aggiornato per ${account.name}.`,
    );
  }

  function toggleStatus(account: AccountRecord) {
    if (!canManageTarget(account) && !canMaintainTarget(account)) {
      onAction("Non puoi modificare lo stato di questo account.");
      return;
    }
    if (account.id === currentUser.id) {
      onAction("Non puoi sospendere l'account con cui sei collegato.");
      return;
    }
    const nextStatus: AccountStatus = account.status === "Attivo" ? "Sospeso" : "Attivo";
    onAccountsChange(
      (currentAccounts) =>
        currentAccounts.map((item) =>
          item.id === account.id ? { ...item, status: nextStatus, updatedAt: nowLabel() } : item,
        ),
      `Account ${account.name} impostato su ${nextStatus}.`,
    );
  }

  async function resetPassword(account: AccountRecord) {
    if (!canManageTarget(account) && !canMaintainTarget(account)) {
      onAction("Non puoi resettare la password di questo account.");
      return;
    }
    const temporaryPassword = "Fenix2026!";
    const passwordHash = await sha256Hex(temporaryPassword);
    onAccountsChange(
      (currentAccounts) =>
        currentAccounts.map((item) =>
          item.id === account.id ? { ...item, passwordHash, status: "Attivo", updatedAt: nowLabel() } : item,
        ),
      `Password provvisoria per ${account.name}: ${temporaryPassword}`,
    );
  }

  function deleteAccount(account: AccountRecord) {
    if (!canManageTarget(account) || account.id === currentUser.id) {
      onAction("Non puoi eliminare questo account.");
      return;
    }
    onAccountsChange(
      (currentAccounts) => currentAccounts.filter((item) => item.id !== account.id),
      `Account ${account.name} eliminato.`,
    );
  }

  function repairAccounts() {
    onAccountsChange(
      (currentAccounts) => {
        const knownEmails = new Set<string>();
        const repaired = currentAccounts
          .filter((account) => {
            if (knownEmails.has(account.email)) {
              return false;
            }
            knownEmails.add(account.email);
            return true;
          })
          .map((account) =>
            account.email === defaultAccount.email
              ? { ...account, role: "SVILUPPATORE", status: "Attivo", updatedAt: nowLabel() }
              : account,
          );
        return repaired.some((account) => account.email === defaultAccount.email)
          ? repaired
          : [defaultAccount, ...repaired];
      },
      "Controllo tecnico account completato.",
    );
  }

  return (
    <div className="workspace-grid">
      <Panel className="span-12 account-permission-banner" title="Profilo account">
        <div className="permission-list">
          <span>
            <ShieldCheck size={18} />
            Ruolo collegato: <strong>{currentUser.role}</strong>
          </span>
          <span>
            <BadgeCheck size={18} />
            Stato account: <strong>{currentAccount?.status ?? "Attivo"}</strong>
          </span>
          {developer ? (
            <span>
              <Wrench size={18} />
              Manutenzione tecnica: <strong>abilitata</strong>
            </span>
          ) : null}
        </div>
      </Panel>

      {manager ? (
        <Panel className="span-5" title="Crea account">
          <form className="account-form" onSubmit={(event) => void createAccount(event)}>
            <label>
              Nome account
              <input name="name" required placeholder="Nome e cognome" />
            </label>
            <label>
              Email
              <input name="email" required type="email" placeholder="nome@grfenix.com" />
            </label>
            <label>
              Ruolo
              <select name="role" defaultValue={defaultNewRole}>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Password provvisoria
              <input name="password" required type="password" placeholder="Password iniziale" />
            </label>
            {accountError ? <p className="login-error">{accountError}</p> : null}
            <button type="submit">
              <Plus size={17} />
              Crea account
            </button>
          </form>
        </Panel>
      ) : (
        <Panel className="span-5" title="Account">
          <EmptyState
            title="Gestione non disponibile"
            text="Il tuo ruolo puo usare il CRM, ma non puo creare o modificare altri account."
          />
        </Panel>
      )}

      <Panel className="span-7" title="Account registrati">
        <div className="account-list">
          {accounts.map((account) => {
            const isSelf = account.id === currentUser.id;
            const editable = canManageTarget(account);
            const maintainable = canMaintainTarget(account);
            const roleDisabled = !editable || isSelf;
            return (
              <article className={isSelf ? "account-row current" : "account-row"} key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <small>{account.email}</small>
                  <span>{account.status} / {account.role}</span>
                </div>
                <select
                  aria-label={`Ruolo ${account.name}`}
                  disabled={roleDisabled}
                  value={account.role}
                  onChange={(event) => changeRole(account, event.target.value as UserRole)}
                >
                  {roleChoicesForAccount(account).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <div className="account-actions">
                  <button type="button" disabled={isSelf || (!editable && !maintainable)} onClick={() => toggleStatus(account)}>
                    {account.status === "Attivo" ? "Sospendi" : "Riattiva"}
                  </button>
                  <button type="button" disabled={isSelf || (!editable && !maintainable)} onClick={() => void resetPassword(account)}>
                    Reset
                  </button>
                  <button type="button" disabled={!editable || isSelf} onClick={() => deleteAccount(account)}>
                    Elimina
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      {developer ? (
        <Panel className="span-12" title="Manutenzione tecnica">
          <div className="tool-grid">
            <ToolButton label="Ripara account" Icon={RefreshCcwDot} onClick={repairAccounts} />
            <ToolButton
              label="Controllo sito"
              Icon={Wrench}
              onClick={() => onAction("Controllo sito completato: routing, sessione e ruoli disponibili.")}
            />
            <ToolButton
              label="Backup account"
              Icon={DatabaseBackup}
              onClick={() => {
                const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `fenix-suite-account-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.append(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                onAction("Backup account scaricato.");
              }}
            />
          </div>
        </Panel>
      ) : null}

      <Panel className="span-12" title="Regole ruoli">
        <div className="role-grid">
          {roleOptions.map((role) => (
            <article key={role}>
              <strong>{role}</strong>
              <small>{roleDescriptions[role]}</small>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SettingsView({ pageKey, query, onCommit }: { pageKey: string; query: string; onCommit: CrmCommit }) {
  const settingLabel = labelForPage("impostazioni", pageKey);
  const settingRows = [
    [settingLabel, "Attivo", "Globale", "Modificabile"],
    [`${settingLabel} vendita`, "Attivo", "Vendite", "Modificabile"],
    [`${settingLabel} locazione`, "In verifica", "Affitti", "Bloccato"],
  ];
  const rows = useFilteredRows(settingRows, query, (row) => row.join(" "));

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Impostazioni"
        page={settingLabel}
        path={pathForPage(pageKey)}
        items={["Configurazione -> schede", "Configurazione -> filtri", "Configurazione -> automatismi"]}
      />
      <Panel className="span-5" title="Profilo account">
        <div className="profile-card">
          <span>
            <UserRound size={24} />
          </span>
          <strong>Daniele Marangoni</strong>
          <small>Amministratore Fenix Suite</small>
          <button type="button" onClick={() => onCommit((data) => data, "Profilo account aggiornato.")}>
            Aggiorna profilo
          </button>
        </div>
      </Panel>
      <Panel className="span-7" title={settingLabel}>
        <DataTable columns={["Voce", "Stato", "Ambito", "Permesso"]} rows={rows} />
      </Panel>
      <Panel className="span-12" title="Automazioni">
        <div className="tool-grid">
          <ToolButton label="Backup automatico" Icon={DatabaseBackup} onClick={() => onCommit((data) => data, "Backup automatico attivato.")} />
          <ToolButton label="Notifiche agenda" Icon={CalendarCheck2} onClick={() => onCommit((data) => data, "Notifiche agenda aggiornate.")} />
          <ToolButton label="Sync portali" Icon={RefreshCcwDot} onClick={() => onCommit((data) => ({
            ...data,
            marketingChannels: data.marketingChannels.map((channel) =>
              channel.name === "Portali immobiliari"
                ? { ...channel, status: "Sync automatico configurato", progress: 100, updatedAt: nowLabel() }
                : channel,
            ),
          }), "Sync portali configurato.")} />
          <ToolButton label="Privacy e consensi" Icon={ShieldCheck} onClick={() => onCommit((data) => ({
            ...data,
            contacts: data.contacts.map((contact) => ({
              ...contact,
              status: contact.status === "Privacy verificata" ? contact.status : contact.status,
              updatedAt: nowLabel(),
            })),
          }), "Privacy e consensi verificati.")} />
        </div>
      </Panel>
    </div>
  );
}

function RouteSummary({
  module,
  page,
  path,
  items,
}: {
  module: string;
  page: string;
  path: string;
  items: string[];
}) {
  void module;
  void page;
  void path;
  void items;
  return null;
}

function WorkflowSteps({ steps }: { steps: string[] }) {
  return (
    <div className="workflow-steps">
      {steps.map((step, index) => (
        <span key={step}>
          <b>{index + 1}</b>
          {step}
        </span>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  Icon,
}: {
  label: string;
  value: string;
  trend: string;
  Icon: LucideIcon;
}) {
  return (
    <article className="kpi-card">
      <Icon size={21} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}

function Panel({
  title,
  action,
  onPanelAction,
  children,
  className = "",
}: {
  title: string;
  action?: string;
  onPanelAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`workspace-panel ${className}`}>
      <header>
        <h2>{title}</h2>
        {action && onPanelAction ? (
          <button type="button" onClick={onPanelAction}>
            <Filter size={14} />
            {action}
          </button>
        ) : action ? (
          <span className="panel-action-label">
            <Filter size={14} />
            {action}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function DataTable({
  columns,
  rows,
  actions = [],
}: {
  columns: string[];
  rows: string[][];
  actions?: { label: string; onClick: (rowIndex: number) => void }[];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            {actions.length ? <th>Azioni</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={row.join("-")}>
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`}>{cell}</td>
                ))}
                {actions.length ? (
                  <td className="row-actions">
                    {actions.map((action) => (
                      <button key={action.label} type="button" onClick={() => action.onClick(rowIndex)}>
                        {action.label}
                      </button>
                    ))}
                  </td>
                ) : null}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (actions.length ? 1 : 0)}>Nessun dato disponibile per questa vista.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {text ? <small>{text}</small> : null}
    </div>
  );
}

function QuickForm({
  fields,
  button,
  onSubmit,
  required = true,
}: {
  fields: QuickFormField[];
  button: string;
  onSubmit: (values: Record<string, string>) => void;
  required?: boolean;
}) {
  const fieldName = (field: QuickFormField) => typeof field === "string" ? field : field.name;

  return (
    <form
      className="quick-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const values = fields.reduce<Record<string, string>>((accumulator, field) => {
          const name = fieldName(field);
          accumulator[name] = String(formData.get(name) || "").trim();
          return accumulator;
        }, {});
        onSubmit(values);
        event.currentTarget.reset();
      }}
    >
      {fields.map((field) => (
        <label key={fieldName(field)}>
          {fieldName(field)}
          {typeof field === "string" ? (
            <input name={field} required={required} placeholder={field} />
          ) : (
            <select name={field.name} required={required}>
              {field.options.map((option) => (
                <option key={option || "empty"} value={option}>
                  {option || "Qualsiasi"}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
      <button type="submit">{button}</button>
    </form>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="checklist">
      {items.map((item, index) => (
        <label key={item}>
          <input defaultChecked={index < 2} type="checkbox" />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}

function ToolButton({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button className="tool-button" type="button" onClick={onClick}>
      <Icon size={20} />
      <span>{label}</span>
      <ChevronRight size={15} />
    </button>
  );
}

function ProgressLine({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const progress = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="progress-line">
      <span>
        <strong>{label}</strong>
        <small>
          {current}/{target}
        </small>
      </span>
      <i>
        <b style={{ width: `${progress}%` }} />
      </i>
    </div>
  );
}

function labelForPage(moduleKey: ModuleKey, pageKey: string) {
  return modulePages[moduleKey].find((page) => page.key === pageKey)?.label ?? pageKey;
}

function usePersistentCrmData() {
  const [data, setData] = useState<CrmData>(() => {
    const savedData = localStorage.getItem(crmStorageKey);
    if (!savedData) {
      return initialCrmData;
    }

    try {
      return hydrateCrmData(JSON.parse(savedData) as Partial<CrmData>);
    } catch {
      return initialCrmData;
    }
  });

  useEffect(() => {
    localStorage.setItem(crmStorageKey, JSON.stringify(data));
  }, [data]);

  return [data, setData] as const;
}

function usePersistentAccounts() {
  const [accounts, setAccounts] = useState<AccountRecord[]>(() => loadAccounts());

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  return [accounts, setAccounts] as const;
}

function hydrateCrmData(savedData: Partial<CrmData>): CrmData {
  return {
    properties: Array.isArray(savedData.properties) ? savedData.properties : initialCrmData.properties,
    requests: Array.isArray(savedData.requests) ? savedData.requests : initialCrmData.requests,
    contacts: Array.isArray(savedData.contacts) ? savedData.contacts : initialCrmData.contacts,
    activities: Array.isArray(savedData.activities) ? savedData.activities : initialCrmData.activities,
    marketingChannels: Array.isArray(savedData.marketingChannels)
      ? savedData.marketingChannels
      : initialCrmData.marketingChannels,
    censusAreas: Array.isArray(savedData.censusAreas) ? savedData.censusAreas : initialCrmData.censusAreas,
    censusStreets: Array.isArray(savedData.censusStreets)
      ? savedData.censusStreets
      : initialCrmData.censusStreets,
    censusComplexes: Array.isArray(savedData.censusComplexes)
      ? savedData.censusComplexes
      : initialCrmData.censusComplexes,
    goals: Array.isArray(savedData.goals) ? savedData.goals : initialCrmData.goals,
    activityLog: Array.isArray(savedData.activityLog) ? savedData.activityLog : initialCrmData.activityLog,
  };
}

function nowLabel() {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function currentTimeLabel() {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function fieldValue(values: Record<string, string>, field: string, fallback = "") {
  return String(values[field] || "").trim() || fallback;
}

function valuesSummary(values: Record<string, string>, fallback = "tutti i dati") {
  return Object.values(values).filter(Boolean).join(" / ") || fallback;
}

function sameLabel(first: string, second: string) {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

function appendOwnerLabel(currentOwner: string, ownerName: string) {
  const owners = currentOwner
    .split(",")
    .map((owner) => owner.trim())
    .filter((owner) => owner && !/proprietario da associare/i.test(owner));

  if (!owners.some((owner) => sameLabel(owner, ownerName))) {
    owners.push(ownerName);
  }

  return owners.join(", ");
}

function createActivity(input: Partial<ActivityRecord> & Pick<ActivityRecord, "title" | "type">): ActivityRecord {
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
    updatedAt,
  };
}

function downloadCrmData(data: CrmData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fenix-suite-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function pathForPage(pageKey: string) {
  const paths: Record<string, string> = {
    "start-dashboard": "/home",
    "immobili-nuovo": "/immobili/nuovo",
    "immobili-tutti": "/immobili",
    "immobili-vendite": "/immobili/vendite",
    "immobili-affitti": "/immobili/affitti-annuali",
    "immobili-ricerca-op": "/immobili/ricerca-op",
    "immobili-ricerca-cli": "/immobili/ricerca-cli",
    "richieste-nuova": "/nominativi/richieste/nuova",
    "richieste-elenco": "/nominativi/richieste",
    "richieste-matching": "/nominativi/richieste/incroci",
    "nominativi-nuovo": "/nominativi/nuovo",
    "nominativi-elenco": "/nominativi",
    "nominativi-richieste": "/nominativi/richieste",
    "attivita-nuova": "/agenda/attivita",
    "agenda-calendario": "/agenda",
    "agenda-storico": "/agenda/storico",
    "pubblicita-portali": "/pubblicita",
    "contatti-p-nuovo": "/contatti-pubblicita/nuovo",
    "contatti-p-elenco": "/contatti-pubblicita",
    "censimento-zone": "/censimento/zone",
    "censimento-vie": "/censimento/vie",
    "censimento-complessi": "/censimento/complessi",
    "censimento-proprietari": "/censimento/proprietari",
    "obiettivi-elenco": "/obiettivi",
    "account-ruoli": "/account/ruoli",
    "utilita-preferenze": "/preferenze",
    "utilita-backup": "/utilita/copie-sicurezza",
    "utilita-portali": "/utilita/portali/esportazioni",
    "utilita-pubblicita": "/pubblicita",
    "utilita-info-territoriali": "/info-territoriali",
    "impostazioni-cantieri": "/impostazioni/cantieri",
    "impostazioni-tipologie": "/impostazioni/tipologie",
    "impostazioni-tipi-gestione": "/impostazioni/tipi-gestione",
    "impostazioni-stati": "/impostazioni/stati-conservazione",
    "impostazioni-accessori": "/impostazioni/accessori",
    "impostazioni-modulistica": "/impostazioni/contratti",
    "impostazioni-cartelli": "/impostazioni/preset-cartellini",
    "impostazioni-distanze": "/impostazioni/distanze",
    "impostazioni-azienda": "/impostazioni/agenzia",
    "impostazioni-aree": "/impostazioni/aree-geografiche",
    "impostazioni-provenienze": "/impostazioni/provenienze",
    "impostazioni-email-cp": "/impostazioni/email-contatti-pubblicita",
  };

  return paths[pageKey] ?? "/workspace";
}

function useFilteredRows<T>(
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

function scrollToInfo() {
  document.getElementById("richiedi")?.scrollIntoView({ behavior: "smooth" });
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

const root = window.__fenixSuiteRoot ?? createRoot(rootElement);
window.__fenixSuiteRoot = root;

root.render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
