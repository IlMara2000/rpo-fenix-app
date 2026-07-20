import { StrictMode, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
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
import { TelefonistaTool } from "./TelefonistaTool";
import { StructuredQuickForm } from "./crm/components/StructuredQuickForm";
import {
  activityFormSections,
  censusContactFormSections,
  contactFilterSections,
  contactFormSections,
  propertyFilterSections,
  propertyFormSections,
  requestFormSections,
} from "./crm/featureForms";
import type {
  ActivityDetails,
  CensusContactDetails,
  ContactDetails,
  PropertyDetails,
  RequestDetails,
} from "./crm/domain";

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
  | "proprietari"
  | "agenda"
  | "attivita"
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
      options?: string[];
      required?: boolean;
      placeholder?: string;
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
  phone?: string;
  taxCode?: string;
  sheet?: string;
  parcel?: string;
  subaltern?: string;
  cadastralCategory?: string;
  rooms?: string;
  source?: string;
  details?: PropertyDetails;
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
  details?: RequestDetails;
  updatedAt: string;
};

type ContactRecord = {
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
  day: "Oggi" | "Domani" | "Settimana" | "Passate" | "Future";
  details?: ActivityDetails;
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
  accessLimitEnabled?: boolean;
  accessStartHour?: number;
  accessEndHour?: number;
  managerId?: string;
  updatedAt: string;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type ClientContext = {
  networkId: string;
  observedAt: string;
};

type MigrationRecord = {
  schemaVersion: number;
  deviceId: string;
  networkId: string;
  accountEmail: string;
  migratedAt: string;
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

type CensusRingSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  moduleKey: ModuleKey;
  pageKey?: string;
};

const accountEmail = "daniele.marangoni@grfenix.com";
const accountPasswordHash =
  "35b47eca325c70ec48ba4d8489301c7ee82b6a50ac330938158dcfe1a5fded11";
const accountsStorageKey = "fenix-suite-accounts-v1";
const sessionStorageKey = "fenix-suite-current-user-v1";
const legacySessionKey = "fenix-suite-session";
const crmSchemaVersion = 3;
const migrationStorageKey = "fenix-suite-migration-v3";
const deviceStorageKey = "fenix-suite-device-id";
const legacyCrmStorageKeys = [
  "fenix-suite-crm-data",
  "fenix-suite-crm-data-v1",
];

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

const defaultAccessStartHour = 9;
const defaultAccessEndHour = 20;
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);

const cadastralCategoryOptions = [
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

const roomOptions = ["", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "7", "8", "9", "10+"];

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
    options: cadastralCategoryOptions,
  },
  {
    name: "Vani",
    options: roomOptions,
  },
];

const defaultAccount: AccountRecord = {
  id: "account-daniele-marangoni",
  name: "Daniele Marangoni",
  email: accountEmail,
  passwordHash: accountPasswordHash,
  role: "SVILUPPATORE",
  status: "Attivo",
  accessLimitEnabled: false,
  accessStartHour: defaultAccessStartHour,
  accessEndHour: defaultAccessEndHour,
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
    title: "PROGRAMMA TELEFONISTA",
    description:
      "Script guidato per chiamare proprietari censiti, raccogliere note e fissare perizie immobiliari.",
    path: "/telefonista",
    Icon: MessageSquareText,
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
    key: "agenda",
    label: "Agenda",
    description: "Settimana operativa, visite, appuntamenti e scadenze.",
    Icon: CalendarDays,
  },
  {
    key: "censimento",
    label: "Censimento",
    description: "Zone, vie, palazzi, immobili e proprietari collegati.",
    Icon: MapPinned,
  },
  {
    key: "nominativi",
    label: "Clienti",
    description: "Database clienti, esigenze, telefoni, note e prossimo contatto.",
    Icon: UsersRound,
  },
  {
    key: "proprietari",
    label: "Proprietari",
    description: "Persone collegate agli immobili e storico sviluppo.",
    Icon: UserRound,
  },
  {
    key: "immobili",
    label: "Immobili",
    description: "Schede immobili, proprietari, prezzi e pubblicazione.",
    Icon: Home,
  },
  {
    key: "richieste",
    label: "Richieste",
    description: "Richieste clienti, matching e proposta immobili.",
    Icon: BriefcaseBusiness,
  },
  {
    key: "pubblicita",
    label: "Pubblicita",
    description: "Portali, campagne, vetrina e canali pubblicitari.",
    Icon: Globe2,
  },
  {
    key: "contattiPubblicita",
    label: "+ Contatto P.",
    description: "Lead pubblicitari da portali, sito e campagne.",
    Icon: Bell,
  },
  {
    key: "attivita",
    label: "Attivita",
    description: "Telefonate, esiti, follow-up, note e storico operativo.",
    Icon: ClipboardCheck,
  },
  {
    key: "obiettivi",
    label: "Obiettivi",
    description: "Avanzamento giornaliero e mensile per operatori e agenzia.",
    Icon: Target,
  },
  {
    key: "utilita",
    label: "Account",
    description: "Utenti, ruoli, permessi e orari di accesso.",
    Icon: ShieldCheck,
  },
  {
    key: "impostazioni",
    label: "Impostazioni",
    description: "Parametri agenzia, tipologie, provenienze e documenti.",
    Icon: Wrench,
  },
];

const modulePages: Record<ModuleKey, ModulePage[]> = {
  start: [
    {
      key: "start-dashboard",
      label: "Oggi",
      description: "Agenda, attivita e ricontatti del giorno con riepilogo mensile.",
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
    {
      key: "immobili-ricerca-op",
      label: "Ricerca Op.",
      description: "Ricerca proprietari e opportunita collegate alle schede immobiliari.",
      Icon: Search,
    },
    {
      key: "immobili-ricerca-cli",
      label: "Ricerca C.",
      description: "Ricerca clienti compatibili con immobili, zone e caratteristiche.",
      Icon: UsersRound,
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
    {
      key: "nominativi-richieste",
      label: "Richieste",
      description: "Elenco richieste collegate ai nominativi con preferenze, budget e incroci.",
      Icon: BriefcaseBusiness,
    },
  ],
  proprietari: [
    {
      key: "proprietari-elenco",
      label: "Elenco",
      description: "Proprietari collegati agli immobili, contatti e prossimo sviluppo.",
      Icon: UsersRound,
    },
    {
      key: "proprietari-collega",
      label: "Collega",
      description: "Trasforma un cliente in proprietario collegandolo a un immobile.",
      Icon: Home,
    },
  ],
  agenda: [
    {
      key: "agenda-nuova",
      label: "Nuova",
      description: "Nuova attivita o appuntamento collegato a clienti, immobili e operatori.",
      Icon: Plus,
    },
    {
      key: "agenda-calendario",
      label: "Agenda",
      description: "Calendario operativo per oggi, domani e settimana.",
      Icon: CalendarDays,
    },
    {
      key: "agenda-storico",
      label: "Ricerca",
      description: "Ricerca storico attivita per operatore, cliente, immobile, tipologia ed esito.",
      Icon: Search,
    },
  ],
  attivita: [
    {
      key: "attivita-elenco",
      label: "Storico",
      description: "Storico operativo di telefonate, visite, note, esiti e follow-up.",
      Icon: ListChecks,
    },
    {
      key: "attivita-nuova",
      label: "Nuova",
      description: "Nuova attivita collegata a cliente, proprietario o immobile.",
      Icon: Plus,
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
      key: "censimento-nuovo-contatto",
      label: "Nuovo Contatto",
      description: "Crea un contatto censimento con immobile, dati catastali e proprietario.",
      Icon: Plus,
    },
    {
      key: "censimento-contatti",
      label: "Contatti",
      description: "Elenco contatti censiti con filtri per nominativo, telefono, zona e catasto.",
      Icon: UsersRound,
    },
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
      key: "censimento-immobili",
      label: "Immobile",
      description: "Fase 4: creazione o selezione dell'immobile dentro il complesso.",
      Icon: Home,
    },
    {
      key: "censimento-proprietari",
      label: "Proprietari",
      description: "Fase 5: collega clienti e proprietari agli immobili censiti.",
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
      key: "utilita-preferenze",
      label: "Preferenze",
      description: "Widget Start, moduli visibili e preferenze operative personali.",
      Icon: Settings,
    },
    {
      key: "utilita-backup",
      label: "Copie sicurezza",
      description: "Backup locale dell'archivio e strumenti di ripristino.",
      Icon: DatabaseBackup,
    },
    {
      key: "utilita-portali",
      label: "Esportazioni",
      description: "Riepilogo esportazioni immobili sui portali collegati.",
      Icon: UploadCloud,
    },
    {
      key: "utilita-info-territoriali",
      label: "Info territoriali",
      description: "Collegamento operativo a servizi territoriali e verifiche esterne.",
      Icon: MapPinned,
    },
  ],
  impostazioni: [
    {
      key: "impostazioni-cantieri",
      label: "Cantieri",
      description: "Elenco cantieri e nuove costruzioni.",
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
      description: "Vendita, affitto e altre modalita operative abilitate.",
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
      description: "Accessori generali, per tipologia e per tipo gestione.",
      Icon: ListChecks,
    },
    {
      key: "impostazioni-accessori-tipologia",
      label: "Accessori tipologia",
      description: "Associazione accessori alle tipologie immobiliari.",
      Icon: Home,
    },
    {
      key: "impostazioni-accessori-gestione",
      label: "Accessori gestione",
      description: "Associazione accessori ai tipi gestione.",
      Icon: BriefcaseBusiness,
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
      description: "Modelli stampabili e cartelli vetrina.",
      Icon: GalleryVerticalEnd,
    },
    {
      key: "impostazioni-distanze",
      label: "Distanze",
      description: "Punti di interesse e distanze usate nelle schede.",
      Icon: MapPinned,
    },
    {
      key: "impostazioni-aziende",
      label: "Aziende",
      description: "Anagrafiche aziende, partita IVA, indirizzi e contatti.",
      Icon: Building2,
    },
    {
      key: "impostazioni-tipo-attivita",
      label: "Tipi attività",
      description: "Tipologie appuntamento e colori agenda.",
      Icon: CalendarCheck2,
    },
    {
      key: "impostazioni-azienda",
      label: "Dati agenzia",
      description: "Dati aziendali, sedi, utenti e permessi.",
      Icon: Building2,
    },
    {
      key: "impostazioni-aree",
      label: "Zone",
      description: "Frazioni, localita e zone operative.",
      Icon: Globe2,
    },
    {
      key: "impostazioni-frazioni",
      label: "Frazioni",
      description: "Frazioni geografiche trattate dall'agenzia.",
      Icon: MapPinned,
    },
    {
      key: "impostazioni-localita",
      label: "Localita",
      description: "Localita collegate a frazioni, comuni e zone.",
      Icon: MapPinned,
    },
    {
      key: "impostazioni-provenienze",
      label: "Provenienze",
      description: "Portali, giornalini, siti web e altri canali.",
      Icon: CircleDot,
    },
    {
      key: "impostazioni-provenienze-portali",
      label: "Portali",
      description: "Portali immobiliari personali e collegati.",
      Icon: Globe2,
    },
    {
      key: "impostazioni-provenienze-giornalini",
      label: "Giornalini",
      description: "Provenienze da giornalini e canali offline.",
      Icon: FileBadge,
    },
    {
      key: "impostazioni-provenienze-siti",
      label: "Siti Web",
      description: "Provenienze da siti web e landing.",
      Icon: PanelsTopLeft,
    },
    {
      key: "impostazioni-provenienze-altri",
      label: "Altro",
      description: "Altre provenienze commerciali.",
      Icon: CircleDot,
    },
    {
      key: "impostazioni-email-cp",
      label: "E-mail Contatti P.",
      description: "Mailbox e mittenti accettati per lead pubblicitari.",
      Icon: Mail,
    },
    {
      key: "impostazioni-email-cp-mittenti",
      label: "Mittenti accettati",
      description: "Mittenti abilitati per acquisire contatti pubblicitari via email.",
      Icon: Mail,
    },
  ],
};

function isValidModuleKey(value: string): value is ModuleKey {
  return Object.prototype.hasOwnProperty.call(modulePages, value);
}

function readWorkspaceRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  const [moduleKey, pageKey] = hash.split("/").filter(Boolean);

  if (moduleKey && isValidModuleKey(moduleKey)) {
    return {
      moduleKey,
      pageKey,
    };
  }

  const storedModule = localStorage.getItem("fenix-suite-active-module") || "";
  const storedPage = localStorage.getItem("fenix-suite-active-page") || "";

  return {
    moduleKey: isValidModuleKey(storedModule) ? storedModule : "start",
    pageKey: storedPage,
  };
}

function writeWorkspaceRoute(moduleKey: ModuleKey, pageKey: string) {
  const nextHash = `#${moduleKey}/${pageKey}`;
  if (window.location.pathname.startsWith("/crm") && window.location.hash !== nextHash) {
    window.history.replaceState(null, "", `${window.location.pathname}${nextHash}`);
  }
}

function getInitialModule(): ModuleKey {
  return readWorkspaceRoute().moduleKey;
}

function getInitialPage(moduleKey: ModuleKey) {
  const route = readWorkspaceRoute();
  return modulePages[moduleKey].some((page) => page.key === route.pageKey)
    ? route.pageKey
    : modulePages[moduleKey][0].key;
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

  return pageKey === "account-ruoli" && (canManageAccounts(user) || canUseDeveloperTools(user));
}

function canAccessModule(user: SessionUser, moduleKey: ModuleKey) {
  if (moduleKey === "utilita") {
    return canManageAccounts(user) || canUseDeveloperTools(user);
  }

  if (moduleKey === "impostazioni") {
    return hasOwnerOverride(user) || user.role === "TITOLARE" || user.role === "SVILUPPATORE";
  }

  return true;
}

function getVisibleModules(user: SessionUser) {
  return modules.filter((module) => canAccessModule(user, module.key));
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

function normalizeAccessHour(value: unknown, fallback: number) {
  const hour = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : fallback;
}

function getAccountAccessSchedule(account: AccountRecord) {
  return {
    enabled: account.accessLimitEnabled !== false,
    start: normalizeAccessHour(account.accessStartHour, defaultAccessStartHour),
    end: normalizeAccessHour(account.accessEndHour, defaultAccessEndHour),
  };
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function accountAccessLabel(account: AccountRecord) {
  const schedule = getAccountAccessSchedule(account);
  return schedule.enabled ? `${formatHour(schedule.start)}-${formatHour(schedule.end)}` : "Sempre operativo";
}

function isAccountOnline(account: AccountRecord, date = new Date()) {
  if (account.email.toLowerCase() === accountEmail) {
    return true;
  }

  if (account.status !== "Attivo") {
    return false;
  }

  const schedule = getAccountAccessSchedule(account);
  if (!schedule.enabled || schedule.start === schedule.end) {
    return true;
  }

  const currentHour = getRomeTime(date).hour;
  if (schedule.start < schedule.end) {
    return currentHour >= schedule.start && currentHour < schedule.end;
  }

  return currentHour >= schedule.start || currentHour < schedule.end;
}

function accountOfflineMessage(account: AccountRecord, date = new Date()) {
  const romeTime = getRomeTime(date).label;
  if (account.status !== "Attivo") {
    return "Account sospeso: contatta un responsabile.";
  }
  return `Account offline: operativo dalle ${accountAccessLabel(account)}. Ora Roma: ${romeTime}.`;
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
    accessLimitEnabled: input.accessLimitEnabled !== false,
    accessStartHour: normalizeAccessHour(input.accessStartHour, defaultAccessStartHour),
    accessEndHour: normalizeAccessHour(input.accessEndHour, defaultAccessEndHour),
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
  const storedDefault = normalized.find((account) => account.email === defaultAccount.email);
  const protectedDefault: AccountRecord = storedDefault
    ? {
        ...defaultAccount,
        ...storedDefault,
        id: defaultAccount.id,
        email: defaultAccount.email,
        status: "Attivo",
        role: "SVILUPPATORE",
        passwordHash: defaultAccount.passwordHash,
        accessLimitEnabled: false,
        updatedAt: "Account sviluppatore riattivato",
      }
    : defaultAccount;
  const withoutDefault = normalized.filter((account) => account.email !== defaultAccount.email);
  return [protectedDefault, ...withoutDefault];
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

function getRomeTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
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

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(deviceStorageKey);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(deviceStorageKey, generated);
  return generated;
}

function removeLegacyUpdateBlocks() {
  const removableKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key &&
      key !== migrationStorageKey &&
      /^fenix-suite/i.test(key) &&
      /(new-version|new_version|update-required|upgrade-required|migration-required|version-block)/i.test(key)
    ) {
      removableKeys.push(key);
    }
  }
  removableKeys.forEach((key) => localStorage.removeItem(key));
}

