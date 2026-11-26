import { supabase } from "./lib/supabase";
import { CensusView } from "./censimento/CensusView";
import { Panel, DataTable, EmptyState, QuickForm } from "./ui/primitives";
import {
  cadastralCategoryOptions,
  roomOptions,
  searchFilterFields,
  crmStorageKey,
  normalizeSearchValue,
  activeFilters,
  fieldValue,
  makeId,
  nowLabel,
  currentTimeLabel,
  matchesStructuredFilters,
  splitFullName,
  formatFullName,
  valuesSummary,
  sameLabel,
  appendOwnerLabel,
  cadastralLabel,
  createActivity,
  propertyOwnerNames,
  useFilteredRows,
  type QuickFormField,
  type PropertyRecord,
  type RequestRecord,
  type ContactRecord,
  type ActivityRecord,
  type MarketingChannelRecord,
  type GoalRecord,
  type CrmData,
  type CrmCommit,
} from "./crm/kit";
import { portalExport } from "./crm/portalExport";
import { PortalMatrixPanel } from "./crm/PortalMatrixPanel";
import { pageForPath } from "./crm/routes";
import { LEGAL_ENTITY, LegalPage, legalDocumentFor } from "./legal";
import { privateStorage, setStorageOwner, clearPrivateStorage } from "./lib/privateStorage";
import { isCaptchaEnabled, mountCaptcha, readCaptchaToken, resetCaptcha } from "./lib/captcha";
import { isRecoveryGrantActive, recoveryGrantMs } from "./lib/recoveryGrant";
import { StrictMode, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { createRoot, type Root } from "react-dom/client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
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
  FileSignature,
  Filter,
  GalleryVerticalEnd,
  Gauge,
  Globe2,
  Handshake,
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
  ReceiptText,
  RefreshCcwDot,
  Search,
  X,
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
import "./presentation.css";
import "./workspace.css";
import { PlanimetrieTool } from "./PlanimetrieTool";
import { RpoTool } from "./RpoTool";
import { TelefonistaTool } from "./TelefonistaTool";
import { PwsTool } from "./PwsTool";
import {
  AcquisitionView,
  DealsView,
  LeasesView,
  MigrationPanel,
  NextActionsPanel,
  OfficesView,
} from "./crm/operationsViews";
import { backfillDealCommissions, migrateOperationsData } from "./crm/operations";
import { Area159ImportPanel } from "./crm/Area159ImportPanel";
import { applyArea159Import, importSnapshot, previewArea159Import } from "./crm/area159Import";
import {
  InformationArchivePanel,
  type ArchiveCandidate,
} from "./crm/components/InformationArchivePanel";
import { useScrollEdges } from "./crm/useScrollEdges";
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
  | "acquisizione"
  | "trattative"
  | "locazioni"
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

type ProgramCard = {
  title: string;
  description: string;
  path: string;
  Icon: LucideIcon;
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
  source?: "local" | "supabase";
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

type CensusRingSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  moduleKey: ModuleKey;
  pageKey?: string;
};

const accountEmail = "daniele.marangoni@grfenix.com";
const accountPasswordHash = ""; // Local password authentication is disabled.
const accountsStorageKey = "fenix-suite-accounts-v1";
const sessionStorageKey = "fenix-suite-current-user-v1";
const legacySessionKey = "fenix-suite-session";
const crmSchemaVersion = 3;
/** Dopo quanto si spegne da solo il messaggio di stato del gestionale. */
const noticeAutoHideMs = 6000;
const migrationStorageKey = "fenix-suite-migration-v3";
const deviceStorageKey = "fenix-suite-device-id";
/** Copia integrale scritta subito prima della conversione al nuovo modello. */
const migrationBackupKey = "fenix-suite-crm-pre-migration-v1";
/** Copia integrale scritta prima di un import da Area159. */
const importBackupKey = "fenix-suite-crm-pre-import-v1";
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
    title: "PWS",
    description:
      "Organizza il piano giornaliero personale a partire dalle priorita suggerite dal CRM.",
    href: "/PWS",
    Icon: ListChecks,
  },
  {
    title: "TELEFONISTA",
    description:
      "Apri lo script operativo per chiamate, note ed esiti dell'attivita telefonica.",
    href: "/telefonista",
    Icon: MessageSquareText,
  },
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
  },
  {
    title: "PWS",
    description: "Piano giornaliero personale alimentato dal GPS lavorativo del CRM.",
    path: "/PWS",
    Icon: ListChecks,
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
    key: "acquisizione",
    label: "Acquisizione",
    description: "Incarichi, scadenze, valutazioni e proprietari da coltivare.",
    Icon: Handshake,
  },
  {
    key: "trattative",
    label: "Trattative",
    description: "Proposte, controproposte, compromessi e rogiti.",
    Icon: FileSignature,
  },
  {
    key: "locazioni",
    label: "Locazioni",
    description: "Contratti di affitto, canoni, incassi e scadenze.",
    Icon: ReceiptText,
  },
  {
    key: "nominativi",
    label: "Rubrica",
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

const navigationModuleKeys: ModuleKey[] = [
  "start", "agenda", "censimento", "acquisizione", "nominativi",
  "proprietari", "immobili", "richieste", "trattative", "locazioni",
  "obiettivi", "utilita", "impostazioni",
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
    {
      key: "censimento-mappa",
      label: "Mappa",
      description: "Mappa immobiliare: gli immobili censiti e i dati catastali in un solo posto.",
      Icon: MapPinned,
    },
  ],
  acquisizione: [
    {
      key: "acquisizione-incarichi",
      label: "Incarichi",
      description: "Mandati attivi, scadenze, rinnovi e immobili senza incarico.",
      Icon: Handshake,
    },
    {
      key: "acquisizione-nuovo",
      label: "Nuovo",
      description: "Registra un incarico di vendita o di locazione con la sua scadenza.",
      Icon: Plus,
    },
    {
      key: "acquisizione-coltivazione",
      label: "Coltivazione",
      description: "Proprietari che oggi non vendono: ricontatti programmati per non perderli.",
      Icon: UsersRound,
    },
  ],
  trattative: [
    {
      key: "trattative-elenco",
      label: "Elenco",
      description: "Proposte e trattative con importi, scadenze ed esiti.",
      Icon: FileSignature,
    },
    {
      key: "trattative-nuova",
      label: "Nuova",
      description: "Registra una proposta con la sua scadenza e la caparra.",
      Icon: Plus,
    },
    {
      key: "trattative-pipeline",
      label: "Percorso",
      description: "Quante pratiche sono ferme in ogni stadio della trattativa.",
      Icon: ChartNoAxesCombined,
    },
  ],
  locazioni: [
    {
      key: "locazioni-elenco",
      label: "Contratti",
      description: "Contratti di locazione, registrazione, rinnovi e disdette.",
      Icon: ReceiptText,
    },
    {
      key: "locazioni-nuova",
      label: "Nuovo",
      description: "Registra un contratto 4+4, 3+2, transitorio o per studenti.",
      Icon: Plus,
    },
    {
      key: "locazioni-incassi",
      label: "Incassi",
      description: "Canoni da incassare, solleciti e ritardi.",
      Icon: Banknote,
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
      key: "impostazioni-sedi",
      label: "Sedi",
      description: "Sedi del gruppo: ogni incarico, trattativa e contratto ha la sua.",
      Icon: Building2,
    },
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

function moduleKeyForPage(pageKey: string): ModuleKey | null {
  for (const key of Object.keys(modulePages) as ModuleKey[]) {
    if (modulePages[key].some((page) => page.key === pageKey)) {
      return key;
    }
  }
  return null;
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

  // Deep link leggibile: `/censimento/nominativi` vale come `#censimento/censimento-contatti`.
  const pageFromPath = pageForPath(window.location.pathname);
  const moduleFromPath = pageFromPath ? moduleKeyForPage(pageFromPath) : null;
  if (pageFromPath && moduleFromPath) {
    return {
      moduleKey: moduleFromPath,
      pageKey: pageFromPath,
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
    return;
  }
  // Arrivando da un deep link la pagina sta nel percorso: si torna al formato
  // canonico, così la barra degli indirizzi dice sempre dove siamo.
  if (!window.location.pathname.startsWith("/crm") && pageForPath(window.location.pathname)) {
    window.history.replaceState(null, "", `/crm${nextHash}`);
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
    source: "local",
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
  const savedAccounts = privateStorage.getItem(accountsStorageKey);
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
  privateStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
}

let verifiedSessionUser: SessionUser | null = null;
function getStoredSessionUser(): SessionUser | null {
  return verifiedSessionUser;
}

function storeSessionUser(user: SessionUser) {
  verifiedSessionUser = user;
  localStorage.setItem(sessionStorageKey, JSON.stringify(user));
}

function clearSessionUser() {
  verifiedSessionUser = null;
  clearPrivateStorage();
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
  offices: [],
  mandates: [],
  deals: [],
  leases: [],
  operationsModel: 0,
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

function AuthBoundary({ children, path, navigate }: {
  children: ReactNode; path: string; navigate: (path: string, replace?: boolean) => void;
}) {
  const [returnTo, setReturnTo] = useState("/crm#start/start-dashboard");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false;
    let generation = 0;
    async function verify() {
      const attempt = ++generation;
      let next: SessionUser | null = null;
      try {
        const result = await supabase?.auth.getUser();
        if (result?.data.user && !result.error) {
          const { data: profile, error } = await supabase!.from("profiles")
            .select("id,email,full_name,role,status").eq("id", result.data.user.id).maybeSingle();
          if (!error && profile?.status === "Attivo" && isValidRole(profile.role)) {
            next = { id: result.data.user.id, email: result.data.user.email || "",
              name: profile.full_name, role: profile.role, source: "supabase" };
          }
        }
      } catch { /* Fail closed if identity cannot be verified. */ }
      if (disposed || attempt !== generation) return;
      if (verifiedSessionUser?.id !== next?.id) clearSessionUser();
      if (next) { setStorageOwner(next.id); storeSessionUser(next); }
      else clearSessionUser();
      setUser(next);
      setChecking(false);
    }
    void verify();
    const subscription = supabase?.auth.onAuthStateChange(() => {
      // Avoid awaiting Supabase operations inside its auth lock.
      setTimeout(() => { if (!disposed) void verify(); }, 0);
    });
    const timer = window.setInterval(() => void verify(), 30000);
    return () => { disposed = true; generation++; window.clearInterval(timer); subscription?.data.subscription.unsubscribe(); };
  }, [revision]);
  useEffect(() => {
    if (checking) return;
    if (!user && path !== "/login") {
      if (/^\/(crm|pws|rpo|telefonista|planimetrie)(\/|$)/i.test(path) || pageForPath(path)) {
        setReturnTo(window.location.pathname + window.location.search + window.location.hash);
      }
      navigate("/login", true);
    } else if (user && (path === "/login" || path === "/")) {
      navigate(returnTo, true);
    }
  }, [checking, user, path, returnTo]);
  if (checking || (user && (path === "/login" || path === "/"))) return <main className="login-screen">Verifica accesso…</main>;
  if (!user) return <LoginScreen notice="Accedi per usare Fenix Suite."
    onSuccess={() => setRevision(value => value + 1)} />;
  return <div key={`${user.id}:${user.role}`}>{children}</div>;
}

function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPath: string, replace = false) {
    window.history[replace ? "replaceState" : "pushState"](null, "", nextPath);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  const legalDocument = legalDocumentFor(path);
  if (legalDocument) return <LegalPage documentKey={legalDocument} />;

  // Link di recupero password: la sessione nasce dal gettone nell'URL, quindi la
  // schermata resta fuori da AuthBoundary e non richiede un accesso già attivo.
  if (/^\/imposta-password\/?$/i.test(path)) return <ResetPasswordScreen navigate={navigate} />;

  let content: ReactNode = <CrmApp />;
  if (/^\/pws(?:\/|$)/i.test(path)) content = <PwsTool onNavigate={navigate} />;
  else if (/^\/planimetrie(?:\/|$)/.test(path)) content = <PlanimetrieTool onNavigate={navigate} />;
  else if (/^\/rpo(?:\/|$)/.test(path)) content = <RpoTool onNavigate={navigate} />;
  else if (/^\/telefonista(?:\/|$)/.test(path)) content = <TelefonistaTool onNavigate={navigate} />;
  return <AuthBoundary path={path} navigate={navigate}>{content}</AuthBoundary>;
}

function CrmApp() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => {
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
    if (sessionUser.source !== "supabase" && (!currentAccount || !isAccountOnline(currentAccount, clock))) {
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
    if (user.source !== "supabase" && (!account || !isAccountOnline(account))) {
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

  async function logout() {
    clearSessionUser();
    setSessionUser(null);
    setScreen("login");
    try { await supabase?.auth.signOut({ scope: "local" }); }
    finally { window.location.replace("/login"); }
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
    <img className="fenix-official-logo" src="/logo.png" alt="Fenix Group" />
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
          <a className="access-card" href={href} key={title} target="_blank" rel="noopener noreferrer">
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
  const [requestPrepared, setRequestPrepared] = useState(false);

  function prepareRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("nome") || "").trim();
    const email = String(data.get("email") || "").trim();
    const topic = String(data.get("argomento") || "").trim();
    const message = String(data.get("messaggio") || "").trim();
    const body = [
      `Nome e cognome: ${name}`,
      `Email: ${email}`,
      `Argomento: ${topic || "Non indicato"}`,
      "",
      message,
    ].join("\r\n");
    const subject = `Richiesta informazioni - ${topic || "Fenix Suite"}`;

    window.location.href = `mailto:${LEGAL_ENTITY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setRequestPrepared(true);
  }

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
          <span>Risponderemo entro 2 giorni lavorativi</span>
        </div>
      </div>
      <form className="contact-form" onSubmit={prepareRequest}>
        <div className="form-row">
          <label>
            Nome e cognome
            <input name="nome" required type="text" placeholder="Nome cognome" />
          </label>
          <label>
            Email
            <input name="email" required type="email" placeholder="mario@agenzia.it" />
          </label>
        </div>
        <label>
          Argomento
          <select name="argomento" defaultValue="">
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
          <textarea name="messaggio" placeholder="Scrivi qui il tuo messaggio..." rows={5} />
        </label>
        <label className="privacy-check">
          <input required name="consenso" type="checkbox" />
          <span>
            Ho letto l'<a href="/privacy">informativa privacy</a> e acconsento al trattamento
            dei dati per ricevere risposta.
          </span>
        </label>
        <button className="primary-action form-button" type="submit">
          Invia richiesta
        </button>
        <p className="form-hint">
          Si aprirà il tuo programma di posta con il messaggio già compilato. In alternativa
          scrivi a <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
        </p>
        {requestPrepared ? (
          <p className="form-success" role="status">
            Richiesta preparata: completa l'invio dal tuo programma di posta.
          </p>
        ) : null}
      </form>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>Fenix Suite</span>
      <span>Real estate platform © 2026</span>
      <span className="footer-legal">
        <a href="/termini">Termini e condizioni</a>
        <span aria-hidden="true"> · </span>
        <a href="/privacy">Privacy Policy</a>
        <span aria-hidden="true"> · </span>
        <a href="/note-legali">Note legali</a>
      </span>
    </footer>
  );
}

function italianAuthMessage(raw: string) {
  const message = (raw || "").toLowerCase();
  if (message.includes("invalid login credentials") || message.includes("invalid_credentials")) {
    return "Email o password non corretti.";
  }
  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "Email non ancora confermata: chiedi a un responsabile di attivare l'account.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Troppi tentativi di accesso: attendi un minuto e riprova.";
  }
  if (message.includes("captcha")) {
    return "Verifica anti-bot non valida o scaduta: ripeti il controllo e riprova.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Server non raggiungibile: controlla la connessione e riprova.";
  }
  if (message.includes("email") && message.includes("invalid")) {
    return "Indirizzo email non valido.";
  }
  if (message.includes("different from the old")) {
    return "La nuova password deve essere diversa da quella precedente.";
  }
  return raw || "Accesso non riuscito: controlla i dati o contatta un responsabile.";
}

// Allo scadere non basta togliere il permesso: si chiude anche la sessione nata dal link,
// così chi abbandona il recupero non resta collegato al gestionale.
const recoveryExpiredMessage =
  "Il tempo per impostare la nuova password è scaduto e la sessione è stata chiusa: richiedi un nuovo link dalla pagina di accesso.";

function ResetPasswordScreen({ navigate }: { navigate: (path: string, replace?: boolean) => void }) {
  const [state, setState] = useState<"verifica" | "pronta" | "fatto" | "negata">("verifica");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Unica prova che la sessione non è un accesso normale: il client annuncia
  // PASSWORD_RECOVERY solo dopo aver scambiato col server un gettone di recupero.
  // Scrivere `type=recovery` nell'indirizzo non basta, quindi non si può aggirare.
  const [recoveryUntil, setRecoveryUntil] = useState<number | null>(null);
  const captchaSlot = useRef<HTMLDivElement | null>(null);

  // Sessione normale, o permesso di recupero scaduto: senza la password attuale chiunque
  // abbia il browser aperto potrebbe prendere il controllo dell'account.
  const needsCurrentPassword = state === "pronta" && !isRecoveryGrantActive(recoveryUntil, Date.now());

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      const { isSupabaseConfigured, supabase } = await import("./lib/supabase");
      if (cancelled) return;
      if (!isSupabaseConfigured || !supabase) {
        setError("Accesso non disponibile: configura Supabase.");
        setState("negata");
        return;
      }
      // L'evento arriva all'avvio, quando il client scambia il gettone: senza un
      // iscritto andrebbe perso. Se non arriva, si chiede la password attuale.
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setRecoveryUntil(Date.now() + recoveryGrantMs);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
      // Il gettone viene scambiato all'avvio da detectSessionInUrl: se non resta una
      // sessione, il link è scaduto, rovinato o già usato.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setError("Link non valido o scaduto: richiedi un nuovo recupero dalla pagina di accesso.");
        setState("negata");
        return;
      }
      // Un turno d'attesa, così l'annuncio del client è già stato ricevuto: il campo
      // "Password attuale" non appare per un istante a chi arriva dal link.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (cancelled) return;
      setState("pronta");
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (recoveryUntil === null) return;
    const timer = window.setTimeout(expireRecoveryGrant, Math.max(recoveryUntil - Date.now(), 0));
    return () => window.clearTimeout(timer);
  }, [recoveryUntil]);

  useEffect(() => {
    if (state !== "pronta") return;
    const container = captchaSlot.current;
    if (container) mountCaptcha(container);
  }, [state]);

  // Chiude solo questa sessione: quando il recupero viene abbandonato non bisogna
  // scollegare l'utente dagli altri dispositivi dove era già entrato legittimamente.
  async function closeRecoverySession() {
    const { supabase } = await import("./lib/supabase");
    await supabase?.auth.signOut({ scope: "local" });
  }

  // Chi ha aperto il link e poi ricaricato la pagina non ha più il gettone: senza uscire
  // resterebbe bloccato davanti a una password che non ricorda.
  async function backToRecovery() {
    await closeRecoverySession();
    navigate("/login", true);
  }

  // Scaduto il permesso, tenere aperto l'accesso non serve più a niente: si chiude subito
  // la sessione e si riparte da un link nuovo.
  function expireRecoveryGrant() {
    setRecoveryUntil(null);
    setError(recoveryExpiredMessage);
    setState("negata");
    void closeRecoverySession();
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const conferma = String(form.get("conferma") || "");
    const attuale = String(form.get("attuale") || "");
    if (password.length < 12) {
      setError("La password deve avere almeno 12 caratteri.");
      return;
    }
    if (password !== conferma) {
      setError("Le due password non coincidono.");
      return;
    }
    // Scadenza raggiunta mentre il timer era in ritardo (scheda in secondo piano): il
    // controllo all'invio non si fa ingannare e chiude subito la sessione.
    if (recoveryUntil !== null && !isRecoveryGrantActive(recoveryUntil, Date.now())) {
      expireRecoveryGrant();
      return;
    }
    setLoading(true);
    const { supabase } = await import("./lib/supabase");
    if (!supabase) {
      setLoading(false);
      setError("Accesso non disponibile: configura Supabase.");
      return;
    }
    if (!isRecoveryGrantActive(recoveryUntil, Date.now())) {
      if (!attuale) {
        setLoading(false);
        setError("Scrivi la password attuale: serve a confermare che sei tu.");
        return;
      }
      const { data: current } = await supabase.auth.getSession();
      const captchaToken = readCaptchaToken(captchaSlot.current);
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: current.session?.user.email || "",
        password: attuale,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (verifyError) {
        setLoading(false);
        setError(
          /invalid login credentials/i.test(verifyError.message)
            ? "La password attuale non è corretta."
            : italianAuthMessage(verifyError.message),
        );
        resetCaptcha(captchaSlot.current);
        return;
      }
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(italianAuthMessage(updateError.message));
      return;
    }
    // Dopo il cambio la sessione corrente e tutte le altre vanno chiuse: una sessione
    // rubata non deve restare collegata altrove.
    await supabase.auth.signOut({ scope: "global" });
    setLoading(false);
    setState("fatto");
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-label="Imposta una nuova password">
        <form className="login-form" onSubmit={submitNewPassword}>
          <h2 className="login-form-title">Nuova password</h2>
          {state === "verifica" ? <p className="login-note">Verifica del link in corso…</p> : null}
          {state === "pronta" ? (
            <>
              <p className="login-note">
                {needsCurrentPassword
                  ? "Conferma la password attuale e poi scegli quella nuova (almeno 12 caratteri)."
                  : `Scegli la nuova password del tuo account. Servono almeno 12 caratteri e ${recoveryGrantMs / 60000} minuti di tempo.`}
              </p>
              {needsCurrentPassword ? (
                <label>
                  Password attuale
                  <input
                    name="attuale"
                    required
                    type="password"
                    autoComplete="current-password"
                    placeholder="la password che usi oggi"
                  />
                </label>
              ) : null}
              <label>
                Nuova password
                <input
                  name="password"
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="almeno 12 caratteri"
                />
              </label>
              <label>
                Ripeti la nuova password
                <input
                  name="conferma"
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="ripeti la password"
                />
              </label>
              {isCaptchaEnabled ? (
                <div className="login-captcha" ref={captchaSlot} aria-label="Verifica anti-bot" />
              ) : null}
              {error ? (
                <p className="login-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="primary-action form-button" type="submit" disabled={loading}>
                {loading ? "Salvataggio..." : "Salva la nuova password"}
              </button>
              {needsCurrentPassword ? (
                <button className="login-switch button-reset" type="button" onClick={backToRecovery}>
                  Non conosci la password attuale? Ricevi un nuovo link
                </button>
              ) : null}
            </>
          ) : null}
          {state === "fatto" ? (
            <>
              <p className="login-note">
                Password aggiornata. Puoi entrare nel gestionale con la nuova password.
              </p>
              <button
                className="primary-action form-button"
                type="button"
                onClick={() => navigate("/login", true)}
              >
                Vai all'accesso
              </button>
            </>
          ) : null}
          {state === "negata" ? (
            <>
              {error ? (
                <p className="login-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="primary-action form-button" type="button" onClick={backToRecovery}>
                Torna all'accesso
              </button>
            </>
          ) : null}
        </form>
      </section>
    </main>
  );
}

function PasswordRecovery({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const captchaSlot = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = captchaSlot.current;
    if (container) mountCaptcha(container);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const captchaToken = readCaptchaToken(captchaSlot.current);
    if (isCaptchaEnabled && !captchaToken) {
      setLoading(false);
      setError("Completa la verifica anti-bot prima di inviare la richiesta.");
      return;
    }
    const { isSupabaseConfigured, supabase } = await import("./lib/supabase");
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setError("Accesso non disponibile: configura Supabase.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/imposta-password`,
      ...(captchaToken ? { captchaToken } : {}),
    });
    setLoading(false);
    if (resetError) {
      setError(italianAuthMessage(resetError.message));
      resetCaptcha(captchaSlot.current);
      return;
    }
    // Conferma generica: non si rivela se l'indirizzo è registrato o no.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="login-form" role="status">
        <h2 className="login-form-title">Controlla la posta</h2>
        <p className="login-note">
          Se l'indirizzo è registrato riceverai entro pochi minuti un'email con il link per
          impostare una nuova password. Se non arriva, controlla la cartella spam o chiedi a
          un responsabile di reimpostarla.
        </p>
        <button className="primary-action form-button" type="button" onClick={onBack}>
          Torna all'accesso
        </button>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <h2 className="login-form-title">Recupera l'accesso</h2>
      <p className="login-note">
        Scrivi l'indirizzo del tuo account: riceverai un'email con il link per scegliere una
        nuova password. Il link scade dopo un'ora e vale una sola volta.
      </p>
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
      {isCaptchaEnabled ? (
        <div className="login-captcha" ref={captchaSlot} aria-label="Verifica anti-bot" />
      ) : null}
      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="primary-action form-button" type="submit" disabled={loading}>
        {loading ? "Invio..." : "Invia il link di recupero"}
      </button>
      <button className="login-switch button-reset" type="button" onClick={onBack}>
        Torna all'accesso
      </button>
    </form>
  );
}

function LoginScreen({
  notice,
  onBack,
  onSuccess,
}: {
  notice: string;
  onBack?: () => void;
  onSuccess: (user: SessionUser) => void;
}) {
  const [error, setError] = useState(notice);
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const captchaSlot = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setError(notice);
  }, [notice]);

  useEffect(() => {
    const container = captchaSlot.current;
    if (container) mountCaptcha(container);
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const clearPasswordField = () => {
      const passwordInput = formElement.querySelector<HTMLInputElement>('input[name="password"]');
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.focus();
      }
    };
    const captchaToken = readCaptchaToken(captchaSlot.current);
    if (isCaptchaEnabled && !captchaToken) {
      setLoading(false);
      setError("Completa la verifica anti-bot prima di accedere.");
      return;
    }
    const { isSupabaseConfigured, supabase } = await import("./lib/supabase");
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (authError || !authData.user) {
        setLoading(false);
        setError(italianAuthMessage(authError?.message || ""));
        clearPasswordField();
        resetCaptcha(captchaSlot.current);
        return;
      }

      const { data: profile, error: profileLookupError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,status")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileLookupError) {
        await supabase.auth.signOut();
        setLoading(false);
        setError("Impossibile verificare il profilo.");
        return;
      }
      const safeRole = isValidRole(String(profile?.role || "")) ? profile!.role as UserRole : "AGENTE";
      const user: SessionUser = {
        id: authData.user.id,
        name: String(profile?.full_name || authData.user.user_metadata?.full_name || email.split("@")[0]),
        email,
        role: safeRole,
        source: "supabase",
      };

      if (!profile) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          email,
          full_name: user.name,

        });
        if (profileError) {
          await supabase.auth.signOut();
          setLoading(false);
          setError(`Profilo non inizializzato: ${profileError.message}`);
          return;
        }
      } else if (profile.status !== "Attivo") {
        await supabase.auth.signOut();
        setLoading(false);
        setError("Account sospeso: contatta un responsabile.");
        return;
      }

      setLoading(false);
      onSuccess(user);
      return;
    }

    setLoading(false);
    setError("Accesso non disponibile: configura Supabase.");
  }

  return (
    <main className="login-screen">
      {onBack && <button className="back-link button-reset" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        Torna al sito
      </button>}
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
            agenda e strumenti collegati in un unico ambiente.
          </p>
          <div className="login-highlights">
            <span>
              <ShieldCheck size={18} />
              Accesso protetto con Supabase Auth
            </span>
            <span>
              <DatabaseBackup size={18} />
              Copia di lavoro sul dispositivo, non cifrata
            </span>
          </div>
        </div>
        {showRecovery ? (
          <PasswordRecovery
            onBack={() => {
              setError("");
              setShowRecovery(false);
            }}
          />
        ) : (
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
            {isCaptchaEnabled ? (
              <div className="login-captcha" ref={captchaSlot} aria-label="Verifica anti-bot" />
            ) : null}
            {error ? (
              <p className="login-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="primary-action form-button" type="submit" disabled={loading}>
              {loading ? "Verifica..." : "Accedi a Fenix Suite"}
            </button>
            <button
              className="login-switch button-reset"
              type="button"
              onClick={() => {
                setError("");
                setShowRecovery(true);
              }}
            >
              Password dimenticata?
            </button>
            <p className="login-note">
              Le credenziali sono gestite da Supabase Auth: la password non è memorizzata in
              chiaro nell'applicazione.
            </p>
            <p className="login-legal">
              <a href="/privacy">Informativa privacy</a>
              <span aria-hidden="true"> · </span>
              <a href="/termini">Termini e condizioni</a>
              <span aria-hidden="true"> · </span>
              <a href="/note-legali">Note legali</a>
            </p>
          </form>
        )}
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
  const [personId, setPersonId] = useState<string | null>(null);
  const [notice, setNotice] = useState("Dashboard aggiornata.");
  const [noticeVersion, setNoticeVersion] = useState(0);
  const [crmData, setCrmData] = usePersistentCrmData();
  const [accounts, setAccounts] = usePersistentAccounts();
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  const [migrationBackup, setMigrationBackup] = useState(
    () => privateStorage.getItem(migrationBackupKey) !== null,
  );
  const [importBackup, setImportBackup] = useState(
    () => privateStorage.getItem(importBackupKey) !== null,
  );
  const [agendaResetVersion, setAgendaResetVersion] = useState(0);
  const moduleNavRef = useScrollEdges<HTMLElement>();
  const submenuRef = useScrollEdges<HTMLElement>();
  const visibleModules = getVisibleModules(currentUser);
  const mainModules = navigationModuleKeys.flatMap(key => visibleModules.filter(module => module.key === key));
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

  // Il messaggio di stato si spegne da solo; la barra resta per l'utente attivo.
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(""), noticeAutoHideMs);
    return () => window.clearTimeout(timer);
  }, [notice, noticeVersion]);

  function runAction(message: string) {
    setNotice(message);
    // Anche un messaggio identico al precedente riparte da capo con il suo tempo.
    setNoticeVersion((version) => version + 1);
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

  function applyDataMigration() {
    try {
      privateStorage.setItem(
        migrationBackupKey,
        JSON.stringify({ savedAt: new Date().toISOString(), data: crmData }),
      );
    } catch {
      runAction("Spazio insufficiente per la copia di sicurezza: migrazione non applicata.");
      return;
    }

    const result = migrateOperationsData(crmData);
    commitData(
      () => result.data,
      `Migrazione completata: ${result.report.mandates} incarichi, ${result.report.leases} contratti, ${result.report.deals} trattative, ${result.report.ownerContacts} proprietari collegati.`,
    );
    setMigrationBackup(true);
  }

  /** Import da Area159: anteprima gia' vista dall'utente, poi copia e scrittura. */
  function applyArea159Data(text: string) {
    const preview = previewArea159Import(crmData, text);
    if (!preview.properties.length) {
      runAction("Import fermo: il file non contiene immobili riconoscibili.");
      return;
    }
    try {
      privateStorage.setItem(
        importBackupKey,
        JSON.stringify({ savedAt: new Date().toISOString(), data: importSnapshot(crmData) }),
      );
    } catch {
      runAction("Spazio insufficiente per la copia di sicurezza: import non applicato.");
      return;
    }
    commitData(
      (current) => applyArea159Import(current, preview),
      `Import Area159: ${preview.created} immobili nuovi, ${preview.updated} aggiornati, ${preview.newContacts.length} proprietari in rubrica.`,
    );
    setImportBackup(true);
  }

  function undoArea159Data() {
    const raw = privateStorage.getItem(importBackupKey);
    if (!raw) {
      setImportBackup(false);
      runAction("Nessuna copia di import disponibile.");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { data?: CrmData };
      if (!parsed?.data) {
        throw new Error("backup vuoto");
      }
      // Come per la migrazione: ripristino esatto, senza riga di storico.
      setCrmData(() => parsed.data as CrmData);
      privateStorage.removeItem(importBackupKey);
      setImportBackup(false);
      runAction("Import annullato: i dati sono tornati a prima dell'import.");
    } catch {
      runAction("Copia di import illeggibile: nessuna modifica ai dati.");
    }
  }

  function undoDataMigration() {
    const raw = privateStorage.getItem(migrationBackupKey);
    if (!raw) {
      setMigrationBackup(false);
      runAction("Nessuna copia di migrazione disponibile.");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { data?: CrmData };
      if (!parsed?.data) {
        throw new Error("backup vuoto");
      }
      // Ripristino esatto: non si passa da commitData, che aggiungerebbe una riga
      // di storico al dato appena recuperato.
      setCrmData(() => parsed.data as CrmData);
      privateStorage.removeItem(migrationBackupKey);
      setMigrationBackup(false);
      setMigrationDismissed(false);
      runAction("Migrazione annullata: i dati sono tornati a prima della conversione.");
    } catch {
      runAction("Copia di migrazione illeggibile: nessuna modifica ai dati.");
    }
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

  function openModule(moduleKey: ModuleKey, pageKey?: string, filterTerm = "") {
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
    setQuery(filterTerm);
    setActiveModule(moduleKey);
    setActivePage(page.key);
    localStorage.setItem("fenix-suite-active-module", moduleKey);
    localStorage.setItem("fenix-suite-active-page", page.key);
    writeWorkspaceRoute(moduleKey, page.key);
    setNotice(`${module?.label ?? "Modulo"} / ${page.label}: pronto.`);
  }

  const openedPerson = personId ? crmData.contacts.find((contact) => contact.id === personId) ?? null : null;

  return (
    <main className="workspace-shell">
      <section className="app-main">
        <div className="workspace-navigation">
        <CrmTopbar
          activeModule={safeActiveModule}
          onLogout={onLogout}
          onOpenModule={openModule}
          searchSlot={
            <GlobalSearch
              data={crmData}
              onOpenResult={(result) => {
                if (result.contactId) {
                  setPersonId(result.contactId);
                }
                openModule(result.moduleKey, result.pageKey, result.query);
              }}
            />
          }
        />

          <aside className="app-sidebar">
            <button className="area-user-card button-reset" type="button" onClick={() => openModule("start")}>
              <UserRound size={28} />
              <span>
                <strong>{currentUser.name}</strong>
                <small>SALES</small>
              </span>
            </button>
            <nav className="module-nav" aria-label="Moduli gestionale" ref={moduleNavRef}>
              {mainModules.map(({ key, label, Icon }) => (
                <button
                  className={key === safeActiveModule ? "active" : ""}
                  key={key}
                  type="button"
                  onClick={() => openModule(key)}
                  aria-label={label}
                  aria-current={key === safeActiveModule ? "page" : undefined}
                  title={label}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span aria-hidden="true">{label}</span>
                </button>
              ))}
            </nav>
            {currentPages.length > 1 ? (
              <nav className="area-side-pages" aria-label={`Sottomenu ${currentModule.label}`} ref={submenuRef}>
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
        </div>
        <div className="area-workspace-frame">
        <motion.section
          className={`workspace-content ${safeActiveModule === "start" ? "area-start-content" : ""}`}
          initial={reduceMotion ? false : { y: 10 }}
          animate={reduceMotion ? undefined : { y: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={`workspace-status${notice ? "" : " is-quiet"}`} role="status">
            {notice ? (
              <span>
                <CheckCircle2 size={16} />
                {notice}
              </span>
            ) : null}
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
              {query.trim() ? (
                <button className="module-filter-chip" type="button" onClick={() => setQuery("")}>
                  <Search size={13} aria-hidden="true" />
                  Filtro: {query.trim()}
                  <X size={13} aria-hidden="true" />
                  <span className="sr-only">Rimuovi filtro</span>
                </button>
              ) : null}
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

          {safeActiveModule === "start" ? (
            <MigrationPanel
              data={crmData}
              pending={crmData.operationsModel !== 1 && !migrationDismissed}
              backupAvailable={migrationBackup}
              onApply={applyDataMigration}
              onUndo={undoDataMigration}
              onDismiss={() => setMigrationDismissed(true)}
            />
          ) : null}

          {safeActiveModule === "start" ? (
            <Area159ImportPanel
              data={crmData}
              backupAvailable={importBackup}
              onApply={applyArea159Data}
              onUndo={undoArea159Data}
            />
          ) : null}

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
                onOpenPerson={setPersonId}
              />
            </motion.div>
          </AnimatePresence>
        </motion.section>
        </div>
      </section>
      {openedPerson ? (
        <PersonCard
          contact={openedPerson}
          data={crmData}
          onClose={() => setPersonId(null)}
          onOpenModule={openModule}
        />
      ) : null}
    </main>
  );
}

function CrmTopbar({
  activeModule,
  onOpenModule,
  onLogout,
  searchSlot,
}: {
  activeModule: ModuleKey;
  onOpenModule: (moduleKey: ModuleKey) => void;
  onLogout: () => void;
  searchSlot?: ReactNode;
}) {
  const programsRef = useRef<HTMLDetailsElement>(null);
  const closePrograms = () => programsRef.current?.removeAttribute("open");

  return (
    <header className="area-topbar">
      <button className="area-topbar-brand button-reset" type="button" onClick={() => onOpenModule("start")}>
        <BrandMark />
        <span className="area-brand-copy">
          <strong>Fenix Suite</strong>
          <small>Real Estate CRM</small>
        </span>
      </button>
      {searchSlot}
      <details className="topbar-programs" ref={programsRef}>
        <summary aria-label="Apri gli altri programmi Fenix">
          <Blocks size={17} aria-hidden="true" />
          <span>Programmi</span>
        </summary>
        <nav aria-label="Altri programmi Fenix">
          {selectorPrograms.map(({ title, description, path, Icon }) => (
            <a
              key={path}
              href={path === "/crm" ? "/crm#start/start-dashboard" : path}
              title={description}
              aria-current={path === "/crm" ? "page" : undefined}
              onClick={closePrograms}
              // Gli altri programmi si aprono in una scheda nuova: il gestionale
              // resta dov'è invece di essere sostituito.
              {...(path === "/crm" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{title.replace("PROGRAMMA ", "")}</span>
            </a>
          ))}
        </nav>
      </details>
      <button className="area-topbar-logout" type="button" onClick={onLogout}>
        <LogOut size={17} />
        Esci
      </button>
    </header>
  );
}

type GlobalSearchResult = {
  key: string;
  label: string;
  detail: string;
  kind: string;
  contactId?: string;
  moduleKey: ModuleKey;
  pageKey: string;
  query: string;
};

/**
 * Ricerca unica del gestionale: cerca in rubrica, immobili e richieste senza
 * costringere a sapere in quale modulo si trova il dato.
 */
function GlobalSearch({
  data,
  onOpenResult,
}: {
  data: CrmData;
  onOpenResult: (result: GlobalSearchResult) => void;
}) {
  const [term, setTerm] = useState("");
  const needle = normalizeSearchValue(term);
  const results = useMemo<GlobalSearchResult[]>(() => {
    if (needle.length < 2) {
      return [];
    }
    const matches = (value: string) => normalizeSearchValue(value).includes(needle);
    const contactResults = data.contacts
      .filter((contact) => matches(`${contact.name} ${contact.phone} ${contact.email || ""} ${contact.taxCode || ""}`))
      .slice(0, 5)
      .map((contact) => ({
        key: contact.id,
        label: contact.name,
        detail: [contact.phone, contact.email, contact.type].filter(Boolean).join(" · "),
        kind: "Rubrica",
        contactId: contact.id,
        moduleKey: "nominativi" as ModuleKey,
        pageKey: "nominativi-elenco",
        query: contact.name,
      }));
    const propertyResults = data.properties
      .filter((property) => matches(`${property.code} ${property.title} ${property.zone} ${property.owner}`))
      .slice(0, 4)
      .map((property) => ({
        key: property.id,
        label: property.title,
        detail: [property.code, property.zone, property.owner].filter(Boolean).join(" · "),
        kind: "Immobile",
        moduleKey: "immobili" as ModuleKey,
        pageKey: "immobili-tutti",
        query: property.code || property.title,
      }));
    const requestResults = data.requests
      .filter((request) => matches(`${request.client} ${request.target} ${request.area} ${request.proposal}`))
      .slice(0, 4)
      .map((request) => ({
        key: request.id,
        label: request.client,
        detail: [request.target, request.area, request.status].filter(Boolean).join(" · "),
        kind: "Richiesta",
        moduleKey: "richieste" as ModuleKey,
        pageKey: "richieste-elenco",
        query: request.client,
      }));
    return [...contactResults, ...propertyResults, ...requestResults];
  }, [data, needle]);

  return (
    <form className="global-search" role="search" onSubmit={(event) => event.preventDefault()}>
      <span className="global-search-input">
        <Search size={17} aria-hidden="true" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setTerm("");
              event.currentTarget.blur();
            }
          }}
          placeholder="Cerca persona, telefono, immobile..."
          aria-label="Cerca in tutto il gestionale"
          autoComplete="off"
        />
        {term ? (
          <button type="button" onClick={() => setTerm("")} aria-label="Cancella ricerca">
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </span>
      {needle.length >= 2 ? (
        <div className="global-search-results">
          {results.length ? (
            results.map((result) => (
              <button
                key={`${result.kind}-${result.key}`}
                type="button"
                onClick={() => {
                  onOpenResult(result);
                  setTerm("");
                }}
              >
                <span>
                  <strong>{result.label}</strong>
                  <small>{result.detail || "Nessun dettaglio"}</small>
                </span>
                <em>{result.kind}</em>
              </button>
            ))
          ) : (
            <p>Nessun risultato per «{term.trim()}»: prova con un cognome, un numero o un codice immobile.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}

function PersonCard({
  contact,
  data,
  onClose,
  onOpenModule,
}: {
  contact: ContactRecord;
  data: CrmData;
  onClose: () => void;
  onOpenModule: (moduleKey: ModuleKey, pageKey?: string, filterTerm?: string) => void;
}) {
  const details = contact.details ?? {};
  const properties = propertiesForContact(contact, data.properties);
  const propertyIds = new Set(properties.map((property) => property.id));
  const mandates = data.mandates.filter(
    (mandate) => mandate.ownerContactId === contact.id || propertyIds.has(mandate.propertyId),
  );
  const deals = data.deals.filter(
    (deal) => deal.clientContactId === contact.id || propertyIds.has(deal.propertyId),
  );
  const leases = data.leases.filter(
    (lease) => lease.tenantContactId === contact.id || propertyIds.has(lease.propertyId),
  );
  const requests = data.requests.filter((request) => sameLabel(request.client, contact.name));
  const activities = data.activities
    .filter((activity) => sameLabel(activity.contact, contact.name))
    .slice(0, 6);
  const privacy = details.privacyRevocationDate
    ? "Consenso revocato"
    : details.doNotContact === "Si"
      ? "Non contattare"
      : details.privacyLegalBasis || "Da verificare";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="person-card-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="person-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Scheda di ${contact.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{contact.type || "Contatto"}</span>
            <h2>{contact.name}</h2>
            <small>
              {[contact.status, contact.owner ? `Operatore ${contact.owner}` : "", contact.source]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi scheda">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="person-card-body">
          <section>
            <h3>Recapiti</h3>
            <dl>
              <div>
                <dt>Telefono</dt>
                <dd>
                  {contact.phone ? <a href={`tel:${contact.phone.replace(/\s+/g, "")}`}>{contact.phone}</a> : "-"}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "-"}</dd>
              </div>
              <div>
                <dt>Codice fiscale</dt>
                <dd>{contact.taxCode || details.taxCode || "-"}</dd>
              </div>
              <div>
                <dt>Catasto</dt>
                <dd>{cadastralLabel(contact)}</dd>
              </div>
              <div>
                <dt>Prossimo passo</dt>
                <dd>{details.nextContactDate || contact.nextStep || "-"}</dd>
              </div>
              <div>
                <dt>Privacy</dt>
                <dd>{privacy}</dd>
              </div>
            </dl>
            {contact.note ? <p className="person-card-note">{contact.note}</p> : null}
          </section>

          <section>
            <h3>Immobili collegati</h3>
            {properties.length ? (
              <ul className="person-card-list">
                {properties.map((property) => (
                  <li key={property.id}>
                    <button type="button" onClick={() => { onClose(); onOpenModule("immobili", "immobili-tutti", property.code || property.title); }}>
                      <strong>{property.code || property.title}</strong>
                      <small>
                        {[property.title, property.zone, property.price, property.status].filter(Boolean).join(" · ")}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="person-card-empty">Nessun immobile collegato a questo nominativo.</p>
            )}
          </section>

          <section>
            <h3>Incarichi, trattative e contratti</h3>
            {mandates.length || deals.length || leases.length ? (
              <ul className="person-card-list">
                {mandates.map((mandate) => (
                  <li key={mandate.id}>
                    <button type="button" onClick={() => { onClose(); onOpenModule("acquisizione", "acquisizione-incarichi"); }}>
                      <strong>Incarico {mandate.type.toLowerCase()}</strong>
                      <small>{[mandate.exclusivity, `scade ${mandate.endDate}`, mandate.status].filter(Boolean).join(" · ")}</small>
                    </button>
                  </li>
                ))}
                {deals.map((deal) => (
                  <li key={deal.id}>
                    <button type="button" onClick={() => { onClose(); onOpenModule("trattative", "trattative-elenco"); }}>
                      <strong>Trattativa {deal.type.toLowerCase()}</strong>
                      <small>{[deal.stage, deal.offerAmount, deal.expiryDate ? `scade ${deal.expiryDate}` : ""].filter(Boolean).join(" · ")}</small>
                    </button>
                  </li>
                ))}
                {leases.map((lease) => (
                  <li key={lease.id}>
                    <button type="button" onClick={() => { onClose(); onOpenModule("locazioni", "locazioni-elenco"); }}>
                      <strong>Contratto di locazione</strong>
                      <small>{[lease.contractType, lease.rent, lease.endDate ? `fino al ${lease.endDate}` : ""].filter(Boolean).join(" · ")}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="person-card-empty">Nessun incarico, trattativa o contratto collegato.</p>
            )}
          </section>

          <section>
            <h3>Richieste</h3>
            {requests.length ? (
              <ul className="person-card-list">
                {requests.map((request) => (
                  <li key={request.id}>
                    <button type="button" onClick={() => { onClose(); onOpenModule("richieste", "richieste-elenco", request.client); }}>
                      <strong>{request.target}</strong>
                      <small>{[request.area, request.match, request.status, request.proposal].filter(Boolean).join(" · ")}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="person-card-empty">Nessuna richiesta registrata per questa persona.</p>
            )}
          </section>

          <section>
            <h3>Ultime attivita</h3>
            {activities.length ? (
              <ul className="person-card-timeline">
                {activities.map((activity) => (
                  <li key={activity.id}>
                    <span>{activity.updatedAt}</span>
                    <strong>{activity.title}</strong>
                    <small>{[activity.type, activity.status, activity.note].filter(Boolean).join(" · ")}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="person-card-empty">Nessuna attivita registrata: le telefonate del modulo telefonista compaiono qui.</p>
            )}
          </section>
        </div>

        <footer>
          <button type="button" onClick={() => { onClose(); onOpenModule("nominativi", "nominativi-elenco", contact.name); }}>
            Apri in rubrica
          </button>
          {properties.length ? (
            <button type="button" onClick={() => { onClose(); onOpenModule("proprietari", "proprietari-elenco", contact.name); }}>
              Apri tra i proprietari
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
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
  onOpenPerson,
}: {
  moduleKey: ModuleKey;
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenModule: (moduleKey: ModuleKey, pageKey?: string, filterTerm?: string) => void;
  currentUser: SessionUser;
  accounts: AccountRecord[];
  onAccountsChange: (updater: (accountList: AccountRecord[]) => AccountRecord[], message: string) => void;
  agendaResetVersion: number;
  onOpenPerson: (contactId: string) => void;
}) {
  if (moduleKey === "immobili") {
    return <PropertiesView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenMap={() => onOpenModule("censimento", "censimento-mappa")} />;
  }
  if (moduleKey === "acquisizione") {
    return <AcquisitionView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenModule={onOpenModule} />;
  }
  if (moduleKey === "trattative") {
    return <DealsView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenModule={onOpenModule} />;
  }
  if (moduleKey === "locazioni") {
    return <LeasesView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenModule={onOpenModule} />;
  }
  if (moduleKey === "richieste") {
    return <RequestsView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenPerson={onOpenPerson} />;
  }
  if (moduleKey === "nominativi") {
    return <ContactsView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenPerson={onOpenPerson} />;
  }
  if (moduleKey === "proprietari") {
    return <OwnersView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenPerson={onOpenPerson} onOpenMap={() => onOpenModule("censimento", "censimento-mappa")} />;
  }
  if (moduleKey === "agenda") {
    return <AgendaView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} resetVersion={agendaResetVersion} />;
  }
  if (moduleKey === "attivita") {
    return <ActivityCenterView pageKey={pageKey} query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenPerson={onOpenPerson} />;
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
    if (pageKey === "impostazioni-sedi") {
      return <OfficesView data={data} onCommit={onCommit} onAction={onAction} />;
    }
    return <SettingsView pageKey={pageKey} query={query} onCommit={onCommit} />;
  }
  return (
    <StartView
      accounts={accounts}
      currentUser={currentUser}
      data={data}
      onCommit={onCommit}
      onOpenModule={onOpenModule}
      onOpenPerson={onOpenPerson}
    />
  );
}

function StartView({
  accounts,
  currentUser,
  data,
  onOpenModule,
  onOpenPerson,
}: {
  accounts: AccountRecord[];
  currentUser: SessionUser;
  data: CrmData;
  onCommit: CrmCommit;
  onOpenModule: (moduleKey: ModuleKey, pageKey?: string) => void;
  onOpenPerson: (contactId: string) => void;
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
  const recallRows: { contact: ContactRecord; reason: string; source: string }[] = [];
  const seenRecallIds = new Set<string>();
  [...censusRecallRows, ...fallbackQueue].forEach((contact) => {
    if (seenRecallIds.has(contact.id)) {
      return;
    }
    seenRecallIds.add(contact.id);
    recallRows.push({
      contact,
      reason: [contact.status, contact.nextStep].filter(Boolean).join(" · "),
      source: censusRecallRows.some((row) => row.id === contact.id) ? "Censimento" : "Rubrica",
    });
  });
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
    <>
    <NextActionsPanel data={data} onOpenModule={onOpenModule} />
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

      <section className="area-card area-card-recall">
        <AreaCardHeader title="Da ricontattare" filter={accountScope.label} />
        <div className="area-list-section">
          {recallRows.length ? (
            <div className="area-recall-list">
              <div className="area-recall-head">
                <span>Nominativo</span>
                <span>Telefono</span>
                <span>Motivo</span>
              </div>
              {recallRows.slice(0, 10).map(({ contact, reason, source }) => (
                <button key={contact.id} type="button" onClick={() => onOpenPerson(contact.id)}>
                  <span>
                    <strong>{contact.name}</strong>
                    <small>{source}</small>
                  </span>
                  <b>{contact.phone || "-"}</b>
                  <em>{reason || "Nessun motivo indicato"}</em>
                </button>
              ))}
            </div>
          ) : (
            <p>Nessuno da ricontattare: quando un cliente ha un ricontatto o un esito aperto compare qui.</p>
          )}
          <div className="dashboard-link-row" aria-label="Azioni ricontatti">
            <button type="button" onClick={() => onOpenModule("nominativi", "nominativi-elenco")}>
              Apri rubrica
            </button>
            <button type="button" onClick={() => onOpenModule("censimento", "censimento-contatti")}>
              Apri censimento
            </button>
          </div>
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

    </div>
    </>
  );
}

function AreaCardHeader({ title, filter }: { title: string; filter?: string }) {
  return (
    <header className="area-card-header">
      <h2>{title}</h2>
      {filter ? <span className="area-card-tag">{filter}</span> : null}
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
  onOpenMap,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenMap: () => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
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
              label="Mappa immobiliare"
              Icon={MapPinned}
              onClick={onOpenMap}
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
        className={newMode || filtersOpen ? "span-8" : "span-12"}
        title={newMode ? "Schede recenti" : "Archivio immobili"}
        action={newMode ? undefined : filtersOpen ? "Chiudi filtri" : "Filtri"}
        onPanelAction={newMode ? undefined : () => setFiltersOpen((open) => !open)}
      >
          <DataTable
            emptyMessage="Nessun immobile in archivio: apri «Nuovo» per creare la prima scheda."
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
      </Panel>
      {(newMode || filtersOpen) ? (
      <Panel
        className={newMode ? "span-12 crm-form-panel" : "span-12"}
        title={newMode ? "Scheda immobile completa" : "Filtri avanzati"}
        action={newMode || !activeFilters(filters).length ? undefined : "Azzera filtri"}
        onPanelAction={newMode ? undefined : () => {
          setFilters({});
          onAction("Filtri immobili azzerati.");
        }}
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
            const ownerName = fieldValue(values, "ownerName", "Proprietario da associare");
            const existingOwner = data.contacts.find((contact) => sameLabel(contact.name, ownerName));
            const newOwnerId =
              !existingOwner && ownerName && !/da associare/i.test(ownerName) ? makeId("contact") : undefined;
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
              owner: ownerName,
              ownerContactId: existingOwner?.id ?? newOwnerId,
              officeId: data.offices[0]?.id,
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
                contacts: newOwnerId
                  ? [
                      {
                        id: newOwnerId,
                        name: ownerName,
                        type: "Proprietario",
                        status: "Da censire",
                        source: "Scheda immobile",
                        owner: fieldValue(values, "assignedAgent", ""),
                        phone: fieldValue(values, "ownerPhone"),
                        email: "",
                        note: `Proprietario della scheda ${newProperty.code}.`,
                        nextStep: "Primo contatto da programmare",
                        updatedAt: nowLabel(),
                      },
                      ...currentData.contacts,
                    ]
                  : currentData.contacts,
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
      ) : null}
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

const requestStages = ["Nuova", "Qualificata", "Visita", "Trattativa", "Chiusa"];

function daysInStage(request: RequestRecord) {
  const started = request.stageChangedAt ? new Date(request.stageChangedAt).getTime() : NaN;
  if (Number.isNaN(started)) {
    return "";
  }
  const days = Math.floor((Date.now() - started) / 86400000);
  if (days <= 0) {
    return "entrata oggi";
  }
  return days === 1 ? "1 giorno in fase" : `${days} giorni in fase`;
}

function RequestsView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
  onOpenPerson,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenPerson: (contactId: string) => void;
}) {
  const rows = useFilteredRows(data.requests, query, (item) =>
    [item.client, item.target, item.area, item.proposal].join(" "),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);

  function moveRequest(requestId: string, stage: string) {
    const request = data.requests.find((item) => item.id === requestId);
    if (!request || request.status === stage) {
      return;
    }
    onCommit(
      (currentData) => ({
        ...currentData,
        requests: currentData.requests.map((item) =>
          item.id === requestId
            ? { ...item, status: stage, stageChangedAt: new Date().toISOString(), updatedAt: nowLabel() }
            : item,
        ),
      }),
      `Richiesta ${request.client} spostata in «${stage}».`,
    );
  }

  function openClient(clientName: string) {
    const contact = data.contacts.find((item) => sameLabel(item.name, clientName));
    if (!contact) {
      onAction(`Nessuna scheda in rubrica per ${clientName}: crea il nominativo per aprire la scheda persona.`);
      return;
    }
    onOpenPerson(contact.id);
  }

  return (
    <div className="workspace-grid">
      <Panel
        className={pageKey === "richieste-nuova" ? "span-8" : "span-12"}
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
          emptyMessage="Nessun incrocio: servono almeno una richiesta e un immobile compatibili. Avvia il matching automatico dal riquadro qui sopra."
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
      {pageKey === "richieste-nuova" ? (
      <Panel className="span-12 crm-form-panel" title="Preferenza completa">
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
      </Panel>
      ) : null}
      <Panel className="span-12" title={`Pipeline richieste (${rows.length})`}>
        <div className="pipeline-board">
          {requestStages.map((stage) => {
            const stageRequests = rows.filter((request) => (request.status || "Nuova") === stage);
            return (
              <div
                className={`pipeline-column ${dropStage === stage ? "is-drop-target" : ""}`}
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (dropStage !== stage) {
                    setDropStage(stage);
                  }
                }}
                onDragLeave={() => setDropStage((current) => (current === stage ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  const requestId = draggingId || event.dataTransfer.getData("text/plain");
                  if (requestId) {
                    moveRequest(requestId, stage);
                  }
                  setDraggingId(null);
                  setDropStage(null);
                }}
              >
                <header>
                  <span>{stage}</span>
                  <strong>{stageRequests.length}</strong>
                </header>
                <div className="pipeline-column-body">
                  {stageRequests.length ? (
                    stageRequests.map((request) => {
                      const contact = data.contacts.find((item) => sameLabel(item.name, request.client));
                      return (
                        <article
                          className={`pipeline-card ${draggingId === request.id ? "is-dragging" : ""}`}
                          key={request.id}
                          draggable
                          onDragStart={(event) => {
                            setDraggingId(request.id);
                            event.dataTransfer.setData("text/plain", request.id);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDropStage(null);
                          }}
                        >
                          <header>
                            <button
                              className="pipeline-card-client"
                              type="button"
                              onClick={() => (contact ? openClient(request.client) : onAction(`${request.client} non e' in rubrica: aggiungilo per aprire la scheda persona.`))}
                              title="Apri la scheda persona"
                            >
                              {request.client}
                            </button>
                            <span>{request.match}</span>
                          </header>
                          <p>{request.target}</p>
                          <small>{[request.area, request.proposal].filter(Boolean).join(" · ") || "Nessun dettaglio"}</small>
                          <footer>
                            <span>{daysInStage(request) || request.updatedAt}</span>
                            <select
                              aria-label={`Sposta ${request.client} in un'altra fase`}
                              value={stage}
                              onChange={(event) => moveRequest(request.id, event.target.value)}
                            >
                              {requestStages.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </footer>
                        </article>
                      );
                    })
                  ) : (
                    <p className="pipeline-column-empty">
                      {stage === "Nuova" ? "Trascina qui una richiesta per metterla in lavorazione." : "Nessuna richiesta in questa fase."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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
  onOpenPerson,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenPerson: (contactId: string) => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      {pageKey === "nominativi-richieste" ? (
        <RequestsView pageKey="richieste-elenco" query={query} data={data} onCommit={onCommit} onAction={onAction} onOpenPerson={onOpenPerson} />
      ) : (
        <>
      <Panel
        className={pageKey === "nominativi-nuovo" ? "span-8" : "span-12"}
        title="Database clienti"
        action={pageKey === "nominativi-nuovo" ? undefined : filtersOpen ? "Chiudi filtri" : "Filtri"}
        onPanelAction={pageKey === "nominativi-nuovo" ? undefined : () => setFiltersOpen((open) => !open)}
      >
        <DataTable
          emptyMessage="Nessun nominativo in rubrica: apri «Nuovo» per inserire il primo cliente."
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
              label: "Scheda",
              onClick: (rowIndex) => {
                const contact = rows[rowIndex];
                if (contact) {
                  onOpenPerson(contact.id);
                }
              },
            },
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
      {(pageKey === "nominativi-nuovo" || filtersOpen) ? (
      <Panel
        className={pageKey === "nominativi-nuovo" ? "span-12 crm-form-panel" : "span-12"}
        title={pageKey === "nominativi-nuovo" ? "Anagrafica completa" : "Filtri nominativi"}
        action={pageKey === "nominativi-nuovo" || !activeFilters(filters).length ? undefined : "Azzera filtri"}
        onPanelAction={pageKey === "nominativi-nuovo" ? undefined : () => {
          setFilters({});
          onAction("Filtri clienti azzerati.");
        }}
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
      ) : null}
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
  onOpenMap,
  onOpenPerson,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenMap: () => void;
  onOpenPerson: (contactId: string) => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      <Panel
        className={linkMode ? "span-8" : "span-12"}
        title="Archivio proprietari"
        action={linkMode ? undefined : filtersOpen ? "Chiudi filtri" : "Filtri"}
        onPanelAction={linkMode ? undefined : () => setFiltersOpen((open) => !open)}
      >
        {!linkMode ? (
          <div className="panel-toolbar">
            <button type="button" className="toolbar-button" onClick={onOpenMap}>
              <MapPinned size={16} aria-hidden="true" />
              <span>Mappa immobiliare</span>
            </button>
          </div>
        ) : null}
        <DataTable
          emptyMessage="Nessun proprietario: i contatti della rubrica compaiono qui quando li colleghi a un immobile."
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
              label: "Scheda",
              onClick: (rowIndex) => {
                const owner = owners[rowIndex];
                if (owner) {
                  onOpenPerson(owner.id);
                }
              },
            },
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
      {filtersOpen && !linkMode ? (
        <Panel
          className="span-12"
          title="Filtro proprietari"
          action={activeFilters(filters).length ? "Azzera filtri" : undefined}
          onPanelAction={() => {
            setFilters({});
            onAction("Filtri proprietari azzerati.");
          }}
        >
          <QuickForm
            button="Filtra proprietari"
            fields={searchFilterFields}
            required={false}
            onSubmit={(values) => {
              setFilters(values);
              onAction(`Filtro proprietari applicato: ${valuesSummary(values)}.`);
            }}
          />
        </Panel>
      ) : null}
      {linkMode ? (
        <Panel className="span-4 crm-form-panel" title="Collega a immobile">
          <QuickForm
            button="Collega proprietario"
            fields={[
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
            ]}
            required
            onSubmit={upsertOwner}
          />
        </Panel>
      ) : null}
    </div>
  );
}

function ActivityCenterView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
  onOpenPerson,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
  onOpenPerson: (contactId: string) => void;
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
          emptyMessage="Nessuna attività registrata: pianifica la prima dall'agenda."
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
              label: "Scheda",
              onClick: (rowIndex) => {
                const activity = rows[rowIndex];
                const contact = activity
                  ? data.contacts.find((item) => sameLabel(item.name, activity.contact))
                  : undefined;
                if (!contact) {
                  onAction(activity?.contact ? `${activity.contact} non e' in rubrica.` : "Questa attivita non ha un contatto collegato.");
                  return;
                }
                onOpenPerson(contact.id);
              },
            },
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const newMode = pageKey === "agenda-nuova";
  const activeFilterCount = activeFilters(filters).length;
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
      <Panel
        className={newMode || filtersOpen ? "span-8" : "span-12"}
        title={pageKey === "agenda-storico" ? "Ricerca storico attivita" : "Agenda operativa"}
        action={newMode
          ? undefined
          : filtersOpen
            ? "Chiudi filtri"
            : activeFilterCount
              ? `Filtri · ${activeFilterCount}`
              : "Filtri"}
        onPanelAction={newMode ? undefined : () => setFiltersOpen((open) => !open)}
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
      {(newMode || filtersOpen) ? (
      <Panel
        className={newMode ? "span-12 crm-form-panel" : "span-4"}
        title={newMode ? "Nuova attività completa" : "Filtro agenda"}
        action={newMode || !activeFilterCount ? undefined : "Azzera filtri"}
        onPanelAction={newMode ? undefined : () => {
          setFilters({});
          onAction("Filtri agenda azzerati.");
        }}
      >
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
      ) : null}
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
    [contact.name, contact.firstName, contact.lastName, contact.phone, contact.email, contact.taxCode, contact.type, contact.status, contact.source, contact.note, contact.nextStep].join(" "),
  );

  return (
    <div className="workspace-grid">
      <Panel className="span-8" title="Contatti pubblicitari">
        <DataTable
          emptyMessage="Nessun contatto da portali, sito o campagne: arriveranno qui con la provenienza compilata."
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

function GoalsView({ query, data, onCommit }: { query: string; data: CrmData; onCommit: CrmCommit }) {
  const rows = useFilteredRows(data.goals, query, (goal) =>
    [goal.label, goal.owner, String(goal.current), String(goal.target), goal.updatedAt].join(" "),
  );

  return (
    <div className="workspace-grid">
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

/** Solo i dati identificativi gia' presenti nel CRM entrano nell'archivio cifrato. */
function compactInformation(values: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => [key, (value as string).trim()]),
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
  const archiveRecords = useMemo<ArchiveCandidate[]>(() => {
    if (pageKey !== "utilita-backup") {
      return [];
    }

    return [
      ...data.contacts.map((contact) => ({
        id: `contact:${contact.id}`,
        kind: "contact" as const,
        label:
          contact.name ||
          [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
          contact.id,
        source: contact.source ?? "",
        information: compactInformation({
          nome: contact.name,
          telefono: contact.phone,
          email: contact.email,
        }),
      })),
      ...data.properties.map((property) => ({
        id: `property:${property.id}`,
        kind: "property" as const,
        label: property.title || property.code || property.id,
        source: property.source ?? "",
        information: compactInformation({
          codice: property.code,
          titolo: property.title,
          zona: property.zone,
          proprietario: property.owner,
        }),
      })),
    ];
  }, [data.contacts, data.properties, pageKey]);
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
      {pageKey === "utilita-backup" ? (
        <Panel className="span-12" title="Archivio cifrato">
          <InformationArchivePanel records={archiveRecords} />
        </Panel>
      ) : null}
      <Panel className="span-6" title="Strumenti collegati">
        <div className="tool-grid compact-tools">
          {externalTools.map((tool) => (
            <a className="tool-button" href={tool.href} key={tool.title} target="_blank" rel="noopener noreferrer">
              <tool.Icon size={20} />
              <span>{tool.title}</span>
              <ArrowUpRight size={15} />
            </a>
          ))}
        </div>
      </Panel>
      {pageKey === "utilita-portali" ? (
        <PortalMatrixPanel properties={data.properties} onCommit={onCommit} />
      ) : null}
      <Panel className="span-6" title={utilityTitle}>
        <DataTable columns={utilityColumns} rows={utilityRows} />
      </Panel>
      <Panel className="span-6" title="Import export">
        <div className="tool-grid">
          <ToolButton label={pageKey === "utilita-portali" ? "Esporta portali" : "Importa Excel"} Icon={UploadCloud} onClick={() => {
            if (pageKey === "utilita-portali") {
              downloadCrmData(portalExport(data.properties), "portali");
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

  if (currentUser.source === "supabase") {
    return <div className="workspace-grid">
      <Panel className="span-12" title="Profilo account">
        <p>{currentUser.name} · {currentUser.email} · {currentUser.role}</p>
        <p>Per creare utenti, cambiare ruoli, sospendere account o reimpostare password, contatta l’amministratore. La gestione account da questa schermata non è ancora disponibile.</p>
      </Panel>
    </div>;
  }

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
    const temporaryPassword = crypto.randomUUID();
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
                  role: "SVILUPPATORE" as UserRole,
                  status: "Attivo" as AccountStatus,
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
    const savedData = privateStorage.getItem(crmStorageKey);
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
    privateStorage.setItem(crmStorageKey, JSON.stringify(data));
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

/** Segnala quale bordo di una striscia scorrevole ha ancora schede oltre il taglio. */
function hydrateCrmData(savedData: Partial<CrmData>): CrmData {
  const hydrated: CrmData = {
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
    offices: Array.isArray(savedData.offices) ? savedData.offices : initialCrmData.offices,
    mandates: Array.isArray(savedData.mandates) ? savedData.mandates : initialCrmData.mandates,
    // Le provvigioni chiuse come testo diventano importi sommabili al caricamento.
    deals: backfillDealCommissions(Array.isArray(savedData.deals) ? savedData.deals : initialCrmData.deals),
    leases: Array.isArray(savedData.leases) ? savedData.leases : initialCrmData.leases,
    operationsModel: typeof savedData.operationsModel === "number" ? savedData.operationsModel : 0,
  };

  // La conversione al nuovo modello non parte da sola: viene mostrata in
  // anteprima in "Oggi" e applicata solo su conferma, con copia di ripristino.
  return hydrated;
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

function downloadCrmData(data: CrmData | ReturnType<typeof portalExport>, label = "backup") {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fenix-suite-${label}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