function runNonBlockingLocalMigration() {
  removeLegacyUpdateBlocks();

  const currentData = localStorage.getItem(crmStorageKey);
  if (!currentData || !safeJsonParse(currentData)) {
    const legacyData = legacyCrmStorageKeys
      .map((key) => localStorage.getItem(key))
      .find((value) => value && safeJsonParse(value));
    if (legacyData) {
      localStorage.setItem(crmStorageKey, legacyData);
    }
  }

  const savedSession = localStorage.getItem(sessionStorageKey);
  const parsedSession = savedSession ? safeJsonParse(savedSession) as Partial<SessionUser> | null : null;
  const accountForMigration = String(parsedSession?.email || accountEmail).toLowerCase();
  const previousRecord = safeJsonParse(localStorage.getItem(migrationStorageKey) || "") as Partial<MigrationRecord> | null;
  const migrationRecord: MigrationRecord = {
    schemaVersion: crmSchemaVersion,
    deviceId: getOrCreateDeviceId(),
    networkId: String(previousRecord?.networkId || "pending"),
    accountEmail: accountForMigration,
    migratedAt: new Date().toISOString(),
  };
  localStorage.setItem(migrationStorageKey, JSON.stringify(migrationRecord));

  saveAccounts(loadAccounts());
}

async function updateMigrationClientContext(accountForMigration: string) {
  try {
    const response = await fetch("/api/client-context", {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return;
    }
    const context = await response.json() as ClientContext;
    if (!context.networkId) {
      return;
    }
    const previousRecord = safeJsonParse(localStorage.getItem(migrationStorageKey) || "") as Partial<MigrationRecord> | null;
    const migrationRecord: MigrationRecord = {
      schemaVersion: crmSchemaVersion,
      deviceId: String(previousRecord?.deviceId || getOrCreateDeviceId()),
      networkId: context.networkId,
      accountEmail: accountForMigration.toLowerCase(),
      migratedAt: String(previousRecord?.migratedAt || context.observedAt || new Date().toISOString()),
    };
    localStorage.setItem(migrationStorageKey, JSON.stringify(migrationRecord));
  } catch {
    // La migrazione locale resta valida anche se il contesto di rete non e disponibile.
  }
}

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

  if (path.startsWith("/telefonista")) {
    return <TelefonistaTool onNavigate={navigate} />;
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
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => {
    runNonBlockingLocalMigration();
    return getStoredSessionUser();
  });
  const [screen, setScreen] = useState<Screen>(() => (sessionUser ? "workspace" : "marketing"));
  const [clock, setClock] = useState(() => new Date());
  const [loginNotice, setLoginNotice] = useState("");

  useEffect(() => {
    const intervalId = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    void updateMigrationClientContext(sessionUser?.email || accountEmail);
  }, [sessionUser?.email]);

  useEffect(() => {
    if (screen !== "workspace" || !sessionUser) {
      return;
    }

    const currentAccount = loadAccounts().find(
      (account) => account.id === sessionUser.id || account.email === sessionUser.email,
    );
    if (!currentAccount || !isAccountOnline(currentAccount, clock)) {
      clearSessionUser();
      setSessionUser(null);
      setLoginNotice(currentAccount ? accountOfflineMessage(currentAccount, clock) : "Account non disponibile.");
      setScreen("login");
    }
  }, [clock, screen, sessionUser]);

  function openLogin() {
    setLoginNotice("");
    setScreen("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMarketing() {
    setLoginNotice("");
    setScreen("marketing");
    window.location.hash = "top";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openWorkspace(user: SessionUser) {
    const account = loadAccounts().find((item) => item.id === user.id || item.email === user.email);
    if (!account || !isAccountOnline(account)) {
      clearSessionUser();
      setSessionUser(null);
      setLoginNotice(account ? accountOfflineMessage(account) : "Account non disponibile.");
      setScreen("login");
      return;
    }
    storeSessionUser(user);
    setSessionUser(user);
    setLoginNotice("");
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
    setLoginNotice("");
    setScreen("marketing");
  }

  if (screen === "workspace" && sessionUser) {
    return <Workspace currentUser={sessionUser} onLogout={logout} onSessionUpdate={updateSession} />;
  }

  if (screen === "login") {
    return (
      <LoginScreen
        notice={loginNotice}
        onBack={openMarketing}
        onSuccess={openWorkspace}
      />
    );
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
    </section>
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
          </span>
        </button>
        {externalTools.map(({ title, href, Icon }) => (
          <a className="access-card" href={href} key={title}>
            <span className="access-icon" aria-hidden="true">
              <Icon size={26} strokeWidth={1.8} />
            </span>
            <span>
              <strong>{title}</strong>
            </span>
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
        <h2>Parla con un nostro tecnico</h2>
        <p>
          Compila il modulo per ricevere dettagli, assistenza o una presentazione del gestionale
          e valutare come adattarlo al flusso operativo della tua agenzia.
        </p>
        <div className="contact-strip">
          <Mail size={18} />
          <span>Risposta rapida garantita</span>
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
  notice,
  onBack,
  onSuccess,
}: {
  notice: string;
  onBack: () => void;
  onSuccess: (user: SessionUser) => void;
}) {
  const [error, setError] = useState(notice);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(notice);
  }, [notice]);

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
      (item) => item.email === email && item.passwordHash === passwordHash,
    );

    if (account) {
      if (!isAccountOnline(account)) {
        setError(accountOfflineMessage(account));
        return;
      }
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
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const syncFromHash = () => {
      const route = readWorkspaceRoute();
      if (!getVisibleModules(currentUser).some((item) => item.key === route.moduleKey)) {
        return;
      }
      const visiblePages = getVisibleModulePages(route.moduleKey, currentUser);
      const page = visiblePages.find((item) => item.key === route.pageKey) ?? visiblePages[0];
      setActiveModule(route.moduleKey);
      setActivePage(page.key);
    };

    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("fenix-suite-active-module", safeActiveModule);
    localStorage.setItem("fenix-suite-active-page", currentPage.key);
    writeWorkspaceRoute(safeActiveModule, currentPage.key);
  }, [safeActiveModule, currentPage.key]);

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
    writeWorkspaceRoute(moduleKey, page.key);
    setNotice(`${module?.label ?? "Modulo"} / ${page.label}: pronto.`);
  }

  return (
    <main className="workspace-shell">
      <section className="app-main">
        <CrmTopbar
          activeModule={safeActiveModule}
          modules={visibleModules}
          onLogout={onLogout}
          onOpenModule={openModule}
        />

        <div className="area-workspace-frame">
          <aside className="app-sidebar">
            <button className="area-user-card button-reset" type="button" onClick={() => openModule("start")}>
              <UserRound size={28} />
              <span>
                <strong>{currentUser.name}</strong>
                <small>SALES</small>
              </span>
            </button>
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
            {currentPages.length > 1 ? (
              <nav className="area-side-pages" aria-label={`Sottomenu ${currentModule.label}`}>
                {currentPages.map(({ key, label, Icon }) => (
                  <button
                    className={key === currentPage.key ? "active" : ""}
                    key={key}
                    type="button"
                    onClick={() => {
                      setActivePage(key);
                      localStorage.setItem("fenix-suite-active-module", safeActiveModule);
                      localStorage.setItem("fenix-suite-active-page", key);
                      writeWorkspaceRoute(safeActiveModule, key);
                      setNotice(`${currentModule.label} / ${label}: pronto.`);
                    }}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            ) : null}
          </aside>
        <motion.section
          className={`workspace-content ${safeActiveModule === "start" ? "area-start-content" : ""}`}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="workspace-status" role="status">
            <span>
              <CheckCircle2 size={16} />
              {notice}
            </span>
            <small>Utente: {currentUser.name}</small>
          </div>

          <section className="module-heading">
            <div>
              <span className="system-label">
                {currentModule.label}
                <ChevronRight size={13} />
                {currentPage.label}
              </span>
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

          <AnimatePresence mode="wait">
            <motion.div
              key={`${safeActiveModule}-${currentPage.key}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
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
            </motion.div>
          </AnimatePresence>
        </motion.section>
        </div>
      </section>
    </main>
  );
}

function CrmTopbar({
  modules,
  activeModule,
  onOpenModule,
  onLogout,
}: {
  modules: ModuleItem[];
  activeModule: ModuleKey;
  onOpenModule: (moduleKey: ModuleKey, pageKey?: string) => void;
  onLogout: () => void;
}) {
  const primaryModules = modules.filter((module) =>
    ["immobili", "richieste", "nominativi", "agenda", "pubblicita", "censimento", "contattiPubblicita"].includes(module.key),
  );

  return (
    <header className="area-topbar">
      <button className="area-topbar-brand button-reset" type="button" onClick={() => onOpenModule("start")}>
        <BrandMark />
        <span className="area-brand-copy">
          <strong>Fenix Suite</strong>
          <small>Real Estate CRM</small>
        </span>
      </button>
      <nav aria-label="Moduli principali">
        {primaryModules.map(({ key, label, Icon }) => (
          <button
            className={key === activeModule ? "active" : ""}
            key={key}
            type="button"
            onClick={() => onOpenModule(key)}
          >
            <Icon size={24} />
            <span>{label === "Contatti Pubblicita" ? "+ Contatto P." : label}</span>
          </button>
        ))}
      </nav>
      <button className="area-topbar-logout" type="button" onClick={onLogout}>
        <LogOut size={17} />
        Esci
      </button>
    </header>
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
  if (moduleKey === "proprietari") {
    return <OwnersView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "agenda") {
    return <AgendaView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} resetVersion={agendaResetVersion} />;
  }
  if (moduleKey === "attivita") {
    return <ActivityCenterView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} />;
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
  const callQueue = scopedContacts
    .filter((contact) => /ricontattare|lead|valutazione|visita/i.test(contact.status))
    .slice(0, 8);
  const fallbackQueue = callQueue.length ? callQueue : scopedContacts.slice(0, 8);
  const agendaToday = scopedActivities.filter((activity) => activity.day === "Oggi").slice(0, 4);
  const agendaTomorrow = scopedActivities.filter((activity) => activity.day === "Domani").slice(0, 4);
  const agendaWeek = scopedActivities.filter((activity) => activity.day === "Settimana").slice(0, 4);
  const censusRecallRows = data.contacts
    .filter((contact) => /censimento|proprietario|valutazione|ricontattare/i.test(`${contact.source} ${contact.type} ${contact.status}`))
    .slice(0, 12);
  const censusTotal = Math.max(0, data.censusAreas.reduce((sum, area) => sum + area.contacts, 0) || censusRecallRows.length);
  const overdueCensus = Math.max(0, censusRecallRows.filter((contact) => /ricontattare|valutazione/i.test(contact.status)).length || censusTotal);
  const censusDueSoon = Math.max(0, censusRecallRows.filter((contact) => /lead|nuovo|da qualificare/i.test(`${contact.status} ${contact.nextStep}`)).length);
  const censusOwnersCount = Math.max(0, data.contacts.filter((contact) => isOwnerContact(contact, data.properties)).length);
  const censusCompleted = Math.max(
    0,
    Math.min(
      censusTotal,
      censusTotal - Math.min(censusTotal, overdueCensus + censusDueSoon) || data.censusComplexes.length,
    ),
  );
  const censusSegments: CensusRingSegment[] = [
    {
      key: "overdue",
      label: "In scadenza oltre 7 gg",
      value: overdueCensus,
      color: "#72cf45",
      moduleKey: "censimento",
      pageKey: "censimento-contatti",
    },
    {
      key: "due",
      label: "Da lavorare",
      value: censusDueSoon,
      color: "#ff9f0a",
      moduleKey: "attivita",
      pageKey: "attivita-elenco",
    },
    {
      key: "owners",
      label: "Proprietari",
      value: censusOwnersCount,
      color: "#ff675d",
      moduleKey: "proprietari",
      pageKey: "proprietari-elenco",
    },
    {
      key: "done",
      label: "Completati",
      value: censusCompleted,
      color: "#555555",
      moduleKey: "censimento",
      pageKey: "censimento-zone",
    },
  ];
  const objectives = data.goals.filter((goal) => isInScope(goal.owner));

  return (
    <div className="area-dashboard">
      <section className="area-card area-card-news">
        <AreaCardHeader title="Notizie Censimento" filter={accountScope.label} />
        <div className="area-card-body">
          <div className="area-total">Totale: {censusTotal}</div>
          <CensusRing
            segments={censusSegments}
            value={overdueCensus}
            onSegmentSelect={(segment) => onOpenModule(segment.moduleKey, segment.pageKey)}
          />
          <div className="dashboard-link-row" aria-label="Azioni censimento">
            <button type="button" onClick={() => onOpenModule("censimento", "censimento-zone")}>
              Zone
            </button>
            <button type="button" onClick={() => onOpenModule("censimento", "censimento-vie")}>
              Vie
            </button>
            <button type="button" onClick={() => onOpenModule("censimento", "censimento-proprietari")}>
              Proprietari
            </button>
          </div>
        </div>
      </section>

      <section className="area-card area-card-objectives">
        <AreaCardHeader title="Obiettivi" filter="Oggi" />
        <div className="area-empty-center">
          {objectives.length ? (
            <div className="progress-overview compact">
              {objectives.slice(0, 4).map((goal) => (
                <ProgressLine current={goal.current} key={goal.id} label={goal.label} target={goal.target} />
              ))}
            </div>
          ) : (
            <span>Nessun obiettivo presente per i filtri selezionati</span>
          )}
          <button className="dashboard-panel-link" type="button" onClick={() => onOpenModule("obiettivi", "obiettivi-elenco")}>
            Apri obiettivi
          </button>
        </div>
      </section>

      <section className="area-card area-card-census-recalls">
        <AreaCardHeader title="Contatti censiti da ricontattare" filter={accountScope.label} />
        <div className="area-list-section">
          <h3>Oggi</h3>
          {censusRecallRows.length ? (
            <div className="area-contact-table">
              <div className="area-contact-head">
                <span>Nome</span>
                <span>Telefono</span>
              </div>
              {censusRecallRows.map((contact) => (
                <button key={contact.id} type="button" onClick={() => onOpenModule("censimento", "censimento-contatti")}>
                  <span>{contact.name}</span>
                  <b>{contact.phone || "-"}</b>
                </button>
              ))}
            </div>
          ) : (
            <p>Nessun contatto censito da ricontattare per oggi</p>
          )}
        </div>
      </section>

      <section className="area-card area-card-agenda">
        <AreaCardHeader title="Agenda" />
        <div className="area-list-section">
          <AgendaColumn title="Oggi" items={agendaToday} empty="Non hai nessun appuntamento per oggi" />
          <AgendaColumn title="Domani" items={agendaTomorrow} empty="Non hai nessun appuntamento per domani" />
          <AgendaColumn title="Questa settimana" items={agendaWeek} empty="Non hai nessun appuntamento per i prossimi giorni della settimana" />
          <button className="dashboard-panel-link" type="button" onClick={() => onOpenModule("agenda", "agenda-calendario")}>
            Apri agenda
          </button>
        </div>
      </section>

      <section className="area-card area-card-nominativi">
        <AreaCardHeader title="Nominativi da ricontattare" filter={accountScope.label} />
        <div className="area-list-section">
          {[
            { title: "Oggi", rows: fallbackQueue.slice(0, 3), empty: "Non hai nessuno da ricontattare" },
            { title: "Domani", rows: [], empty: "Non hai nessuno da ricontattare" },
            { title: "Questa settimana", rows: [], empty: "Non hai nessuno da ricontattare nei prossimi giorni della settimana" },
          ].map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.rows.length ? (
                <div className="area-mini-list">
                  {section.rows.map((contact) => (
                    <button key={contact.id} type="button" onClick={() => onOpenModule("nominativi", "nominativi-elenco")}>
                      <span>{contact.name}</span>
                      <small>{contact.phone || contact.status}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p>{section.empty}</p>
              )}
            </section>
          ))}
          <button className="dashboard-panel-link" type="button" onClick={() => onOpenModule("nominativi", "nominativi-elenco")}>
            Apri clienti
          </button>
        </div>
      </section>
    </div>
  );
}

function AreaCardHeader({ title, filter }: { title: string; filter?: string }) {
  return (
    <header className="area-card-header">
      <h2>{title}</h2>
      {filter ? (
        <select aria-label={`Filtro ${title}`} defaultValue={filter}>
          <option>{filter}</option>
        </select>
      ) : null}
    </header>
  );
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function CensusRing({
  value,
  segments,
  onSegmentSelect,
}: {
  value: number;
  segments: CensusRingSegment[];
  onSegmentSelect: (segment: CensusRingSegment) => void;
}) {
  const [activeKey, setActiveKey] = useState(segments.find((segment) => segment.value > 0)?.key ?? segments[0]?.key ?? "");
  const total = Math.max(0, segments.reduce((sum, segment) => sum + segment.value, 0));
  const activeSegment = segments.find((segment) => segment.key === activeKey) ?? segments[0];
  let angleCursor = 0;

  return (
    <div className="census-ring" aria-label={`In scadenza oltre 7 giorni: ${value}`}>
      <svg viewBox="0 0 220 220" role="img" aria-label="Grafico interattivo censimento">
        <circle className="census-ring-track" cx="110" cy="110" r="82" />
        {segments.map((segment) => {
          const percent = total > 0 ? segment.value / total : 1 / Math.max(segments.length, 1);
          const startAngle = angleCursor;
          const endAngle = angleCursor + percent * 360;
          angleCursor = endAngle;
          const isActive = segment.key === activeSegment?.key;

          return (
            <motion.path
              aria-label={`${segment.label}: ${segment.value}`}
              className={isActive ? "active" : ""}
              d={describeArc(110, 110, isActive ? 86 : 82, startAngle, endAngle)}
              fill="none"
              key={segment.key}
              role="button"
              stroke={segment.color}
              strokeLinecap="butt"
              strokeWidth={isActive ? 32 : 27}
              tabIndex={0}
              initial={false}
              animate={{ opacity: segment.value || total === 0 ? 1 : 0.36 }}
              transition={{ duration: 0.18 }}
              onClick={() => onSegmentSelect(segment)}
              onFocus={() => setActiveKey(segment.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSegmentSelect(segment);
                }
              }}
              onMouseEnter={() => setActiveKey(segment.key)}
            />
          );
        })}
      </svg>
      {segments.map((segment, index) => (
        <button
          aria-label={`${segment.label}: ${segment.value}`}
          className={`census-ring-hotspot census-ring-hotspot-${index}`}
          key={`hotspot-${segment.key}`}
          type="button"
          onClick={() => onSegmentSelect(segment)}
          onFocus={() => setActiveKey(segment.key)}
          onMouseEnter={() => setActiveKey(segment.key)}
        />
      ))}
      <div>
        <strong>{activeSegment?.label ?? "Censimento"}</strong>
        <span>{(activeSegment?.value ?? value).toLocaleString("it-IT")}</span>
        <small>clicca per aprire</small>
      </div>
    </div>
  );
}

function AgendaColumn({
  title,
  items,
  empty,
}: {
  title: string;
  items: ActivityRecord[];
  empty: string;
}) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? (
        <div className="area-agenda-list">
          {items.map((item) => (
            <article key={item.id}>
              <span>{item.time}</span>
              <strong>{item.title}</strong>
              <small>{item.type} - {item.contact || item.property || item.owner}</small>
            </article>
          ))}
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function buildActivityBars(activities: ActivityRecord[], days: 7 | 14 | 30) {
  const visibleDays = days === 7 ? 8 : days === 14 ? 10 : 12;
  const today = new Date();
  const buckets = Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (visibleDays - index - 1));
    const label = date.toLocaleDateString("it-IT", { day: "numeric", month: "short" }).replace(".", "");
    return {
      label,
      value: 0,
    };
  });

  activities.slice(0, days).forEach((activity, index) => {
    const bucketIndex = buckets.length - 1 - (index % buckets.length);
    buckets[bucketIndex].value += /telefonata/i.test(activity.type) ? 2 : 1;
  });

  const maxValue = Math.max(1, ...buckets.map((bucket) => bucket.value));
  return buckets.map((bucket) => ({
    ...bucket,
    height: Math.max(8, Math.round((bucket.value / maxValue) * 100)),
  }));
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
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [propertyView, setPropertyView] = useState<"list" | "map">("list");
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const baseRows = data.properties.filter((item) => {
    if (pageKey === "immobili-vendite") {
      return item.kind === "vendita";
    }
    if (pageKey === "immobili-affitti") {
      return item.kind === "affitto";
    }
    return true;
  });
  const filteredBaseRows = baseRows.filter((item) => {
    const ownerName = splitFullName(item.owner);
    const details = item.details ?? {};
    const selectedFilters = activeDomainFilters(filters);
    const {
      minimumPrice,
      maximumPrice,
      minimumArea,
      maximumArea,
      minimumRooms,
      ...textFilters
    } = selectedFilters;
    const textMatches = matchesStructuredFilters(textFilters, {
      Nome: ownerName.firstName || item.owner || item.title,
      Cognome: ownerName.lastName || item.owner,
      Numero: item.phone || "",
      "Codice fiscale": item.taxCode || "",
      Foglio: item.sheet || "",
      Particella: item.parcel || "",
      Subalterno: item.subaltern || "",
      "Categoria catastale": item.cadastralCategory || "",
      Vani: item.rooms || "",
      referenceCode: details.referenceCode || item.code,
      title: item.title,
      managementType: details.managementType || item.kind,
      propertyType: details.propertyType || "",
      commercialStatus: details.commercialStatus || item.status,
      assignedAgent: details.assignedAgent || "",
      municipality: details.municipality || item.zone,
      district: details.district || item.zone,
      street: details.street || "",
      ownerName: item.owner,
      ownerPhone: item.phone || "",
      cadastralSheet: item.sheet || details.cadastralSheet || "",
      cadastralParcel: item.parcel || details.cadastralParcel || "",
      cadastralSubaltern: item.subaltern || details.cadastralSubaltern || "",
      cadastralCategory: item.cadastralCategory || details.cadastralCategory || "",
      energyClass: details.energyClass || "",
      isAuction: details.isAuction || "No",
      publishedOnly:
        details.publishOnWebsite === "Si" || !/bozza|privato/i.test(item.portals)
          ? "Si"
          : "No",
    });
    const price = parseNumericValue(item.price || details.askingPrice);
    const area = parseNumericValue(details.commercialArea);
    const rooms = parseNumericValue(item.rooms || details.rooms);
    return (
      textMatches &&
      (!minimumPrice || price >= parseNumericValue(minimumPrice)) &&
      (!maximumPrice || price <= parseNumericValue(maximumPrice)) &&
      (!minimumArea || area >= parseNumericValue(minimumArea)) &&
      (!maximumArea || area <= parseNumericValue(maximumArea)) &&
      (!minimumRooms || rooms >= parseNumericValue(minimumRooms))
    );
  });
  const rows = useFilteredRows(filteredBaseRows, query, (item) =>
    [
      item.code,
      item.title,
      item.zone,
      item.status,
      item.owner,
      item.phone,
      item.taxCode,
      item.sheet,
      item.parcel,
      item.subaltern,
      item.cadastralCategory,
      item.rooms,
    ].join(" "),
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
            onSubmit={(values) => {
              setFilters(values);
              onAction(`Ricerca immobili eseguita per ${valuesSummary(values)}.`);
            }}
          />
        </Panel>
      ) : null}
      {!newMode ? (
        <Panel className="span-12" title="Vista e operazioni elenco">
          <div className="tool-grid">
            <ToolButton
              label={showPropertyDetails ? "Nascondi dettagli" : "Mostra dettagli"}
              Icon={PanelsTopLeft}
              onClick={() => setShowPropertyDetails((visible) => !visible)}
            />
            <ToolButton
              label={propertyView === "map" ? "Visualizza elenco" : "Visualizza mappa"}
              Icon={propertyView === "map" ? ListChecks : MapPinned}
              onClick={() => setPropertyView((view) => (view === "map" ? "list" : "map"))}
            />
            <ToolButton
              label="Stampa elenco"
              Icon={FileBadge}
              onClick={() => window.print()}
            />
          </div>
        </Panel>
      ) : null}
      <Panel
        className={searchMode ? "span-7" : "span-8"}
        title={newMode ? "Schede recenti" : "Archivio immobili"}
        action={activeFilters(filters).length ? "Azzera filtri" : "Filtri"}
        onPanelAction={() => {
          setFilters({});
          onAction("Filtri immobili azzerati.");
        }}
      >
        {propertyView === "map" && !newMode ? (
          <div className="map-strip">
            {rows.length ? rows.map((item) => (
              <button key={item.id} type="button" onClick={() => onAction(`Immobile ${item.code} selezionato sulla mappa.`)}>
                <MapPinned size={18} />
                <strong>{item.title}</strong>
                <span>{item.zone} / {item.price}</span>
              </button>
            )) : (
              <EmptyState title="Nessun immobile da mostrare" text="Modifica i filtri per popolare la vista mappa." />
            )}
          </div>
        ) : (
          <DataTable
            columns={showPropertyDetails
              ? ["Codice", "Immobile", "Zona", "Stato", "Prezzo", "Catasto", "Superficie", "Locali", "Portali"]
              : ["Codice", "Immobile", "Zona", "Stato", "Prezzo", "Catasto", "Portali"]}
            rows={rows.map((item) => showPropertyDetails
              ? [
                  item.code,
                  item.title,
                  item.zone,
                  item.status,
                  item.price,
                  cadastralLabel(item),
                  item.details?.commercialArea ? `${item.details.commercialArea} m²` : "-",
                  item.rooms || item.details?.rooms || "-",
                  item.portals,
                ]
              : [
                  item.code,
                  item.title,
                  item.zone,
                  item.status,
                  item.price,
                  cadastralLabel(item),
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
        )}
      </Panel>
      <Panel
        className={newMode ? "span-12 crm-form-panel" : "span-4"}
        title={newMode ? "Scheda immobile completa" : "Filtri avanzati"}
      >
        <StructuredQuickForm
          requiredDefault={false}
          sections={newMode ? propertyFormSections : propertyFilterSections}
          submitLabel={newMode ? "Crea scheda" : "Applica filtri"}
          onSubmit={(values) => {
            if (!newMode) {
              setFilters(activeDomainFilters(values));
              onAction(`Filtro immobili applicato: ${valuesSummary(activeDomainFilters(values))}.`);
              return;
            }
            const managementType = fieldValue(values, "managementType", "Vendita");
            const newProperty: PropertyRecord = {
              id: makeId("property"),
              code: fieldValue(
                values,
                "referenceCode",
                `FS-${String(250 + data.properties.length).padStart(3, "0")}`,
              ),
              title: fieldValue(values, "title", "Nuovo immobile"),
              zone: fieldValue(
                values,
                "district",
                fieldValue(values, "municipality", "Zona da definire"),
              ),
              status: fieldValue(values, "commercialStatus", "Bozza"),
              price: fieldValue(values, "askingPrice", "Da valutare"),
              owner: fieldValue(values, "ownerName", "Proprietario da associare"),
              portals: fieldValue(values, "publishOnPortals") === "Si" ? "Da sincronizzare" : "Bozza",
              kind: managementType.toLowerCase().includes("affitto") ? "affitto" : "vendita",
              phone: fieldValue(values, "ownerPhone"),
              taxCode: fieldValue(values, "ownerTaxCode"),
              sheet: fieldValue(values, "cadastralSheet"),
              parcel: fieldValue(values, "cadastralParcel"),
              subaltern: fieldValue(values, "cadastralSubaltern"),
              cadastralCategory: fieldValue(values, "cadastralCategory"),
              rooms: fieldValue(values, "cadastralRooms", fieldValue(values, "rooms")),
              source: fieldValue(values, "acquisitionSource", "Inserimento manuale"),
              details: values,
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
              requests: currentData.requests.map((request) => {
                const rankedProperties = currentData.properties
                  .map((property) => ({
                    property,
                    score: calculateRequestMatch(request, property),
                  }))
                  .sort((first, second) => second.score - first.score);
                const bestMatch = rankedProperties.find(({ score }) => score > 0);
                return {
                  ...request,
                  match: bestMatch ? `${bestMatch.score}%` : "0%",
                  proposal: bestMatch?.property.title || "Da abbinare",
                  status:
                    request.status === "Nuova" && bestMatch && bestMatch.score >= 60
                      ? "Qualificata"
                      : request.status,
                  updatedAt: nowLabel(),
                };
              }),
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
      <Panel
        className={pageKey === "richieste-nuova" ? "span-12 crm-form-panel" : "span-4"}
        title={pageKey === "richieste-nuova" ? "Preferenza completa" : "Filtro richieste"}
      >
        {pageKey === "richieste-nuova" ? (
          <StructuredQuickForm
            requiredDefault={false}
            sections={requestFormSections}
            submitLabel="Salva richiesta"
            onSubmit={(values) => {
              const rankedProperties = data.properties
                .map((property) => ({
                  property,
                  score: calculateRequestMatch({ details: values }, property),
                }))
                .sort((first, second) => second.score - first.score);
              const bestMatch = rankedProperties.find(({ score }) => score > 0);
              const newRequest: RequestRecord = {
                id: makeId("request"),
                client: fieldValue(values, "contactId", "Nuovo cliente"),
                target: [
                  fieldValue(values, "managementType", "Acquisto"),
                  fieldValue(values, "preferredPropertyTypes", "Immobile"),
                  fieldValue(values, "maximumBudget")
                    ? `fino a ${fieldValue(values, "maximumBudget")}`
                    : "budget da definire",
                ].join(" / "),
                area: fieldValue(values, "preferredAreas", "Zona da definire"),
                match: bestMatch ? `${bestMatch.score}%` : "0%",
                proposal: bestMatch?.property.title || "Da abbinare",
                status: fieldValue(values, "requestStatus", "Nuova"),
                details: values,
                updatedAt: nowLabel(),
              };
              onCommit(
                (currentData) => ({
                  ...currentData,
                  requests: [newRequest, ...currentData.requests],
                  contacts: currentData.contacts.some((contact) => sameLabel(contact.name, newRequest.client))
                    ? currentData.contacts
                    : [
                        {
                          id: makeId("contact"),
                          name: newRequest.client,
                          type: "Acquirente",
                          status: "Richiesta inserita",
                          source: "Richieste",
                          owner: fieldValue(values, "assignedAgent", "Daniele"),
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
        ) : (
          <QuickForm
            button="Applica filtro"
            fields={searchFilterFields}
            required={false}
            onSubmit={(values) => onAction(`Filtro richieste applicato: ${valuesSummary(values)}.`)}
          />
        )}
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
  const [filters, setFilters] = useState<Record<string, string>>({});
  const filteredContacts = data.contacts.filter((item) => {
    const splitName = splitFullName(item.name);
    const details = item.details ?? {};
    const selectedFilters = activeDomainFilters(filters);
    const {
      nextContactFrom,
      nextContactTo,
      includeDoNotContact,
      ...textFilters
    } = selectedFilters;
    const nextContactDate = details.nextContactDate || "";
    return matchesStructuredFilters(textFilters, {
      Nome: item.firstName || splitName.firstName || item.name,
      Cognome: item.lastName || splitName.lastName || item.name,
      Numero: item.phone || "",
      "Codice fiscale": item.taxCode || "",
      Foglio: item.sheet || "",
      Particella: item.parcel || "",
      Subalterno: item.subaltern || "",
      "Categoria catastale": item.cadastralCategory || "",
      Vani: item.rooms || "",
      firstName: item.firstName || splitName.firstName || item.name,
      lastName: item.lastName || splitName.lastName || item.name,
      companyName: details.companyName || "",
      phone: item.phone || details.primaryPhone || "",
      email: item.email || details.primaryEmail || "",
      taxCode: item.taxCode || details.taxCode || "",
      primaryRole: details.primaryRole || item.type,
      contactStatus: details.contactStatus || item.status,
      acquisitionSource: details.acquisitionSource || item.source,
      assignedAgent: details.assignedAgent || item.owner,
      tag: details.tags || "",
      hasPrivacyConsent:
        details.privacyLegalBasis === "Consenso" && !details.privacyRevocationDate
          ? "Si"
          : "No",
    }) &&
      (!nextContactFrom || (!!nextContactDate && nextContactDate >= nextContactFrom)) &&
      (!nextContactTo || (!!nextContactDate && nextContactDate <= nextContactTo)) &&
      (includeDoNotContact === "Si" || details.doNotContact !== "Si");
  });
  const rows = useFilteredRows(filteredContacts, query, (item) =>
    [
      item.name,
      item.firstName,
      item.lastName,
      item.phone,
      item.email,
      item.taxCode,
      item.type,
      item.status,
      item.source,
      item.owner,
      item.sheet,
      item.parcel,
      item.subaltern,
      item.cadastralCategory,
      item.rooms,
    ].join(" "),
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
      <Panel
        className="span-8"
        title="Database clienti"
        action={activeFilters(filters).length ? "Azzera filtri" : "Filtri"}
        onPanelAction={() => {
          setFilters({});
          onAction("Filtri clienti azzerati.");
        }}
      >
        <DataTable
          columns={["Nominativo", "Tipologia", "Contatti", "Ultima attività", "Operatore", "Ricontatto", "Privacy", "Stato"]}
          rows={rows.map((item) => {
            const latestActivity = data.activities.find((activity) => sameLabel(activity.contact, item.name));
            const details = item.details ?? {};
            return [
              item.name,
              item.type,
              [item.phone, item.email].filter(Boolean).join(" / ") || "-",
              latestActivity?.updatedAt || "-",
              item.owner || "-",
              details.nextContactDate || item.nextStep || "-",
              details.privacyRevocationDate
                ? "Revocata"
                : details.doNotContact === "Si"
                ? "Non contattare"
                : details.privacyLegalBasis || "Da verificare",
              item.status,
            ];
          })}
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
      <Panel
        className={pageKey === "nominativi-nuovo" ? "span-12 crm-form-panel" : "span-4"}
        title={pageKey === "nominativi-nuovo" ? "Anagrafica completa" : "Filtri nominativi"}
      >
        <StructuredQuickForm
          requiredDefault={false}
          sections={pageKey === "nominativi-nuovo" ? contactFormSections : contactFilterSections}
          submitLabel={pageKey === "nominativi-nuovo" ? "Aggiungi nominativo" : "Applica filtri"}
          onSubmit={(values) => {
            if (pageKey !== "nominativi-nuovo") {
              const selectedFilters = activeDomainFilters(values);
              setFilters(selectedFilters);
              onAction(`Filtro clienti applicato: ${valuesSummary(selectedFilters)}.`);
              return;
            }
            const firstName = fieldValue(values, "firstName");
            const lastName = fieldValue(values, "lastName");
            const fullName = formatFullName(firstName, lastName);
            const newContact: ContactRecord = {
              id: makeId("contact"),
              name: fullName,
              firstName,
              lastName,
              type: fieldValue(values, "primaryRole", "Da qualificare"),
              status: fieldValue(values, "contactStatus", "Nuovo cliente"),
              source: fieldValue(values, "acquisitionSource", "Manuale"),
              owner: fieldValue(values, "assignedAgent", "Daniele"),
              phone: fieldValue(values, "primaryPhone"),
              email: fieldValue(values, "primaryEmail"),
              taxCode: fieldValue(values, "taxCode"),
              note: fieldValue(values, "contactNotes", "Inserito manualmente."),
              nextStep: [
                fieldValue(values, "nextContactDate"),
                fieldValue(values, "nextContactTime"),
                fieldValue(values, "nextContactReason"),
              ].filter(Boolean).join(" / ") || "Primo contatto",
              details: values,
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                contacts: [newContact, ...currentData.contacts],
                activities: [
                  createActivity({
                    title: `Nuovo nominativo ${newContact.name}`,
                    type: "Anagrafica",
                    contact: newContact.name,
                    note: `${newContact.type} da ${newContact.source}.`,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Nominativo ${newContact.name} aggiunto.`,
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

function propertyOwnerNames(property: PropertyRecord) {
  return property.owner
    .split(",")
    .map((owner) => owner.trim())
    .filter(Boolean);
}

function propertiesForContact(contact: ContactRecord, properties: PropertyRecord[]) {
  return properties.filter((property) => {
    const ownerMatch = propertyOwnerNames(property).some((owner) => sameLabel(owner, contact.name));
    return ownerMatch || sameLabel(contact.property || "", property.title) || sameLabel(contact.property || "", property.code);
  });
}

function isOwnerContact(contact: ContactRecord, properties: PropertyRecord[]) {
  return /proprietario/i.test(contact.type) || contact.source === "Censimento" || propertiesForContact(contact, properties).length > 0;
}

function OwnersView({
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
  const [filters, setFilters] = useState<Record<string, string>>({});
  const ownerBase = data.contacts
    .filter((contact) => isOwnerContact(contact, data.properties))
    .filter((contact) => {
      const splitName = splitFullName(contact.name);
      return matchesStructuredFilters(filters, {
        Nome: contact.firstName || splitName.firstName || contact.name,
        Cognome: contact.lastName || splitName.lastName || contact.name,
        Numero: contact.phone || "",
        "Codice fiscale": contact.taxCode || "",
        Foglio: contact.sheet || "",
        Particella: contact.parcel || "",
        Subalterno: contact.subaltern || "",
        "Categoria catastale": contact.cadastralCategory || "",
        Vani: contact.rooms || "",
      });
    });
  const owners = useFilteredRows(ownerBase, query, (contact) =>
    [
      contact.name,
      contact.firstName,
      contact.lastName,
      contact.phone,
      contact.taxCode,
      contact.type,
      contact.status,
      contact.property,
      contact.note,
      propertiesForContact(contact, data.properties).map((property) => property.title).join(" "),
    ].join(" "),
  );
  const linkMode = pageKey === "proprietari-collega";

  function upsertOwner(values: Record<string, string>) {
    const firstName = fieldValue(values, "Nome");
    const lastName = fieldValue(values, "Cognome");
    const ownerName = formatFullName(firstName, lastName, fieldValue(values, "Proprietario", "Proprietario da definire"));
    const propertyLabel = fieldValue(values, "Immobile collegato");
    const phone = fieldValue(values, "Numero") || fieldValue(values, "Telefono");
    const taxCode = fieldValue(values, "Codice fiscale");
    const sheet = fieldValue(values, "Foglio");
    const parcel = fieldValue(values, "Particella");
    const subaltern = fieldValue(values, "Subalterno");
    const cadastralCategory = fieldValue(values, "Categoria catastale");
    const rooms = fieldValue(values, "Vani");
    const note = fieldValue(values, "Nota", propertyLabel ? `Collegato a ${propertyLabel}` : "Proprietario da sviluppare");

    onCommit(
      (currentData) => {
        const contactExists = currentData.contacts.some(
          (contact) => sameLabel(contact.name, ownerName) || (!!phone && contact.phone === phone),
        );
        const updatedContacts = contactExists
          ? currentData.contacts.map((contact) =>
              sameLabel(contact.name, ownerName) || (!!phone && contact.phone === phone)
                ? {
                    ...contact,
                    name: ownerName,
                    firstName: firstName || contact.firstName,
                    lastName: lastName || contact.lastName,
                    type: /proprietario/i.test(contact.type) ? contact.type : `${contact.type} / Proprietario`,
                    status: propertyLabel ? "Proprietario collegato" : "Proprietario da collegare",
                    phone: phone || contact.phone,
                    taxCode: taxCode || contact.taxCode,
                    sheet: sheet || contact.sheet,
                    parcel: parcel || contact.parcel,
                    subaltern: subaltern || contact.subaltern,
                    cadastralCategory: cadastralCategory || contact.cadastralCategory,
                    rooms: rooms || contact.rooms,
                    property: propertyLabel || contact.property,
                    note,
                    nextStep: propertyLabel ? "Sviluppare immobile collegato" : "Associare immobile",
                    updatedAt: nowLabel(),
                  }
                : contact,
            )
          : [
              {
                id: makeId("contact"),
                name: ownerName,
                firstName,
                lastName,
                type: "Proprietario",
                status: propertyLabel ? "Proprietario collegato" : "Proprietario da collegare",
                source: "Proprietari",
                owner: "Daniele",
                phone,
                taxCode,
                sheet,
                parcel,
                subaltern,
                cadastralCategory,
                rooms,
                property: propertyLabel,
                note,
                nextStep: propertyLabel ? "Sviluppare immobile collegato" : "Associare immobile",
                updatedAt: nowLabel(),
              },
              ...currentData.contacts,
            ];
        const propertyExists = currentData.properties.some(
          (property) => sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel),
        );
        const updatedProperties = !propertyLabel
          ? currentData.properties
          : propertyExists
            ? currentData.properties.map((property) =>
                sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel)
                  ? {
                      ...property,
                      owner: appendOwnerLabel(property.owner, ownerName),
                      status: "Proprietario collegato",
                      phone: phone || property.phone,
                      taxCode: taxCode || property.taxCode,
                      sheet: sheet || property.sheet,
                      parcel: parcel || property.parcel,
                      subaltern: subaltern || property.subaltern,
                      cadastralCategory: cadastralCategory || property.cadastralCategory,
                      rooms: rooms || property.rooms,
                      updatedAt: nowLabel(),
                    }
                  : property,
              )
            : [
                {
                  id: makeId("property"),
                  code: `FS-${String(250 + currentData.properties.length).padStart(3, "0")}`,
                  title: propertyLabel,
                  zone: "Da censire",
                  status: "Censito",
                  price: "Da valutare",
                  owner: ownerName,
                  portals: "Privato",
                  kind: "vendita" as const,
                  phone,
                  taxCode,
                  sheet,
                  parcel,
                  subaltern,
                  cadastralCategory,
                  rooms,
                  source: "Proprietari",
                  updatedAt: nowLabel(),
                },
                ...currentData.properties,
              ];

        return {
          ...currentData,
          contacts: updatedContacts,
          properties: updatedProperties,
          activities: [
            createActivity({
              title: `Collegamento proprietario ${ownerName}`,
              type: "Proprietario",
              contact: ownerName,
              property: propertyLabel,
              note,
            }),
            ...currentData.activities,
          ],
        };
      },
      propertyLabel ? `${ownerName} collegato a ${propertyLabel}.` : `${ownerName} salvato come proprietario.`,
    );
  }

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Proprietari"
        page={labelForPage("proprietari", pageKey)}
        path={pathForPage(pageKey)}
        items={["Cliente -> immobile", "Immobile -> proprietari", "Proprietario -> attivita"]}
      />
      <Panel className="span-12" title="Regola operativa">
        <div className="scope-strip">
          <span>
            <strong>Cliente e proprietario</strong>
            <small>La stessa persona resta in anagrafica clienti e diventa proprietaria quando viene collegata a un immobile.</small>
          </span>
          <span>
            <strong>Immobili collegati</strong>
            <small>Ogni immobile puo avere uno o piu proprietari, separati nella scheda con storico attivita dedicato.</small>
          </span>
          <span>
            <strong>Sviluppo</strong>
            <small>Telefonate, esiti e follow-up finiscono sempre nella sezione Attivita.</small>
          </span>
        </div>
      </Panel>
      <Panel
        className={linkMode ? "span-8" : "span-12"}
        title="Archivio proprietari"
        action={activeFilters(filters).length ? "Azzera filtri" : "Filtri"}
        onPanelAction={() => {
          setFilters({});
          onAction("Filtri proprietari azzerati.");
        }}
      >
        <DataTable
          columns={["Proprietario", "Numero", "Immobili", "Catasto", "Stato", "Prossimo passo"]}
          rows={owners.map((owner) => {
            const linkedProperties = propertiesForContact(owner, data.properties);
            return [
              owner.name,
              owner.phone || "-",
              linkedProperties.map((property) => property.code || property.title).join(", ") || owner.property || "-",
              cadastralLabel(owner),
              owner.status,
              owner.nextStep,
            ];
          })}
          actions={[
            {
              label: "Ricontatto",
              onClick: (rowIndex) => {
                const owner = owners[rowIndex];
                if (!owner) {
                  return;
                }
                onCommit(
                  (currentData) => ({
                    ...currentData,
                    contacts: currentData.contacts.map((contact) =>
                      contact.id === owner.id
                        ? { ...contact, status: "Ricontatto fissato", nextStep: "Domani", updatedAt: nowLabel() }
                        : contact,
                    ),
                    activities: [
                      createActivity({
                        title: `Ricontatto proprietario ${owner.name}`,
                        type: "Telefonata",
                        contact: owner.name,
                        property: owner.property || propertiesForContact(owner, currentData.properties)[0]?.title || "",
                        note: owner.note,
                        day: "Domani",
                      }),
                      ...currentData.activities,
                    ],
                  }),
                  `Ricontatto proprietario fissato per ${owner.name}.`,
                );
              },
            },
          ]}
        />
      </Panel>
      <Panel className={linkMode ? "span-4 crm-form-panel" : "span-12"} title={linkMode ? "Collega a immobile" : "Filtro proprietari"}>
        <QuickForm
          button={linkMode ? "Collega proprietario" : "Filtra proprietari"}
          fields={linkMode
            ? [
                "Nome",
                "Cognome",
                { name: "Numero", required: false },
                "Immobile collegato",
                { name: "Codice fiscale", required: false },
                { name: "Foglio", required: false },
                { name: "Particella", required: false },
                { name: "Subalterno", required: false },
                { name: "Categoria catastale", options: cadastralCategoryOptions, required: false },
                { name: "Vani", options: roomOptions, required: false },
                { name: "Nota", required: false },
              ]
            : searchFilterFields}
          required={linkMode}
          onSubmit={(values) => {
            if (!linkMode) {
              setFilters(values);
              onAction(`Filtro proprietari applicato: ${valuesSummary(values)}.`);
              return;
            }
            upsertOwner(values);
          }}
        />
      </Panel>
    </div>
  );
}

function ActivityCenterView({
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
  const [filters, setFilters] = useState<Record<string, string>>({});
  const filteredActivities = data.activities.filter((item) => {
    const linkedContact = data.contacts.find((contact) => sameLabel(contact.name, item.contact));
    const splitName = splitFullName(item.contact);
    const linkedProperty = data.properties.find((property) => sameLabel(property.title, item.property) || sameLabel(property.code, item.property));
    return matchesStructuredFilters(filters, {
      Nome: linkedContact?.firstName || splitName.firstName || item.contact,
      Cognome: linkedContact?.lastName || splitName.lastName || item.contact,
      Numero: linkedContact?.phone || linkedProperty?.phone || "",
      "Codice fiscale": linkedContact?.taxCode || linkedProperty?.taxCode || "",
      Foglio: linkedContact?.sheet || linkedProperty?.sheet || "",
      Particella: linkedContact?.parcel || linkedProperty?.parcel || "",
      Subalterno: linkedContact?.subaltern || linkedProperty?.subaltern || "",
      "Categoria catastale": linkedContact?.cadastralCategory || linkedProperty?.cadastralCategory || "",
      Vani: linkedContact?.rooms || linkedProperty?.rooms || "",
    });
  });
  const rows = useFilteredRows(filteredActivities, query, (item) =>
    [item.time, item.title, item.type, item.owner, item.contact, item.property, item.status, item.note, item.day].join(" "),
  );
  const newMode = pageKey === "attivita-nuova";
  const openRows = rows.filter((activity) => !/completata|annullata/i.test(activity.status));
  const callRows = rows.filter((activity) => /telefonata|whatsapp|email/i.test(activity.type));
  const visitRows = rows.filter((activity) => /visita|appuntamento/i.test(activity.type));

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Attivita"
        page={labelForPage("attivita", pageKey)}
        path={pathForPage(pageKey)}
        items={["Attivita -> esito", "Esito -> storico", "Follow-up -> agenda"]}
      />
      <div className="kpi-row">
        <KpiCard label="Aperte" value={String(openRows.length)} trend="da lavorare" Icon={ClipboardCheck} />
        <KpiCard label="Telefonate" value={String(callRows.length)} trend="storico" Icon={PhoneCall} />
        <KpiCard label="Visite" value={String(visitRows.length)} trend="agenda" Icon={CalendarDays} />
        <KpiCard label="Completate" value={String(rows.length - openRows.length)} trend="chiuse" Icon={CheckCircle2} />
      </div>
      <Panel
        className={newMode ? "span-8" : "span-12"}
        title="Storico attivita"
        action={activeFilters(filters).length ? "Azzera filtri" : "Filtri"}
        onPanelAction={() => {
          setFilters({});
          onAction("Filtri attivita azzerati.");
        }}
      >
        <DataTable
          columns={["Quando", "Titolo", "Tipo", "Contatto", "Immobile", "Stato", "Note"]}
          rows={rows.map((activity) => [
            `${activity.day} ${activity.time}`,
            activity.title,
            activity.type,
            activity.contact || "-",
            activity.property || "-",
            activity.status,
            activity.note || "-",
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
                      item.id === activity.id ? { ...item, status: "Completata", updatedAt: nowLabel() } : item,
                    ),
                    contacts: currentData.contacts.map((contact) =>
                      sameLabel(contact.name, activity.contact)
                        ? { ...contact, status: "Attivita completata", nextStep: "Valutare prossimo sviluppo", updatedAt: nowLabel() }
                        : contact,
                    ),
                  }),
                  `Attivita "${activity.title}" completata.`,
                );
              },
            },
            {
              label: "Follow-up",
              onClick: (rowIndex) => {
                const activity = rows[rowIndex];
                if (!activity) {
                  return;
                }
                onCommit(
                  (currentData) => ({
                    ...currentData,
                    activities: [
                      createActivity({
                        title: `Follow-up ${activity.contact || activity.title}`,
                        type: activity.type,
                        contact: activity.contact,
                        property: activity.property,
                        note: `Da precedente: ${activity.note || activity.title}`,
                        day: "Domani",
                      }),
                      ...currentData.activities,
                    ],
                  }),
                  `Follow-up creato per ${activity.contact || activity.title}.`,
                );
              },
            },
          ]}
        />
      </Panel>
      <Panel className={newMode ? "span-12 crm-form-panel" : "span-12"} title={newMode ? "Nuova attività completa" : "Filtro attività"}>
        {newMode ? (
          <StructuredQuickForm
            requiredDefault={false}
            sections={activityFormSections}
            submitLabel="Salva attività"
            onSubmit={(values) => {
              const contactName = fieldValue(values, "contactId", "Contatto da definire");
              const activityType = fieldValue(values, "activityType", "Telefonata");
              const startDate = fieldValue(values, "startDate");
              const startTime = fieldValue(values, "startTime", currentTimeLabel());
              const day = activityDayForDate(startDate);
              const nextStep = [
                fieldValue(values, "nextStep"),
                fieldValue(values, "nextStepDate"),
                fieldValue(values, "nextStepTime"),
              ].filter(Boolean).join(" / ") || (day === "Oggi" ? "Aggiornare esito" : day);
              const newActivity = createActivity({
                time: [startDate, startTime].filter(Boolean).join(" "),
                title: fieldValue(values, "title", `${activityType} ${contactName}`),
                type: activityType,
                contact: contactName,
                property: fieldValue(values, "propertyId"),
                owner: fieldValue(values, "assignedOperator", "Daniele"),
                status: fieldValue(values, "activityStatus", "Da confermare"),
                note: [fieldValue(values, "outcome"), fieldValue(values, "notes")].filter(Boolean).join(" - "),
                day,
                details: values,
              });
              onCommit(
                (currentData) => ({
                  ...currentData,
                  activities: [newActivity, ...currentData.activities],
                  contacts: currentData.contacts.map((contact) =>
                    sameLabel(contact.name, contactName)
                      ? { ...contact, status: newActivity.status, nextStep, updatedAt: nowLabel() }
                      : contact,
                  ),
                }),
                `Attività salvata per ${contactName}.`,
              );
            }}
          />
        ) : (
          <QuickForm
            button="Filtra attività"
            fields={searchFilterFields}
            required={false}
            onSubmit={(values) => {
              setFilters(values);
              onAction(`Filtro attività applicato: ${valuesSummary(values)}.`);
            }}
          />
        )}
      </Panel>
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
  const [calendarMode, setCalendarMode] = useState<"week" | "month" | "day">("week");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const newMode = pageKey === "agenda-nuova";
  const filteredActivities = data.activities.filter((item) => {
    const linkedContact = data.contacts.find((contact) => sameLabel(contact.name, item.contact));
    const splitName = splitFullName(item.contact);
    const linkedProperty = data.properties.find((property) => sameLabel(property.title, item.property) || sameLabel(property.code, item.property));
    return matchesStructuredFilters(filters, {
      Nome: linkedContact?.firstName || splitName.firstName || item.contact,
      Cognome: linkedContact?.lastName || splitName.lastName || item.contact,
      Numero: linkedContact?.phone || linkedProperty?.phone || "",
      "Codice fiscale": linkedContact?.taxCode || linkedProperty?.taxCode || "",
      Foglio: linkedContact?.sheet || linkedProperty?.sheet || "",
      Particella: linkedContact?.parcel || linkedProperty?.parcel || "",
      Subalterno: linkedContact?.subaltern || linkedProperty?.subaltern || "",
      "Categoria catastale": linkedContact?.cadastralCategory || linkedProperty?.cadastralCategory || "",
      Vani: linkedContact?.rooms || linkedProperty?.rooms || "",
    });
  });
  const rows = useFilteredRows(filteredActivities, query, (item) =>
    [item.time, item.title, item.type, item.owner, item.contact, item.property, item.status, item.note, item.day].join(" "),
  );
  const today = new Date();
  const tomorrow = new Date(today);
  const weekEnd = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  weekEnd.setDate(today.getDate() + 6);
  const todayIso = localIsoDate(today);
  const tomorrowIso = localIsoDate(tomorrow);
  const weekEndIso = localIsoDate(weekEnd);
  const currentMonth = todayIso.slice(0, 7);
  const rowsForCalendarColumn = (column: "Oggi" | "Domani" | "Settimana") =>
    rows.filter((item) => {
      const activityDate = activityIsoDate(item);
      if (!activityDate) {
        return item.day === column;
      }
      if (column === "Oggi") {
        return activityDate === todayIso;
      }
      if (column === "Domani") {
        return activityDate === tomorrowIso;
      }
      return activityDate > tomorrowIso && activityDate <= weekEndIso;
    });
  const currentMonthRows = rows.filter((item) => {
    const activityDate = activityIsoDate(item);
    return activityDate ? activityDate.startsWith(currentMonth) : true;
  });
  const todayRows = rowsForCalendarColumn("Oggi");
  const monthStats = [
    { label: "Attivita mese", value: currentMonthRows.length, detail: "mese corrente" },
    { label: "Telefonate", value: currentMonthRows.filter((item) => /telefonata/i.test(item.type)).length, detail: "contatti telefonici" },
    { label: "Visite", value: currentMonthRows.filter((item) => /visita|appuntamento/i.test(item.type)).length, detail: "visite e appuntamenti" },
    { label: "Completate", value: currentMonthRows.filter((item) => /completata/i.test(item.status)).length, detail: "attivita chiuse" },
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
        items={["Nuova attivita -> agenda", "Agenda -> storico", "Storico -> esito e follow-up"]}
      />
      <Panel
        className={newMode ? "span-8" : "span-8"}
        title={pageKey === "agenda-storico" ? "Ricerca storico attivita" : "Agenda operativa"}
        action={activeFilters(filters).length ? "Azzera filtri" : undefined}
        onPanelAction={() => {
          setFilters({});
          onAction("Filtri agenda azzerati.");
        }}
      >
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
                aria-label="Vai a oggi"
                type="button"
                onClick={() => setCalendarMode("day")}
              >
                Oggi
              </button>
              <button
                className={calendarMode === "month" ? "active" : ""}
                type="button"
                onClick={() => setCalendarMode("month")}
              >
                Mese
              </button>
              <button
                className={calendarMode === "week" ? "active" : ""}
                type="button"
                onClick={() => setCalendarMode("week")}
              >
                Settimana
              </button>
              <button
                className={calendarMode === "day" ? "active" : ""}
                type="button"
                onClick={() => setCalendarMode("day")}
              >
                Giorno
              </button>
            </div>
            {calendarMode === "week" ? (
              <div className="agenda-board">
                {(["Oggi", "Domani", "Settimana"] as const).map((column) => (
                  <div key={column}>
                    <h3>{column}</h3>
                    {rowsForCalendarColumn(column).length ? (
                      rowsForCalendarColumn(column).slice(0, 6).map((item) => (
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
            ) : calendarMode === "month" ? (
              <div className="month-board">
                {monthStats.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="agenda-board">
                <div>
                  <h3>Oggi</h3>
                  {todayRows.length ? (
                    todayRows.map((item) => (
                      <article key={`day-${item.id}`}>
                        <span>{item.time}</span>
                        <strong>{item.title}</strong>
                        <small>{item.owner} - {item.type} - {item.status}</small>
                      </article>
                    ))
                  ) : (
                    <EmptyState title="Nessuna attività per oggi" />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
      <Panel className={newMode ? "span-12 crm-form-panel" : "span-4"} title={newMode ? "Nuova attività completa" : "Filtro agenda"}>
        {newMode ? (
          <StructuredQuickForm
            requiredDefault={false}
            sections={activityFormSections}
            submitLabel="Pianifica"
            onSubmit={(values) => {
              const client = fieldValue(values, "contactId", "Cliente da definire");
              const date = fieldValue(values, "startDate");
              const hour = fieldValue(values, "startTime", currentTimeLabel());
              const dateTime = [date, hour].filter(Boolean).join(" ");
              const activityType = fieldValue(values, "activityType", "Appuntamento");
              const newActivity = createActivity({
                time: dateTime,
                title: fieldValue(values, "title", `${activityType} ${client}`),
                type: activityType,
                owner: fieldValue(values, "assignedOperator", "Daniele"),
                contact: client,
                property: fieldValue(values, "propertyId"),
                note: [fieldValue(values, "location"), fieldValue(values, "outcome"), fieldValue(values, "notes")]
                  .filter(Boolean)
                  .join(" - "),
                status: fieldValue(values, "activityStatus", "Da confermare"),
                day: activityDayForDate(date),
                details: values,
              });
              onCommit(
                (currentData) => ({
                  ...currentData,
                  activities: [newActivity, ...currentData.activities],
                  contacts: currentData.contacts.map((contact) =>
                    sameLabel(contact.name, client)
                      ? { ...contact, status: "Appuntamento pianificato", nextStep: dateTime, updatedAt: nowLabel() }
                      : contact,
                  ),
                }),
                `Appuntamento inserito per ${client}.`,
              );
            }}
          />
        ) : (
          <QuickForm
            button="Cerca"
            fields={searchFilterFields}
            required={false}
            onSubmit={(values) => {
              setFilters(values);
              onAction(`Ricerca agenda eseguita: ${valuesSummary(values)}.`);
            }}
          />
        )}
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
    [contact.name, contact.firstName, contact.lastName, contact.phone, contact.email, contact.type, contact.status, contact.source, contact.note, contact.nextStep].join(" "),
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
          columns={["Contatto", "Interesse", "Numero", "Stato", "Provenienza"]}
          rows={rows.map((contact) => [
            contact.name,
            contact.note || contact.type,
            contact.phone || "-",
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
          button={pageKey === "contatti-p-nuovo" ? "Salva lead" : "Converti / aggiorna"}
          fields={[
            { name: "Cerca nominativo", required: false, placeholder: "Cognome Nome Telefono Email" },
            "Nome",
            "Cognome",
            { name: "Tipo telefono", options: ["Cellulare", "Fisso"], required: false },
            "Numero",
            { name: "Email", required: false },
            "Provenienza",
            { name: "Esigenza", options: ["Vorrei acquistare", "Cerco affitto", "Vorrei vendere", "Cerco inquilino"], required: false },
            { name: "Immobile richiesto", required: false },
            { name: "Data ricezione", required: false },
            { name: "Ora ricezione", required: false },
            { name: "Mezzo di contatto", options: ["Telefono", "Email", "Persona", "Portale"], required: false },
            { name: "Operatore designato", required: false },
            { name: "Data designazione", required: false },
            { name: "Qualità contatto", options: ["Da valutare", "Scarso", "Sufficiente", "Buono", "Ottimo"], required: false },
            { name: "Prendi in carico", options: ["No", "Si"], required: false },
            { name: "Nota", required: false },
          ]}
          onSubmit={(values) => {
            const firstName = fieldValue(values, "Nome");
            const lastName = fieldValue(values, "Cognome");
            const name = formatFullName(firstName, lastName, "Lead pubblicitario");
            const property = fieldValue(values, "Immobile richiesto", data.properties[0]?.title || "Da abbinare");
            const newContact: ContactRecord = {
              id: makeId("contact"),
              name,
              firstName,
              lastName,
              type: property,
              status: pageKey === "contatti-p-nuovo" ? "Lead pubblicitario" : "Convertito in nominativo",
              source: fieldValue(values, "Provenienza", "Portale"),
              owner: "Daniele",
              phone: fieldValue(values, "Numero"),
              email: fieldValue(values, "Email"),
              note: [
                fieldValue(values, "Esigenza", "Lead da qualificare"),
                fieldValue(values, "Data ricezione"),
                fieldValue(values, "Ora ricezione"),
                fieldValue(values, "Mezzo di contatto"),
                fieldValue(values, "Operatore designato"),
                fieldValue(values, "Data designazione"),
                fieldValue(values, "Qualità contatto"),
                fieldValue(values, "Nota"),
              ].filter(Boolean).join(" - "),
              nextStep: fieldValue(values, "Prendi in carico") === "Si" ? "Preso in carico" : "Ricontatto commerciale",
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
  const [filters, setFilters] = useState<Record<string, string>>({});
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
  const censusPropertyBase = data.properties.filter((property) =>
    property.source === "Censimento" || /censito|proprietario collegato/i.test(property.status),
  );
  const censusProperties = useFilteredRows(censusPropertyBase, query, (property) =>
    [
      property.code,
      property.title,
      property.zone,
      property.owner,
      property.status,
      property.sheet,
      property.parcel,
      property.subaltern,
      property.cadastralCategory,
      property.rooms,
    ].join(" "),
  );
  const allCensusOwners = data.contacts.filter((contact) => /proprietario/i.test(contact.type) || contact.source === "Censimento");
  const censusOwnerBase = allCensusOwners
    .filter((contact) => {
      const splitName = splitFullName(contact.name);
      return matchesStructuredFilters(filters, {
        Nome: contact.firstName || splitName.firstName || contact.name,
        Cognome: contact.lastName || splitName.lastName || contact.name,
        Numero: contact.phone || "",
        "Codice fiscale": contact.taxCode || "",
        Foglio: contact.sheet || "",
        Particella: contact.parcel || "",
        Subalterno: contact.subaltern || "",
        "Categoria catastale": contact.cadastralCategory || "",
        Vani: contact.rooms || "",
      });
    });
  const censusOwners = useFilteredRows(
    censusOwnerBase,
    query,
    (contact) =>
      [
        contact.name,
        contact.firstName,
        contact.lastName,
        contact.type,
        contact.status,
        contact.note,
        contact.phone,
        contact.taxCode,
        contact.sheet,
        contact.parcel,
        contact.subaltern,
        contact.cadastralCategory,
        contact.rooms,
      ].join(" "),
  );
  const ownersTotal = allCensusOwners.length;
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
      label: "4. Immobili",
      value: censusPropertyBase.length,
      text: "Crea le unita immobiliari dentro il complesso.",
    },
    {
      label: "5. Proprietari",
      value: ownersTotal,
      text: "Collega clienti e proprietari agli immobili censiti.",
    },
  ];
  const pageTitle =
    pageKey === "censimento-contatti"
      ? "Contatti Censimento"
      : pageKey === "censimento-nuovo-contatto"
        ? "Nuovo contatto"
    : pageKey === "censimento-vie"
      ? "Vie censite"
      : pageKey === "censimento-complessi"
        ? "Complessi e palazzi"
        : pageKey === "censimento-immobili"
          ? "Immobili censiti"
        : pageKey === "censimento-proprietari"
          ? "Proprietari immobili"
          : "Zone censite";
  const formTitle =
    pageKey === "censimento-contatti"
      ? "Filtro contatti"
      : pageKey === "censimento-nuovo-contatto"
        ? "Nuovo contatto censimento"
    : pageKey === "censimento-vie"
      ? "Crea o seleziona via"
      : pageKey === "censimento-complessi"
        ? "Crea o seleziona complesso"
        : pageKey === "censimento-immobili"
          ? "Crea o seleziona immobile"
        : pageKey === "censimento-proprietari"
          ? "Collega proprietario"
          : "Crea o seleziona zona";
  const formFields =
    pageKey === "censimento-contatti"
      ? searchFilterFields
      : pageKey === "censimento-nuovo-contatto"
        ? [
            "Zona",
            "Via",
            "Civico",
            "Complesso",
            { name: "Estensione", options: ["Intero edificio", "Parte di edificio", "Unita immobiliare"], required: false },
            { name: "Numero piani", required: false },
            { name: "Piano", required: false },
            { name: "Scala", required: false },
            { name: "Foglio", required: false },
            { name: "Particella", required: false },
            { name: "Subalterno", required: false },
            { name: "Categoria catastale", options: cadastralCategoryOptions, required: false },
            { name: "Vani", options: roomOptions, required: false },
            { name: "Superficie", required: false },
            { name: "Occupazione", options: ["Libero", "Occupato", "Affittato", "Sconosciuto"], required: false },
            { name: "Ascensore", options: ["Non indicato", "Si", "No"], required: false },
            "Nome",
            "Cognome",
            { name: "Telefono", required: false },
            { name: "Email", required: false },
            { name: "Codice fiscale", required: false },
            { name: "Immobile collegato", required: false },
          ]
    : pageKey === "censimento-vie"
      ? ["Zona", "Via"]
      : pageKey === "censimento-complessi"
        ? ["Zona", "Via", "Palazzo / Complesso", "Unita"]
        : pageKey === "censimento-immobili"
          ? [
              "Zona",
              "Via",
              "Complesso",
              "Immobile",
              { name: "Foglio", required: false },
              { name: "Particella", required: false },
              { name: "Subalterno", required: false },
              { name: "Categoria catastale", options: cadastralCategoryOptions, required: false },
              { name: "Vani", options: roomOptions, required: false },
            ]
        : pageKey === "censimento-proprietari"
          ? [
              "Zona",
              "Via",
              "Complesso",
              "Nome",
              "Cognome",
              { name: "Numero", required: false },
              { name: "Codice fiscale", required: false },
              { name: "Foglio", required: false },
              { name: "Particella", required: false },
              { name: "Subalterno", required: false },
              { name: "Categoria catastale", options: cadastralCategoryOptions, required: false },
              { name: "Vani", options: roomOptions, required: false },
              { name: "Immobile collegato", required: false },
            ]
          : ["Zona"];
  const tableColumns =
    pageKey === "censimento-contatti" || pageKey === "censimento-nuovo-contatto"
      ? ["Cognome e nome", "Tipologia", "Zona/Via", "Telefono", "Catasto", "Ricontatto"]
      : pageKey === "censimento-vie"
      ? ["Zona", "Via", "Complessi", "Aggiornato"]
      : pageKey === "censimento-complessi"
        ? ["Zona", "Via", "Complesso", "Unita", "Proprietari"]
        : pageKey === "censimento-immobili"
          ? ["Codice", "Immobile", "Zona", "Proprietario", "Catasto", "Stato"]
        : pageKey === "censimento-proprietari"
          ? ["Proprietario", "Tipo", "Percorso", "Telefono", "Catasto", "Stato"]
          : ["Zona", "Vie/Palazzi", "Proprietari", "Aggiornato"];
  const tableRows =
    pageKey === "censimento-contatti" || pageKey === "censimento-nuovo-contatto"
      ? censusOwners.map((owner) => [
          owner.name,
          owner.type,
          owner.note || "-",
          owner.phone || "-",
          cadastralLabel(owner),
          owner.nextStep || owner.status,
        ])
      : pageKey === "censimento-vie"
      ? censusStreets.map((street) => [street.zone, street.street, String(street.complexes), street.updatedAt])
      : pageKey === "censimento-complessi"
        ? censusComplexes.map((complex) => [
            complex.zone,
            complex.street,
            complex.name,
            String(complex.units || "-"),
            String(complex.owners),
          ])
        : pageKey === "censimento-immobili"
          ? censusProperties.map((property) => [
              property.code,
              property.title,
              property.zone,
              property.owner || "-",
              cadastralLabel(property),
              property.status,
            ])
        : pageKey === "censimento-proprietari"
          ? censusOwners.map((owner) => [
              owner.name,
              owner.type,
              owner.note || "-",
              owner.phone || "-",
              cadastralLabel(owner),
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

  function linkOwnerToProperty(
    properties: PropertyRecord[],
    propertyLabel: string,
    zone: string,
    contactName: string,
    details: Partial<PropertyRecord> = {},
    linkAsOwner = true,
  ): PropertyRecord[] {
    if (!propertyLabel) {
      return properties;
    }

    const {
      phone: contactPhone,
      taxCode: contactTaxCode,
      ...propertyDetails
    } = details;
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
          owner: linkAsOwner ? contactName : "Proprietario da associare",
          portals: "Privato",
          kind: "vendita",
          ...(linkAsOwner ? details : propertyDetails),
          updatedAt: nowLabel(),
        },
        ...properties,
      ];
    }

    return properties.map((property) => {
      if (!sameLabel(property.title, propertyLabel) && !sameLabel(property.code, propertyLabel)) {
        return property;
      }

      const nextOwner = linkAsOwner
        ? appendOwnerLabel(property.owner, contactName)
        : removeOwnerLabel(property.owner, contactName);
      const ownerWasRemoved = !linkAsOwner && nextOwner === "Proprietario da associare";

      return {
        ...property,
        owner: nextOwner,
        status: linkAsOwner
          ? "Proprietario collegato"
          : ownerWasRemoved && property.status === "Proprietario collegato"
            ? "Censito"
            : property.status,
        phone: linkAsOwner
          ? contactPhone || property.phone
          : ownerWasRemoved
            ? ""
            : property.phone,
        taxCode: linkAsOwner
          ? contactTaxCode || property.taxCode
          : ownerWasRemoved
            ? ""
            : property.taxCode,
        sheet: details.sheet || property.sheet,
        parcel: details.parcel || property.parcel,
        subaltern: details.subaltern || property.subaltern,
        cadastralCategory: details.cadastralCategory || property.cadastralCategory,
        rooms: details.rooms || property.rooms,
        source: details.source || property.source,
        details: {
          ...property.details,
          ...details.details,
        },
        updatedAt: nowLabel(),
      };
    });
  }

  function saveCensus(values: Record<string, string>) {
    const zone = fieldValue(values, "Zona", fieldValue(values, "area", "Zona da definire"));
    const street = fieldValue(values, "Via", fieldValue(values, "street", "Via da definire"));
    const complexName =
      fieldValue(values, "Palazzo / Complesso") ||
      fieldValue(values, "Complesso") ||
      fieldValue(values, "buildingName", "Complesso da definire");
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

    if (pageKey === "censimento-immobili") {
      const propertyLabel = fieldValue(values, "Immobile", "Immobile da definire");
      const sheet = fieldValue(values, "Foglio");
      const parcel = fieldValue(values, "Particella");
      const subaltern = fieldValue(values, "Subalterno");
      const cadastralCategory = fieldValue(values, "Categoria catastale");
      const rooms = fieldValue(values, "Vani");
      onCommit(
        (currentData) => {
          const complexExists = (currentData.censusComplexes ?? []).some(
            (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, complexName),
          );
          const complexDelta = complexExists ? 0 : 1;
          const propertyExists = currentData.properties.some(
            (property) => sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel),
          );
          return {
            ...currentData,
            properties: propertyExists
              ? currentData.properties.map((property) =>
                  sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel)
                    ? {
                        ...property,
                        zone,
                        status: "Censito",
                        sheet: sheet || property.sheet,
                        parcel: parcel || property.parcel,
                        subaltern: subaltern || property.subaltern,
                        cadastralCategory: cadastralCategory || property.cadastralCategory,
                        rooms: rooms || property.rooms,
                        source: "Censimento",
                        updatedAt: nowLabel(),
                      }
                    : property,
                )
              : [
                  {
                    id: makeId("property"),
                    code: `FS-${String(250 + currentData.properties.length).padStart(3, "0")}`,
                    title: propertyLabel,
                    zone,
                    status: "Censito",
                    price: "Da valutare",
                    owner: "Proprietario da associare",
                    portals: "Privato",
                    kind: "vendita" as const,
                    sheet,
                    parcel,
                    subaltern,
                    cadastralCategory,
                    rooms,
                    source: "Censimento",
                    updatedAt: nowLabel(),
                  },
                  ...currentData.properties,
                ],
            censusAreas: ensureArea(currentData.censusAreas, zone, 0, complexDelta),
            censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street, complexDelta),
            censusComplexes: ensureComplex(currentData.censusComplexes ?? [], zone, street, complexName),
            activities: [
              createActivity({
                title: `Immobile censito ${propertyLabel}`,
                type: "Censimento",
                property: propertyLabel,
                note: `Zona: ${zone} / Via: ${street} / Complesso: ${complexName}`,
              }),
              ...currentData.activities,
            ],
          };
        },
        `Immobile ${propertyLabel} salvato nel censimento.`,
      );
      return;
    }

    const firstName = fieldValue(values, "Nome", fieldValue(values, "ownerFirstName"));
    const lastName = fieldValue(values, "Cognome", fieldValue(values, "ownerLastName"));
    const ownerName = formatFullName(firstName, lastName, fieldValue(values, "Proprietario", "Referente da definire"));
    const phone =
      fieldValue(values, "Numero") ||
      fieldValue(values, "Telefono") ||
      fieldValue(values, "primaryPhone");
    const email = fieldValue(values, "Email", fieldValue(values, "email"));
    const taxCode = fieldValue(values, "Codice fiscale", fieldValue(values, "ownerTaxCode"));
    const sheet = fieldValue(values, "Foglio", fieldValue(values, "cadastralSheet"));
    const parcel = fieldValue(values, "Particella", fieldValue(values, "cadastralParcel"));
    const subaltern = fieldValue(values, "Subalterno", fieldValue(values, "cadastralSubaltern"));
    const cadastralCategory = fieldValue(values, "Categoria catastale", fieldValue(values, "cadastralCategory"));
    const rooms = fieldValue(values, "Vani", fieldValue(values, "cadastralRooms", fieldValue(values, "rooms")));
    const propertyLabel = fieldValue(values, "Immobile collegato", fieldValue(values, "propertyLabel"));
    const contactType = fieldValue(values, "contactRole", "Referente");
    const isOwnerRole = /^(proprietario|comproprietario)$/i.test(contactType.trim());
    const contactStatus = fieldValue(
      values,
      "surveyStatus",
      isOwnerRole ? "Proprietario censito" : "Referente censito",
    );
    const censusNote = fieldValue(values, "surveyNotes");
    const nextContact = [
      fieldValue(values, "nextContactDate"),
      fieldValue(values, "nextContactTime"),
      fieldValue(values, "nextContactReason"),
    ].filter(Boolean).join(" / ");
    const ownerPath = `Zona: ${zone} / Via: ${street} / Complesso: ${complexName}`;

    onCommit(
      (currentData) => {
        const existingContact = currentData.contacts.find((contact) =>
          sameLabel(contact.name, ownerName),
        );
        const existingProperty = currentData.properties.find(
          (property) =>
            sameLabel(property.title, propertyLabel) ||
            sameLabel(property.code, propertyLabel),
        );
        const linkedAlready =
          !!existingContact &&
          /proprietario/i.test(existingContact.type) &&
          !!existingProperty &&
          propertyOwnerNames(existingProperty).some((owner) =>
            sameLabel(owner, ownerName),
          );
        const ownerDelta = isOwnerRole
          ? linkedAlready
            ? 0
            : 1
          : linkedAlready
            ? -1
            : 0;
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
                    firstName: firstName || contact.firstName,
                    lastName: lastName || contact.lastName,
                    type: contactType,
                    status: contactStatus,
                    phone: phone || contact.phone,
                    email: email || contact.email,
                    taxCode: taxCode || contact.taxCode,
                    sheet: sheet || contact.sheet,
                    parcel: parcel || contact.parcel,
                    subaltern: subaltern || contact.subaltern,
                    cadastralCategory: cadastralCategory || contact.cadastralCategory,
                    rooms: rooms || contact.rooms,
                    property: propertyLabel || contact.property,
                    note: censusNote || ownerPath,
                    nextStep: nextContact || (propertyLabel ? `Collegato a ${propertyLabel}` : "Associare immobile"),
                    details: values,
                    updatedAt: nowLabel(),
                  }
                : contact,
            )
          : [
              {
                id: makeId("contact"),
                name: ownerName,
                firstName,
                lastName,
                type: contactType,
                status: contactStatus,
                source: "Censimento",
                owner: fieldValue(values, "surveyOperator", "Daniele"),
                phone,
                email,
                taxCode,
                sheet,
                parcel,
                subaltern,
                cadastralCategory,
                rooms,
                property: propertyLabel,
                note: censusNote || ownerPath,
                nextStep: nextContact || (propertyLabel ? `Collegato a ${propertyLabel}` : "Associare immobile"),
                details: values,
                updatedAt: nowLabel(),
              },
              ...currentData.contacts,
            ];

        return {
          ...currentData,
          contacts: updatedContacts,
          properties: linkOwnerToProperty(
            currentData.properties,
            propertyLabel,
            zone,
            ownerName,
            {
              phone,
              taxCode,
              sheet,
              parcel,
              subaltern,
              cadastralCategory,
              rooms,
              source: "Censimento",
              details: values,
            },
            isOwnerRole,
          ),
          censusAreas: ensureArea(currentData.censusAreas, zone, ownerDelta, complexDelta),
          censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street, complexDelta),
          censusComplexes: ensureComplex(currentData.censusComplexes ?? [], zone, street, complexName, 0, ownerDelta),
          activities: [
            createActivity({
              title: `${isOwnerRole ? "Proprietario" : "Referente"} ${ownerName}`,
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
        ? `${ownerName} collegato come ${contactType.toLowerCase()} a ${propertyLabel}.`
        : `${ownerName} salvato come ${contactType.toLowerCase()} censito.`,
    );
  }

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Censimento"
        page={labelForPage("censimento", pageKey)}
        path={pathForPage(pageKey)}
        items={["Zona -> Via", "Via -> Complesso", "Complesso -> Immobili", "Immobile -> Proprietari"]}
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

      {pageKey === "censimento-proprietari" || pageKey === "censimento-contatti" ? (
        <Panel
          className="span-12"
          title={pageKey === "censimento-contatti" ? "Filtro contatti censimento" : "Filtro proprietari"}
          action={activeFilters(filters).length ? "Azzera filtri" : undefined}
          onPanelAction={() => {
            setFilters({});
            onAction("Filtri censimento azzerati.");
          }}
        >
          <QuickForm
            button="Filtra"
            fields={searchFilterFields}
            required={false}
            onSubmit={(values) => {
              setFilters(values);
              onAction(`Filtro censimento applicato: ${valuesSummary(values)}.`);
            }}
          />
        </Panel>
      ) : null}

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
      <Panel
        className={pageKey === "censimento-nuovo-contatto" ? "span-12 crm-form-panel" : "span-4 crm-form-panel"}
        title={formTitle}
      >
        {pageKey === "censimento-nuovo-contatto" ? (
          <StructuredQuickForm
            requiredDefault={false}
            sections={censusContactFormSections}
            submitLabel="Salva contatto censimento"
            onSubmit={saveCensus}
          />
        ) : (
          <QuickForm
            button={pageKey === "censimento-contatti" ? "Filtra" : "Salva"}
            fields={formFields}
            required={pageKey !== "censimento-contatti"}
            onSubmit={(values) => {
              if (pageKey === "censimento-contatti") {
                setFilters(values);
                onAction(`Filtro contatti censimento applicato: ${valuesSummary(values)}.`);
                return;
              }
              saveCensus(values);
            }}
          />
        )}
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
  const utilityTitle =
    pageKey === "utilita-preferenze"
      ? "Preferenze operative"
      : pageKey === "utilita-backup"
        ? "Copie di sicurezza"
        : pageKey === "utilita-portali"
          ? "Esportazioni portali"
          : pageKey === "utilita-info-territoriali"
            ? "Info territoriali"
            : "Strumenti account";
  const utilityRows =
    pageKey === "utilita-portali"
      ? data.marketingChannels.map((channel) => [channel.name, channel.status, `${channel.progress}%`, channel.updatedAt])
      : pageKey === "utilita-preferenze"
        ? [
            ["Widget Start", "Agenda / censimento / contatti", "Attivo", "Personale"],
            ["Modulo predefinito", "Oggi", "Attivo", "Personale"],
            ["Notifiche", "Agenda e ricontatti", "Attivo", "Account"],
          ]
        : pageKey === "utilita-info-territoriali"
          ? [
              ["Catasto", "Consultazione dati", "Collegamento esterno", "Manuale"],
              ["Mappa zone", "Censimento e immobili", "Interno", "Attivo"],
              ["Portali", "Verifica pubblicazione", "Collegamento esterno", "Attivo"],
            ]
          : [
              ["Backup CRM", `${data.properties.length + data.contacts.length} record`, "Pronto", nowLabel()],
              ["Account", "Ruoli e orari", "Inclusi", nowLabel()],
              ["Storico attività", `${data.activities.length} attività`, "Incluso", nowLabel()],
            ];
  const utilityColumns =
    pageKey === "utilita-portali"
      ? ["Canale", "Stato", "Avanzamento", "Aggiornato"]
      : pageKey === "utilita-info-territoriali"
        ? ["Servizio", "Uso", "Tipo", "Stato"]
        : ["Voce", "Dettaglio", "Stato", "Ambito"];

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
      <Panel className="span-6" title={utilityTitle}>
        <DataTable columns={utilityColumns} rows={utilityRows} />
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
          items={
            pageKey === "utilita-preferenze"
              ? ["Mostra widget Start", "Avvisi agenda", "Ricerca rapida", "Salvataggio preferenze"]
              : pageKey === "utilita-portali"
                ? ["Verifica portali", "Esporta pubblicazioni", "Controlla lead", "Aggiorna report"]
                : pageKey === "utilita-info-territoriali"
                  ? ["Controlla zona", "Verifica via", "Apri dati catastali", "Aggiorna censimento"]
                  : ["Scarica archivio", "Controlla duplicati", "Verifica account", "Aggiorna report mensile"]
          }
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

  function canEditAccessWindow(account: AccountRecord) {
    return canManageTarget(account) || canMaintainTarget(account) || (fullOverride && account.id === currentUser.id);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const name = String(form.get("name") || "").trim();
    const role = String(form.get("role") || "");
    const password = String(form.get("password") || "");
    const accessLimitEnabled = form.get("accessLimitEnabled") === "on";
    const accessStartHour = normalizeAccessHour(form.get("accessStartHour"), defaultAccessStartHour);
    const accessEndHour = normalizeAccessHour(form.get("accessEndHour"), defaultAccessEndHour);

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
      accessLimitEnabled,
      accessStartHour,
      accessEndHour,
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

  function toggleAccessLimit(account: AccountRecord, enabled: boolean) {
    if (!canEditAccessWindow(account)) {
      onAction("Non puoi modificare l'orario operativo di questo account.");
      return;
    }
    onAccountsChange(
      (currentAccounts) =>
        currentAccounts.map((item) =>
          item.id === account.id ? { ...item, accessLimitEnabled: enabled, updatedAt: nowLabel() } : item,
        ),
      enabled
        ? `Limite orario attivato per ${account.name}: ${accountAccessLabel({ ...account, accessLimitEnabled: true })}.`
        : `Limite orario disattivato per ${account.name}.`,
    );
  }

  function changeAccessHour(account: AccountRecord, field: "accessStartHour" | "accessEndHour", value: string) {
    if (!canEditAccessWindow(account)) {
      onAction("Non puoi modificare l'orario operativo di questo account.");
      return;
    }
    const hour = normalizeAccessHour(value, field === "accessStartHour" ? defaultAccessStartHour : defaultAccessEndHour);
    const nextAccount = { ...account, [field]: hour };
    onAccountsChange(
      (currentAccounts) =>
        currentAccounts.map((item) =>
          item.id === account.id ? { ...item, [field]: hour, updatedAt: nowLabel() } : item,
        ),
      `Orario operativo ${account.name}: ${accountAccessLabel(nextAccount)}.`,
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
              ? {
                  ...account,
                  role: "SVILUPPATORE",
                  status: "Attivo",
                  passwordHash: accountPasswordHash,
                  accessLimitEnabled: account.accessLimitEnabled !== false,
                  accessStartHour: normalizeAccessHour(account.accessStartHour, defaultAccessStartHour),
                  accessEndHour: normalizeAccessHour(account.accessEndHour, defaultAccessEndHour),
                  updatedAt: nowLabel(),
                }
              : {
                  ...account,
                  accessLimitEnabled: account.accessLimitEnabled !== false,
                  accessStartHour: normalizeAccessHour(account.accessStartHour, defaultAccessStartHour),
                  accessEndHour: normalizeAccessHour(account.accessEndHour, defaultAccessEndHour),
                },
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
            Profilo collegato: <strong>{currentUser.name}</strong>
          </span>
          <span>
            <BadgeCheck size={18} />
            Stato account: <strong>{currentAccount?.status ?? "Attivo"}</strong>
          </span>
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
            <label className="account-check">
              <input name="accessLimitEnabled" defaultChecked type="checkbox" />
              <span>Limita accesso all'orario operativo</span>
            </label>
            <div className="account-time-grid">
              <label>
                Dalle
                <select name="accessStartHour" defaultValue={defaultAccessStartHour}>
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHour(hour)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Alle
                <select name="accessEndHour" defaultValue={defaultAccessEndHour}>
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHour(hour)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
            const accessEditable = canEditAccessWindow(account);
            const accessSchedule = getAccountAccessSchedule(account);
            return (
              <article className={isSelf ? "account-row current" : "account-row"} key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <small>{account.email}</small>
                  <span>
                    {account.status} / {isAccountOnline(account) ? "Online" : "Offline"} / {accountAccessLabel(account)}
                  </span>
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
                <div className="account-schedule">
                  <label className="account-check">
                    <input
                      checked={accessSchedule.enabled}
                      disabled={!accessEditable}
                      type="checkbox"
                      onChange={(event) => toggleAccessLimit(account, event.currentTarget.checked)}
                    />
                    <span>{accessSchedule.enabled ? "Orario limitato" : "Sempre operativo"}</span>
                  </label>
                  <div className="account-time-grid">
                    <select
                      aria-label={`Accesso da ${account.name}`}
                      disabled={!accessEditable || !accessSchedule.enabled}
                      value={accessSchedule.start}
                      onChange={(event) => changeAccessHour(account, "accessStartHour", event.currentTarget.value)}
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {formatHour(hour)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`Accesso fino ${account.name}`}
                      disabled={!accessEditable || !accessSchedule.enabled}
                      value={accessSchedule.end}
                      onChange={(event) => changeAccessHour(account, "accessEndHour", event.currentTarget.value)}
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {formatHour(hour)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
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
  const settingConfig = settingsConfigForPage(pageKey, settingLabel);
  const [createdRows, setCreatedRows] = useState<string[][]>([]);
  const [feedback, setFeedback] = useState("");
  const settingRows = [...createdRows, ...settingConfig.rows];
  const rows = useFilteredRows(settingRows, query, (row) => row.join(" "));

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Impostazioni"
        page={settingLabel}
        path={pathForPage(pageKey)}
        items={settingConfig.flow}
      />
      <Panel className="span-5 crm-form-panel" title={settingConfig.formTitle}>
        <QuickForm
          button={settingConfig.button}
          fields={settingConfig.fields}
          required={false}
          onSubmit={(values) => {
            const summary = valuesSummary(values, settingLabel);
            const firstValue = Object.values(values).find(Boolean) || settingLabel;
            const nextRow = settingConfig.createRow(values, firstValue);
            setCreatedRows((currentRows) => [nextRow, ...currentRows]);
            setFeedback(`${settingConfig.successLabel}: ${firstValue}`);
            onCommit(
              (data) => ({
                ...data,
                activityLog: [`${settingLabel}: ${summary}`, ...data.activityLog],
              }),
              `${settingConfig.successLabel}: ${summary}.`,
            );
          }}
        />
        {feedback ? <p className="form-feedback">{feedback}</p> : null}
      </Panel>
      <Panel className="span-7" title={settingLabel}>
        <DataTable columns={settingConfig.columns} rows={rows} />
      </Panel>
      <Panel className="span-12" title="Azioni configurazione">
        <div className="tool-grid">
          <ToolButton label="Salva impostazione" Icon={CheckCircle2} onClick={() => onCommit((data) => ({
            ...data,
            activityLog: [`${settingLabel}: impostazioni confermate`, ...data.activityLog],
          }), `${settingLabel}: impostazioni confermate.`)} />
          <ToolButton label="Aggiorna filtri" Icon={RefreshCcwDot} onClick={() => onCommit((data) => data, `${settingLabel}: filtri aggiornati.`)} />
          <ToolButton label="Backup setup" Icon={DatabaseBackup} onClick={() => onCommit((data) => {
            downloadCrmData(data);
            return data;
          }, "Backup configurazione scaricato.")} />
          <ToolButton label="Verifica uso" Icon={Search} onClick={() => onCommit((data) => data, `${settingLabel}: verifica completata.`)} />
        </div>
      </Panel>
    </div>
  );
}

function settingsConfigForPage(pageKey: string, settingLabel: string) {
  const commonFields: QuickFormField[] = [
    "Nome",
    { name: "Stato", options: ["Attivo", "In verifica", "Disattivo"], required: false },
    { name: "Ambito", required: false },
  ];
  const commonRows = [
    [settingLabel, "Attivo", "Globale", "Modificabile"],
    [`${settingLabel} vendita`, "Attivo", "Vendite", "Modificabile"],
    [`${settingLabel} locazione`, "In verifica", "Affitti", "Modificabile"],
  ];
  const base = {
    columns: ["Voce", "Stato", "Ambito", "Permesso"],
    rows: commonRows,
    fields: commonFields,
    formTitle: `Nuova voce ${settingLabel}`,
    button: "Salva",
    successLabel: "Configurazione salvata",
    createRow: (values: Record<string, string>, fallback: string) => [
      values.Nome || values["Nome voce"] || fallback,
      values.Stato || "Attivo",
      values.Ambito || "Globale",
      "Modificabile",
    ],
    flow: ["Configurazione -> schede", "Configurazione -> filtri", "Configurazione -> automatismi"],
  };

  if (pageKey === "impostazioni-azienda") {
    return {
      ...base,
      columns: ["Dato", "Valore", "Sezione", "Stato"],
      rows: [
        ["Fenix Group Real Estate", "Agenzia", "Dati agenzia", "Attivo"],
        ["Logo", "Caricato", "Brand", "Attivo"],
        ["Contatti", "Telefono / email", "Recapiti", "Da verificare"],
      ],
      fields: ["Nome agenzia", "REA", "Telefono", "Cellulare", "Email", "Indirizzo", "Legale rappresentante"],
      formTitle: "Dati agenzia",
      flow: ["Agenzia -> recapiti", "Recapiti -> documenti", "Brand -> stampe e portali"],
    };
  }

  if (pageKey === "impostazioni-accessori-tipologia" || pageKey === "impostazioni-accessori-gestione") {
    return {
      ...base,
      columns: [pageKey.endsWith("tipologia") ? "Tipologia" : "Tipo gestione", "Accessori collegati", "Stato", "Aggiornato"],
      rows: [
        ["Appartamento", "Balcone, ascensore, cantina", "Attivo", nowLabel()],
        ["Villa", "Giardino, box, terrazzo", "Attivo", nowLabel()],
        ["Affitto", "Arredo, cauzione, contratto", "Attivo", nowLabel()],
      ],
      fields: [
        pageKey.endsWith("tipologia") ? "Tipologia" : "Tipo gestione",
        "Accessori collegati",
        { name: "Stato", options: ["Attivo", "Disattivo"], required: false },
      ],
      formTitle: "Associa accessori",
      flow: ["Accessori -> tipologia", "Accessori -> gestione", "Scheda immobile -> filtri"],
    };
  }

  if (pageKey === "impostazioni-provenienze-portali" || pageKey === "impostazioni-provenienze-giornalini" || pageKey === "impostazioni-provenienze-siti" || pageKey === "impostazioni-provenienze-altri") {
    return {
      ...base,
      columns: ["Provenienza", "Tipo", "Stato", "Uso"],
      rows: [
        ["Immobiliare.it", "Portale", "Attivo", "Lead pubblicita"],
        ["Sito agenzia", "Sito web", "Attivo", "Contatto diretto"],
        ["Cartello vetrina", "Offline", "Attivo", "Telefonate"],
      ],
      fields: ["Nome provenienza", { name: "Tipo", options: ["Portale", "Giornalino", "Sito web", "Altro"], required: false }, "Email ricezione", "Note"],
      formTitle: "Nuova provenienza",
      flow: ["Provenienza -> lead", "Lead -> nominativo", "Nominativo -> richiesta"],
    };
  }

  if (pageKey === "impostazioni-email-cp" || pageKey === "impostazioni-email-cp-mittenti") {
    return {
      ...base,
      columns: ["Casella / mittente", "Tipo", "Stato", "Uso"],
      rows: [
        ["lead@grfenix.com", "Casella", "Attivo", "Contatti pubblicita"],
        ["noreply@portale.it", "Mittente accettato", "Attivo", "Import lead"],
      ],
      fields: ["Email", { name: "Tipo", options: ["Casella", "Mittente accettato"], required: false }, "Provenienza collegata"],
      formTitle: "Configura email contatti P.",
      flow: ["Email -> contatto pubblicita", "Mittente -> provenienza", "Lead -> presa in carico"],
    };
  }

  if (pageKey === "impostazioni-tipo-attivita") {
    return {
      ...base,
      columns: ["Tipo attività", "Colore agenda", "Visibile", "Stato"],
      rows: [
        ["Telefonata", "Rosso", "Si", "Attivo"],
        ["Visita immobile", "Verde", "Si", "Attivo"],
        ["Censimento", "Blu", "Si", "Attivo"],
      ],
      fields: ["Tipo attività", "Colore agenda", { name: "Visibile in agenda", options: ["Si", "No"], required: false }],
      formTitle: "Nuovo tipo attività",
      flow: ["Tipo attività -> agenda", "Agenda -> storico", "Storico -> statistiche"],
    };
  }

  if (pageKey === "impostazioni-aree" || pageKey === "impostazioni-frazioni" || pageKey === "impostazioni-localita") {
    return {
      ...base,
      columns: ["Area", "Comune", "Livello", "Stato"],
      rows: [
        ["Centro", "Milano", "Zona", "Attivo"],
        ["Nord", "Milano", "Frazione", "Attivo"],
        ["Residenziale", "Milano", "Localita", "In verifica"],
      ],
      fields: ["Nome area", "Comune", { name: "Livello", options: ["Zona", "Frazione", "Localita"], required: false }],
      formTitle: "Area geografica",
      flow: ["Area -> censimento", "Area -> immobili", "Area -> richieste"],
    };
  }

  if (pageKey === "impostazioni-aziende") {
    return {
      ...base,
      columns: ["Ragione sociale", "Partita IVA", "Codice fiscale", "Contatti"],
      rows: [
        ["Fenix Group", "Da completare", "Da completare", "Amministrazione"],
        ["Partner tecnico", "Da completare", "Da completare", "Referente"],
      ],
      fields: ["Ragione sociale", "Partita IVA", "Codice fiscale", "Indirizzo", "Telefono", "Email"],
      formTitle: "Nuova azienda",
      flow: ["Azienda -> anagrafica", "Anagrafica -> contratti", "Contratti -> documenti"],
    };
  }

  if (pageKey === "impostazioni-modulistica") {
    return {
      ...base,
      columns: ["Contratto", "Tipo", "Stato", "Uso"],
      rows: [
        ["Incarico vendita", "Vendita", "Attivo", "Acquisizione immobile"],
        ["Proposta acquisto", "Vendita", "Attivo", "Trattativa"],
        ["Contratto locazione", "Affitto", "In verifica", "Locazioni"],
      ],
      fields: [
        "Nome contratto",
        { name: "Tipo", options: ["Vendita", "Affitto", "Acquisizione", "Proposta", "Privacy", "Altro"], required: false },
        { name: "Stato", options: ["Attivo", "In verifica", "Disattivo"], required: false },
        "Uso",
      ],
      formTitle: "Nuovo contratto",
      button: "Nuovo contratto",
      successLabel: "Contratto creato",
      createRow: (values: Record<string, string>, fallback: string) => [
        values["Nome contratto"] || fallback,
        values.Tipo || "Vendita",
        values.Stato || "Attivo",
        values.Uso || "Modulistica agenzia",
      ],
      flow: ["Contratto -> modello", "Modello -> scheda", "Scheda -> firma/documenti"],
    };
  }

  return base;
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
  const [open, setOpen] = useState(false);

  return (
    <section className="route-summary span-12">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <span>Mostra/nascondi filtri</span>
        <small>{module} / {page} / {path}</small>
        <ChevronRight className={open ? "open" : ""} size={17} />
      </button>
      {open ? (
        <div>
          {items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
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
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className={`workspace-panel ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
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
    </motion.section>
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
  const reduceMotion = useReducedMotion();

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
              <motion.tr
                key={row.join("-")}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: Math.min(rowIndex * 0.015, 0.12), duration: 0.18 }}
              >
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
              </motion.tr>
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
  const fieldRequired = (field: QuickFormField) =>
    typeof field === "string" ? required : field.required ?? required;
  const fieldPlaceholder = (field: QuickFormField) =>
    typeof field === "string" ? field : field.placeholder ?? field.name;

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
          {typeof field === "string" || !field.options ? (
            <input name={fieldName(field)} required={fieldRequired(field)} placeholder={fieldPlaceholder(field)} />
          ) : (
            <select name={field.name} required={fieldRequired(field)}>
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

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activityIsoDate(activity: ActivityRecord) {
  const detailedDate = activity.details?.startDate?.trim();
  if (detailedDate && /^\d{4}-\d{2}-\d{2}$/.test(detailedDate)) {
    return detailedDate;
  }
  return activity.time.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] || "";
}

function activityDayForDate(value: string): ActivityRecord["day"] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Oggi";
  }
  const today = new Date();
  const tomorrow = new Date(today);
  const weekEnd = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  weekEnd.setDate(today.getDate() + 6);
  const todayIso = localIsoDate(today);
  if (value < todayIso) {
    return "Passate";
  }
  if (value === todayIso) {
    return "Oggi";
  }
  if (value === localIsoDate(tomorrow)) {
    return "Domani";
  }
  if (value <= localIsoDate(weekEnd)) {
    return "Settimana";
  }
  return "Future";
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function fieldValue(values: Record<string, string>, field: string, fallback = "") {
  return String(values[field] || "").trim() || fallback;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function activeFilters(filters: Record<string, string>) {
  return Object.entries(filters).filter(([, value]) => normalizeSearchValue(value));
}

function activeDomainFilters(filters: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      const normalized = normalizeSearchValue(value);
      return normalized && normalized !== "no";
    }),
  );
}

function parseNumericValue(value: string | undefined) {
  if (!value) {
    return 0;
  }
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedTokens(value: string | undefined) {
  return String(value || "")
    .toLowerCase()
    .split(/[,;/|]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function calculateRequestMatch(request: Pick<RequestRecord, "details">, property: PropertyRecord) {
  const criteria = request.details ?? {};
  const propertyDetails = property.details ?? {};
  let score = 0;
  let possible = 0;

  const management = normalizeSearchValue(criteria.managementType || "");
  if (management) {
    possible += 15;
    const propertyManagement = normalizeSearchValue(propertyDetails.managementType || property.kind);
    const compatible =
      (management.includes("acquist") && propertyManagement.includes("vend")) ||
      (management.includes("affitt") && propertyManagement.includes("affitt")) ||
      management.includes(propertyManagement) ||
      propertyManagement.includes(management);
    if (compatible) {
      score += 15;
    }
  }

  const preferredTypes = normalizedTokens(criteria.preferredPropertyTypes);
  if (preferredTypes.length) {
    possible += 20;
    const candidate = normalizeSearchValue(`${propertyDetails.propertyType || ""} ${property.title}`);
    if (preferredTypes.some((type) => candidate.includes(type))) {
      score += 20;
    }
  }

  const preferredAreas = normalizedTokens(criteria.preferredAreas);
  const acceptedAreas = normalizedTokens(criteria.acceptedAreas);
  if (preferredAreas.length || acceptedAreas.length) {
    possible += 20;
    const candidate = normalizeSearchValue(
      `${property.zone} ${propertyDetails.municipality || ""} ${propertyDetails.district || ""} ${propertyDetails.street || ""}`,
    );
    if (preferredAreas.some((area) => candidate.includes(area))) {
      score += 20;
    } else if (acceptedAreas.some((area) => candidate.includes(area))) {
      score += 10;
    }
  }

  const maximumBudget = parseNumericValue(criteria.maximumBudget);
  if (maximumBudget) {
    possible += 15;
    const price = parseNumericValue(property.price || propertyDetails.askingPrice);
    if (price && price <= maximumBudget) {
      score += 15;
    } else if (price && price <= maximumBudget * 1.1) {
      score += 7;
    }
  }

  const minimumArea = parseNumericValue(criteria.minimumArea || criteria.preferredMinimumArea);
  if (minimumArea) {
    possible += 5;
    if (parseNumericValue(propertyDetails.commercialArea) >= minimumArea) {
      score += 5;
    }
  }

  const minimumRooms = parseNumericValue(criteria.minimumRooms);
  if (minimumRooms) {
    possible += 5;
    if (parseNumericValue(property.rooms || propertyDetails.rooms) >= minimumRooms) {
      score += 5;
    }
  }

  if (!possible) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((score / possible) * 100)));
}

function matchesStructuredFilters(filters: Record<string, string>, fields: Record<string, string>) {
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

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function formatFullName(firstName: string, lastName: string, fallback = "Nuovo cliente") {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
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

function removeOwnerLabel(currentOwner: string, ownerName: string) {
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

function cadastralLabel(record: {
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
    details: input.details,
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
    "proprietari-elenco": "/proprietari",
    "proprietari-collega": "/proprietari/collega",
    "attivita-elenco": "/attivita",
    "attivita-nuova": "/attivita/nuova",
    "agenda-nuova": "/agenda/attivita/nuova",
    "agenda-calendario": "/agenda",
    "agenda-storico": "/agenda/storico",
    "pubblicita-portali": "/pubblicita",
    "contatti-p-nuovo": "/contatti-pubblicita/nuovo",
    "contatti-p-elenco": "/contatti-pubblicita",
    "censimento-nuovo-contatto": "/censimento/nominativi/create",
    "censimento-contatti": "/censimento/nominativi",
    "censimento-zone": "/censimento/zone",
    "censimento-vie": "/censimento/vie",
    "censimento-complessi": "/censimento/complessi",
    "censimento-immobili": "/censimento/immobili",
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
    "impostazioni-accessori-tipologia": "/impostazioni/accessori/tipologia",
    "impostazioni-accessori-gestione": "/impostazioni/accessori/tipo-gestione",
    "impostazioni-modulistica": "/impostazioni/contratti",
    "impostazioni-cartelli": "/impostazioni/preset-cartellini",
    "impostazioni-distanze": "/impostazioni/distanze",
    "impostazioni-aziende": "/impostazioni/aziende",
    "impostazioni-tipo-attivita": "/tipo-attivita",
    "impostazioni-azienda": "/impostazioni/agenzia",
    "impostazioni-aree": "/impostazioni/aree-geografiche",
    "impostazioni-frazioni": "/impostazioni/frazioni",
    "impostazioni-localita": "/impostazioni/localita",
    "impostazioni-provenienze": "/impostazioni/provenienze",
    "impostazioni-provenienze-portali": "/impostazioni/provenienze/portali-personali",
    "impostazioni-provenienze-giornalini": "/impostazioni/provenienze/giornalini",
    "impostazioni-provenienze-siti": "/impostazioni/provenienze/siti-web",
    "impostazioni-provenienze-altri": "/impostazioni/provenienze/altri",
    "impostazioni-email-cp": "/impostazioni/email-contatti-pubblicita",
    "impostazioni-email-cp-mittenti": "/impostazioni/email-contatti-pubblicita/mittenti",
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
