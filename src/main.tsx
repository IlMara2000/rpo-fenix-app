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

type ProgramCard = {
  title: string;
  description: string;
  path: string;
  Icon: LucideIcon;
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
  priority: string;
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

type CrmData = {
  properties: PropertyRecord[];
  requests: RequestRecord[];
  contacts: ContactRecord[];
  activities: ActivityRecord[];
  marketingChannels: MarketingChannelRecord[];
  censusAreas: CensusAreaRecord[];
  goals: GoalRecord[];
  activityLog: string[];
};

type CrmCommit = (updater: (data: CrmData) => CrmData, message: string) => void;

const accountEmail = "daniele.marangoni@grfenix.com";
const accountPasswordHash =
  "35b47eca325c70ec48ba4d8489301c7ee82b6a50ac330938158dcfe1a5fded11";

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
      "Gestionale operativo per immobili, nominativi, richieste, agenda, censimento e attivita di agenzia.",
    path: "/crm",
    Icon: Gauge,
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
  },
];

const modules: ModuleItem[] = [
  {
    key: "start",
    label: "Start",
    description: "Telefonate, ricontatti, appunti e nominativi da sviluppare oggi.",
    Icon: Gauge,
  },
  {
    key: "immobili",
    label: "Immobili",
    description: "Schede, incarichi, media, proprietari e pubblicazione.",
    Icon: Home,
  },
  {
    key: "richieste",
    label: "Richieste",
    description: "Domande clienti, matching e proposte compatibili.",
    Icon: BriefcaseBusiness,
  },
  {
    key: "nominativi",
    label: "Nominativi",
    description: "Clienti, proprietari, provenienze e storico contatti.",
    Icon: UsersRound,
  },
  {
    key: "agenda",
    label: "Attivita",
    description: "Appuntamenti, visite, attivita e follow-up.",
    Icon: CalendarDays,
  },
  {
    key: "pubblicita",
    label: "Pubblicita",
    description: "Portali, vetrina, campagne e sincronizzazioni.",
    Icon: Globe2,
  },
  {
    key: "contattiPubblicita",
    label: "Contatti Pubblicita",
    description: "Lead pubblicitari, richieste da portali, email e presa in carico.",
    Icon: CircleDot,
  },
  {
    key: "censimento",
    label: "Censimento",
    description: "Zone, palazzi, contatti territoriali e ricontatti.",
    Icon: MapPinned,
  },
  {
    key: "obiettivi",
    label: "Obiettivi",
    description: "Target di agenzia, performance e avanzamento commerciale.",
    Icon: Target,
  },
  {
    key: "utilita",
    label: "Utilita",
    description: "Backup, importazioni, esportazioni e strumenti collegati.",
    Icon: Wrench,
  },
  {
    key: "impostazioni",
    label: "Impostazioni",
    description: "Account, ruoli, permessi, automazioni e preferenze.",
    Icon: Settings,
  },
];

const modulePages: Record<ModuleKey, ModulePage[]> = {
  start: [
    {
      key: "start-dashboard",
      label: "Cruscotto",
      description: "Telefonate, ricontatti, appunti veloci e nominativi da sviluppare nella giornata.",
      Icon: LayoutDashboard,
    },
  ],
  immobili: [
    {
      key: "immobili-nuovo",
      label: "Nuovo",
      description: "Inserimento scheda immobile con proprietario, incarico, prezzi, media e pubblicazione.",
      Icon: Plus,
    },
    {
      key: "immobili-tutti",
      label: "Tutti",
      description: "Archivio completo con filtri, stato pratica, portali e azioni rapide.",
      Icon: ListChecks,
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
      description: "Ricerca per proprietario e opportunita di acquisizione.",
      Icon: Search,
    },
    {
      key: "immobili-ricerca-cli",
      label: "Ricerca C.",
      description: "Ricerca compatibilita clienti rispetto agli immobili.",
      Icon: UsersRound,
    },
  ],
  richieste: [
    {
      key: "richieste-nuova",
      label: "Nuova Richiesta",
      description: "Creazione richiesta cliente con budget, zone, tipologie e matching.",
      Icon: Plus,
    },
    {
      key: "richieste-elenco",
      label: "Elenco Richieste",
      description: "Archivio richieste, stato, proposta collegata e priorita.",
      Icon: BriefcaseBusiness,
    },
    {
      key: "richieste-matching",
      label: "Incroci",
      description: "Abbinamento automatico fra richieste e immobili attivi.",
      Icon: RefreshCcwDot,
    },
  ],
  nominativi: [
    {
      key: "nominativi-nuovo",
      label: "Nuovo",
      description: "Inserimento nominativo con privacy, provenienza e categoria commerciale.",
      Icon: UserRound,
    },
    {
      key: "nominativi-elenco",
      label: "Elenco Nominativi",
      description: "Rubrica clienti, proprietari e contatti con storico comunicazioni.",
      Icon: UsersRound,
    },
    {
      key: "nominativi-richieste",
      label: "Richieste",
      description: "Richieste collegate alle anagrafiche e agli immobili compatibili.",
      Icon: BriefcaseBusiness,
    },
  ],
  agenda: [
    {
      key: "attivita-nuova",
      label: "Nuova",
      description: "Nuova attivita, telefonata, appuntamento o visita collegata a contatto e immobile.",
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
      key: "censimento-contatto-nuovo",
      label: "Nuovo Contatto",
      description: "Nuovo contatto territoriale collegato a zona, stabile o complesso.",
      Icon: Plus,
    },
    {
      key: "censimento-contatti",
      label: "Contatti",
      description: "Elenco contatti censiti, ricontatti e stato commerciale.",
      Icon: UsersRound,
    },
    {
      key: "censimento-zone",
      label: "Elenco Zone",
      description: "Zone censimento con stabili, priorita e avanzamento.",
      Icon: MapPinned,
    },
    {
      key: "censimento-zona-nuova",
      label: "Nuova Zona",
      description: "Creazione zona con riferimenti territoriali e priorita.",
      Icon: Plus,
    },
    {
      key: "censimento-complessi",
      label: "Complessi",
      description: "Complessi e stabili collegati a zone, civici e contatti.",
      Icon: Building2,
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
      key: "utilita-preferenze",
      label: "Preferenze",
      description: "Preferenze utente e comportamento interfaccia.",
      Icon: Settings,
    },
    {
      key: "utilita-backup",
      label: "Copie sicurezza",
      description: "Backup, esportazioni e archivio operativo.",
      Icon: DatabaseBackup,
    },
    {
      key: "utilita-portali",
      label: "Esportazioni",
      description: "Code di esportazione e stato invio ai portali.",
      Icon: UploadCloud,
    },
    {
      key: "utilita-pubblicita",
      label: "Pubblicita",
      description: "Accesso rapido alla gestione pubblicitaria.",
      Icon: Globe2,
    },
    {
      key: "utilita-info-territoriali",
      label: "Info Territoriali",
      description: "Collegamento a servizi territoriali esterni.",
      Icon: MapPinned,
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
  const savedModule = localStorage.getItem("fenix-suite-active-module") as ModuleKey | null;
  return savedModule && modules.some((module) => module.key === savedModule) ? savedModule : "start";
}

function getInitialPage(moduleKey: ModuleKey) {
  const savedPage = localStorage.getItem("fenix-suite-active-page");
  return savedPage && modulePages[moduleKey].some((page) => page.key === savedPage)
    ? savedPage
    : modulePages[moduleKey][0].key;
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
      "Mappa zone, contatti e ricontatti per costruire nuove acquisizioni con attivita ordinate per priorita commerciale.",
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
      "Schede complete per clienti, proprietari e richieste, con contatti veloci e storico comunicazioni integrato.",
    Icon: UsersRound,
  },
  {
    title: "Immobili",
    description:
      "Archivio annunci, media, caratteristiche e pubblicazione: ogni scheda puo essere catalogata secondo le esigenze.",
    Icon: Home,
  },
];

const leadRows = [
  { name: "Rossi Immobiliare", tag: "Vendita", score: "94%" },
  { name: "Attico Centro", tag: "Acquisizione", score: "87%" },
  { name: "Villa Mare", tag: "Locazione", score: "81%" },
];

const properties = [
  {
    code: "FS-248",
    title: "Trilocale Centro",
    zone: "Milano Centro",
    status: "In pubblicazione",
    price: "418.000",
    owner: "Proprietario Demo",
    portals: "6/7",
  },
  {
    code: "FS-192",
    title: "Villa con giardino",
    zone: "Brianza",
    status: "In acquisizione",
    price: "690.000",
    owner: "Studio Fenix",
    portals: "Bozza",
  },
  {
    code: "FS-176",
    title: "Bilocale locazione",
    zone: "Porta Romana",
    status: "Visite attive",
    price: "1.450/mese",
    owner: "Cliente Demo",
    portals: "5/7",
  },
  {
    code: "FS-151",
    title: "Ufficio direzionale",
    zone: "City Life",
    status: "Trattativa",
    price: "820.000",
    owner: "Societa Demo",
    portals: "Privato",
  },
];

const requests = [
  {
    client: "Cliente Acquisto A",
    target: "3 locali entro 450k",
    area: "Centro / Porta Venezia",
    match: "94%",
    proposal: "Trilocale Centro",
  },
  {
    client: "Cliente Locazione B",
    target: "Bilocale arredato",
    area: "Sud Milano",
    match: "88%",
    proposal: "Bilocale locazione",
  },
  {
    client: "Investitore Demo",
    target: "Rendimento sopra 5%",
    area: "Area metropolitana",
    match: "76%",
    proposal: "Ufficio direzionale",
  },
];

const contacts = [
  {
    name: "Cliente Demo A",
    type: "Acquirente",
    status: "Da ricontattare oggi",
    source: "Portale",
    owner: "Daniele",
  },
  {
    name: "Proprietario Demo B",
    type: "Venditore",
    status: "Valutazione inviata",
    source: "Censimento",
    owner: "Team",
  },
  {
    name: "Cliente Demo C",
    type: "Locazione",
    status: "Visita pianificata",
    source: "Sito",
    owner: "Back office",
  },
];

const agendaItems = [
  {
    time: "09:30",
    title: "Visita appartamento centro",
    type: "Visita",
    owner: "Daniele",
  },
  {
    time: "12:00",
    title: "Acquisizione nuova villa",
    type: "Incarico",
    owner: "Team",
  },
  {
    time: "16:15",
    title: "Follow-up cliente premium",
    type: "Telefonata",
    owner: "Daniele",
  },
];

const marketingChannels = [
  { name: "Sito agenzia", status: "Aggiornato", progress: 100 },
  { name: "Portali immobiliari", status: "6 pubblicazioni attive", progress: 86 },
  { name: "Vetrina QR", status: "12 cartelli pronti", progress: 72 },
  { name: "Campagne lead", status: "3 campagne in verifica", progress: 61 },
];

const censusAreas = [
  { zone: "Centro", buildings: 148, contacts: 632, priority: "Alta" },
  { zone: "Navigli", buildings: 96, contacts: 318, priority: "Media" },
  { zone: "Isola", buildings: 74, contacts: 276, priority: "Alta" },
  { zone: "Sud", buildings: 122, contacts: 447, priority: "Normale" },
];

const goals = [
  { label: "Nuove acquisizioni", current: 18, target: 25 },
  { label: "Visite programmate", current: 42, target: 50 },
  { label: "Richieste qualificate", current: 96, target: 120 },
  { label: "Schede pubblicate", current: 34, target: 40 },
];

const crmStorageKey = "fenix-suite-crm-data-v1";

const initialCrmData: CrmData = {
  properties: properties.map((property, index) => ({
    ...property,
    id: `property-${index + 1}`,
    kind: property.price.includes("/mese") ? "affitto" : "vendita",
    updatedAt: "Demo iniziale",
  })),
  requests: requests.map((request, index) => ({
    ...request,
    id: `request-${index + 1}`,
    status: index === 0 ? "Qualificata" : index === 1 ? "Visita" : "Nuova",
    updatedAt: "Demo iniziale",
  })),
  contacts: contacts.map((contact, index) => ({
    ...contact,
    id: `contact-${index + 1}`,
    phone: index === 0 ? "+39 333 000 1001" : index === 1 ? "+39 333 000 1002" : "+39 333 000 1003",
    note: "Contatto demo importato all'avvio.",
    nextStep: contact.status,
    updatedAt: "Demo iniziale",
  })),
  activities: agendaItems.map((item, index) => ({
    ...item,
    id: `activity-${index + 1}`,
    contact: index === 0 ? "Cliente Demo A" : index === 1 ? "Proprietario Demo B" : "Cliente Demo C",
    property: index === 0 ? "Trilocale Centro" : index === 1 ? "Villa con giardino" : "",
    status: "Aperta",
    note: "Attivita demo pianificata.",
    day: "Oggi",
    updatedAt: "Demo iniziale",
  })),
  marketingChannels: marketingChannels.map((channel, index) => ({
    ...channel,
    id: `channel-${index + 1}`,
    updatedAt: "Demo iniziale",
  })),
  censusAreas: censusAreas.map((area, index) => ({
    ...area,
    id: `area-${index + 1}`,
    updatedAt: "Demo iniziale",
  })),
  goals: goals.map((goal, index) => ({
    ...goal,
    id: `goal-${index + 1}`,
    owner: "Team Fenix",
    updatedAt: "Demo iniziale",
  })),
  activityLog: ["Demo CRM inizializzata."],
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
  useEffect(() => {
    document.title = "Fenix Group | Suite";
  }, []);

  return (
    <main className="suite-selector-shell">
      <section className="suite-selector" aria-label="Selezione programma">
        <img className="suite-selector-logo" src="/logo.png" alt="Fenix Group Real Estate" />
        <div className="suite-selector-label">Seleziona un programma</div>
        <div className="suite-program-grid">
          {selectorPrograms.map(({ title, description, path, Icon }) => (
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
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem("fenix-suite-session") === "active"
      ? "workspace"
      : "marketing",
  );

  function openLogin() {
    setScreen("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMarketing() {
    setScreen("marketing");
    window.location.hash = "top";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openWorkspace() {
    localStorage.setItem("fenix-suite-session", "active");
    setScreen("workspace");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function logout() {
    localStorage.removeItem("fenix-suite-session");
    setScreen("marketing");
  }

  if (screen === "workspace") {
    return <Workspace onLogout={logout} />;
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
          <strong>248</strong>
        </div>
        <div>
          <small>Lead attivi</small>
          <strong>1.420</strong>
        </div>
        <div>
          <small>Matching</small>
          <strong>86%</strong>
        </div>
      </div>
      <div className="dash-grid">
        <div className="timeline-panel">
          <div className="panel-title">
            <CalendarDays size={18} />
            Agenda di oggi
          </div>
          {agendaItems.map((item) => (
            <div className="timeline-item" key={item.time}>
              <span>{item.time}</span>
              <p>{item.title}</p>
            </div>
          ))}
        </div>
        <div className="lead-panel">
          <div className="panel-title">
            <Sparkles size={18} />
            Incroci automatici
          </div>
          {leadRows.map((row) => (
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
          Compila il modulo per ricevere dettagli, assistenza o una demo del gestionale
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
            <input required type="text" placeholder="Mario Rossi" />
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
              Seleziona una richiesta
            </option>
            <option>Demo gestionale</option>
            <option>Informazioni commerciali</option>
            <option>Assistenza tecnica</option>
          </select>
        </label>
        <label>
          Messaggio
          <textarea placeholder="Scrivi qui la tua richiesta..." rows={5} />
        </label>
        <label className="privacy-check">
          <input required type="checkbox" />
          <span>Ho letto e accetto la privacy policy.</span>
        </label>
        <button className="primary-action form-button" type="submit">
          Invia
        </button>
        <p className="form-success" role="status">
          Richiesta pronta. Nel sito reale questo invierebbe il contatto al CRM.
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
  onSuccess: () => void;
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

    if (email === accountEmail && passwordHash === accountPasswordHash) {
      onSuccess();
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
            La suite interna raccoglie cruscotto, immobili, richieste, anagrafiche,
            agenda, censimento e strumenti collegati in un unico ambiente.
          </p>
          <div className="login-highlights">
            <span>
              <ShieldCheck size={18} />
              Sessione demo locale
            </span>
            <span>
              <DatabaseBackup size={18} />
              Dati prototipo non reali
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
              placeholder="email aziendale"
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
            Account registrato per l'accesso demo. La password non e' salvata in chiaro
            nel frontend.
          </p>
        </form>
      </section>
    </main>
  );
}

function Workspace({ onLogout }: { onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState<ModuleKey>(() => getInitialModule());
  const [activePage, setActivePage] = useState(() => getInitialPage(getInitialModule()));
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Dashboard aggiornata.");
  const [crmData, setCrmData] = usePersistentCrmData();
  const currentModule = modules.find((item) => item.key === activeModule) ?? modules[0];
  const currentPage =
    modulePages[activeModule].find((item) => item.key === activePage) ??
    modulePages[activeModule][0];
  const currentPath = pathForPage(currentPage.key);
  const creationPage = modulePages[activeModule].find((page) =>
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

  function openModule(moduleKey: ModuleKey, pageKey = modulePages[moduleKey][0].key) {
    const module = modules.find((item) => item.key === moduleKey);
    const page = modulePages[moduleKey].find((item) => item.key === pageKey) ?? modulePages[moduleKey][0];
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
          <span>Fenix CRM</span>
          <b>v. 1.0.0</b>
        </div>
        <nav className="module-nav" aria-label="Moduli gestionale">
          {modules.map(({ key, label, Icon }) => (
            <button
              className={key === activeModule ? "active" : ""}
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
            {externalTools.map((tool) => (
              <a href={tool.href} key={tool.title}>
                {tool.title}
                <ArrowUpRight size={15} />
              </a>
            ))}
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
            <small>Utente: Daniele Marangoni</small>
          </div>

          <section className="module-heading">
            <div>
              <span className="system-label">{currentPath}</span>
              <h1>{currentPage.label}</h1>
              <p>{currentPage.description}</p>
            </div>
            {creationPage && currentPage.key !== creationPage.key ? (
              <button
                className="module-action"
                type="button"
                onClick={() => openModule(activeModule, creationPage.key)}
              >
                <Plus size={18} />
                Nuovo
              </button>
            ) : null}
          </section>

          <ModuleTabs
            activeModule={activeModule}
            activePage={currentPage.key}
            onSelect={(pageKey) => {
              setActivePage(pageKey);
              localStorage.setItem("fenix-suite-active-module", activeModule);
              localStorage.setItem("fenix-suite-active-page", pageKey);
              const page = modulePages[activeModule].find((item) => item.key === pageKey);
              setNotice(`${currentModule.label} / ${page?.label ?? "Sezione"}: pronto.`);
            }}
          />

          <ModuleView
            moduleKey={activeModule}
            pageKey={currentPage.key}
            query={query}
            data={crmData}
            onCommit={commitData}
            onAction={runAction}
          />
        </section>
      </section>
    </main>
  );
}

function ModuleTabs({
  activeModule,
  activePage,
  onSelect,
}: {
  activeModule: ModuleKey;
  activePage: string;
  onSelect: (pageKey: string) => void;
}) {
  const pages = modulePages[activeModule];

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
}: {
  moduleKey: ModuleKey;
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
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
    return <AgendaView pageKey={pageKey} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "pubblicita") {
    return <MarketingView data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "contattiPubblicita") {
    return <AdvertisingContactsView pageKey={pageKey} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "censimento") {
    return <CensusView pageKey={pageKey} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "obiettivi") {
    return <GoalsView data={data} onCommit={onCommit} />;
  }
  if (moduleKey === "utilita") {
    return <UtilitiesView pageKey={pageKey} data={data} onCommit={onCommit} onAction={onAction} />;
  }
  if (moduleKey === "impostazioni") {
    return <SettingsView pageKey={pageKey} onCommit={onCommit} />;
  }
  return <StartView data={data} onCommit={onCommit} />;
}

function StartView({ data, onCommit }: { data: CrmData; onCommit: CrmCommit }) {
  const callQueue = data.contacts
    .filter((contact) => /ricontattare|lead|valutazione|visita/i.test(contact.status))
    .slice(0, 5);
  const fallbackQueue = callQueue.length ? callQueue : data.contacts.slice(0, 5);
  const todayCalls = data.activities.filter(
    (activity) => activity.day === "Oggi" && /telefonata/i.test(activity.type),
  ).length;
  const urgentFollowUps = data.contacts.filter((contact) => /ricontattare|lead/i.test(contact.status)).length;
  const openAppointments = data.activities.filter(
    (activity) => activity.day === "Oggi" && /visita|appuntamento|incarico/i.test(activity.type),
  ).length;

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
      <div className="kpi-row">
        <KpiCard label="Chiamate oggi" value={String(todayCalls)} trend="storico aggiornato" Icon={PhoneCall} />
        <KpiCard label="Ricontatti" value={String(urgentFollowUps)} trend="lead e richiami aperti" Icon={CalendarCheck2} />
        <KpiCard label="Nominativi" value={String(data.contacts.length)} trend="archivio locale" Icon={UsersRound} />
        <KpiCard label="Appuntamenti" value={String(openAppointments)} trend="oggi" Icon={CalendarDays} />
      </div>

      <Panel className="span-5" title="Da chiamare ora" action="Priorita">
        <div className="call-queue">
          {fallbackQueue.map((contact, index) => (
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
          ))}
        </div>
      </Panel>

      <Panel className="span-4" title="Appunto veloce">
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

      <Panel className="span-3" title="Agenda di oggi">
        <div className="compact-list">
          {data.activities.filter((item) => item.day === "Oggi").slice(0, 5).map((item) => (
            <div key={item.id}>
              <span>{item.time}</span>
              <strong>{item.title}</strong>
              <small>{item.type}</small>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="span-8" title="Nominativi caldi">
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

      <Panel className="span-4" title="Metodo di lavoro">
        <Checklist
          items={["Chiama i ricontatti urgenti", "Aggiorna la scheda nominativo", "Crea richiesta se c'e interesse", "Pianifica prossimo contatto"]}
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
          {data.activityLog.slice(0, 6).map((item) => (
            <div key={item}>
              <span>Log</span>
              <strong>{item}</strong>
              <small>Persistito in locale</small>
            </div>
          ))}
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
        items={["Nuovo immobile -> proprietario -> scheda", "Scheda -> richieste compatibili", "Scheda -> portali, cartelli, contratti"]}
      />
      {searchMode ? (
        <Panel className="span-5" title={pageKey === "immobili-ricerca-op" ? "Ricerca proprietario" : "Ricerca cliente"}>
          <QuickForm
            button="Cerca"
            fields={pageKey === "immobili-ricerca-op" ? ["Proprietario", "Zona", "Tipo incarico"] : ["Cliente", "Budget", "Caratteristiche"]}
            onSubmit={(values) =>
              onAction(`Ricerca immobili eseguita per ${Object.values(values).filter(Boolean).join(" / ") || "tutti i dati"}.`)
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
      <Panel className="span-4" title={newMode ? "Nuovo immobile" : "Azioni scheda"}>
        <QuickForm
          button={newMode ? "Crea scheda" : "Salva filtro"}
          fields={newMode ? ["Titolo immobile", "Zona", "Prezzo richiesto", "Proprietario"] : ["Codice o titolo", "Zona", "Stato"]}
          onSubmit={(values) => {
            if (!newMode) {
              onAction(`Filtro immobili salvato: ${Object.values(values).filter(Boolean).join(" / ")}.`);
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
      <Panel className="span-4" title={pageKey === "richieste-nuova" ? "Nuova richiesta" : "Filtro richieste"}>
        <QuickForm
          button={pageKey === "richieste-nuova" ? "Salva richiesta" : "Applica filtro"}
          fields={["Cliente", "Budget", "Zone preferite", "Tipologia"]}
          onSubmit={(values) => {
            if (pageKey !== "richieste-nuova") {
              onAction(`Filtro richieste applicato: ${Object.values(values).filter(Boolean).join(" / ")}.`);
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
        module="Nominativi"
        page={labelForPage("nominativi", pageKey)}
        path={pathForPage(pageKey)}
        items={["Nominativo -> richieste", "Nominativo -> attivita", "Nominativo -> immobili proprietario"]}
      />
      {pageKey === "nominativi-richieste" ? (
        <RequestsView pageKey="richieste-elenco" query={query} data={data} onCommit={onCommit} onAction={onAction} />
      ) : (
        <>
      <Panel className="span-8" title="Anagrafiche nominativi" action="Segmenti">
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
      <Panel className="span-4" title={pageKey === "nominativi-nuovo" ? "Nuovo nominativo" : "Filtro nominativi"}>
        <QuickForm
          button={pageKey === "nominativi-nuovo" ? "Aggiungi contatto" : "Filtra"}
          fields={["Nome", "Tipo richiesta", "Provenienza", "Telefono"]}
          onSubmit={(values) => {
            if (pageKey !== "nominativi-nuovo") {
              onAction(`Filtro nominativi applicato: ${Object.values(values).filter(Boolean).join(" / ")}.`);
              return;
            }
            const newContact: ContactRecord = {
              id: makeId("contact"),
              name: fieldValue(values, "Nome", "Nuovo nominativo"),
              type: fieldValue(values, "Tipo richiesta", "Da qualificare"),
              status: "Nuovo nominativo",
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
              onAction("Nessun nominativo disponibile per la telefonata.");
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
          }), "Consensi privacy verificati sul nominativo selezionato.")} />
        </div>
      </Panel>
        </>
      )}
    </div>
  );
}

function AgendaView({
  pageKey,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Attivita"
        page={labelForPage("agenda", pageKey)}
        path={pathForPage(pageKey)}
        items={["Attivita -> nominativo", "Attivita -> immobile", "Agenda -> storico e promemoria"]}
      />
      <Panel className="span-8" title={pageKey === "agenda-storico" ? "Ricerca storico attivita" : "Agenda operativa"} action="Oggi">
        {pageKey === "agenda-storico" ? (
          <DataTable
            columns={["Ora", "Titolo", "Tipo", "Contatto", "Stato"]}
            rows={data.activities.map((item) => [
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
                  const activity = data.activities[rowIndex];
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
          <div className="agenda-board">
            {(["Oggi", "Domani", "Settimana"] as ActivityRecord["day"][]).map((column) => (
              <div key={column}>
                <h3>{column}</h3>
                {data.activities.filter((item) => item.day === column).slice(0, 6).map((item) => (
                  <article key={`${column}-${item.id}`}>
                    <span>{item.time}</span>
                    <strong>{item.title}</strong>
                    <small>{item.owner} - {item.type} - {item.status}</small>
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel className="span-4" title={pageKey === "attivita-nuova" ? "Nuova attivita" : "Filtro agenda"}>
        <QuickForm
          button={pageKey === "attivita-nuova" ? "Pianifica" : "Cerca"}
          fields={["Cliente", "Data e ora", "Luogo", "Immobile"]}
          onSubmit={(values) => {
            if (pageKey !== "attivita-nuova") {
              onAction(`Ricerca agenda eseguita: ${Object.values(values).filter(Boolean).join(" / ")}.`);
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
          {data.marketingChannels.map((channel) => (
            <div key={channel.name}>
              <span>
                <strong>{channel.name}</strong>
                <small>{channel.status} - {channel.updatedAt}</small>
              </span>
              <i>
                <b style={{ width: `${channel.progress}%` }} />
              </i>
            </div>
          ))}
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
                note: `${currentData.contacts.length} nominativi analizzati.`,
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
  data,
  onCommit,
}: {
  pageKey: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const leadContacts = data.contacts.filter((contact) =>
    /portale|sito|campagna/i.test(contact.source) || /lead pubblicitario/i.test(contact.status),
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
          rows={leadContacts.map((contact) => [
            contact.name,
            contact.note || contact.type,
            contact.status,
            contact.source,
          ])}
          actions={[
            {
              label: "Converti",
              onClick: (rowIndex) => {
                const contact = leadContacts[rowIndex];
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
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const censusContacts = data.contacts.filter((contact) => contact.source === "Censimento");

  return (
    <div className="workspace-grid">
      <RouteSummary
        module="Censimento"
        page={labelForPage("censimento", pageKey)}
        path={pathForPage(pageKey)}
        items={["Zona -> complessi", "Complesso -> contatti", "Contatto -> ricontatto e nominativo"]}
      />
      <Panel
        className="span-8"
        title={pageKey === "censimento-complessi" ? "Complessi censimento" : pageKey === "censimento-contatti" ? "Contatti censiti" : "Zone censimento"}
        action="Mappa"
        onPanelAction={() => onAction(`${data.censusAreas.length} zone censimento pronte per la mappa operativa.`)}
      >
        <DataTable
          columns={pageKey === "censimento-contatti" ? ["Nome", "Zona", "Stato", "Ricontatto"] : ["Zona", "Stabili", "Contatti", "Priorita"]}
          rows={(pageKey === "censimento-contatti"
            ? censusContacts.map((item) => [item.name, item.note || item.source, item.status, item.nextStep])
            : data.censusAreas.map((area) => [
            area.zone,
            String(area.buildings),
            String(area.contacts),
            area.priority,
          ]))}
          actions={[
            {
              label: "Ricontatto",
              onClick: (rowIndex) => {
                if (pageKey === "censimento-contatti") {
                  const contact = censusContacts[rowIndex];
                  if (!contact) {
                    return;
                  }
                  onCommit(
                    (currentData) => ({
                      ...currentData,
                      contacts: currentData.contacts.map((item) =>
                        item.id === contact.id
                          ? { ...item, status: "Ricontatto fissato", nextStep: "Domani", updatedAt: nowLabel() }
                          : item,
                      ),
                      activities: [
                        createActivity({
                          title: `Ricontatto censimento ${contact.name}`,
                          type: "Censimento",
                          contact: contact.name,
                          note: contact.note,
                          day: "Domani",
                        }),
                        ...currentData.activities,
                      ],
                    }),
                    `Ricontatto fissato per ${contact.name}.`,
                  );
                  return;
                }
                const area = data.censusAreas[rowIndex];
                if (area) {
                  onAction(`Zona ${area.zone} selezionata: ${area.contacts} contatti censiti.`);
                }
              },
            },
          ]}
        />
      </Panel>
      <Panel className="span-4" title={pageKey === "censimento-zona-nuova" ? "Nuova zona" : pageKey === "censimento-complessi" ? "Nuovo complesso" : "Nuovo contatto censimento"}>
        <QuickForm
          button="Salva censimento"
          fields={pageKey === "censimento-zona-nuova" ? ["Nome zona", "Comune", "Priorita"] : ["Zona", "Stabile", "Nota ricontatto"]}
          onSubmit={(values) => {
            if (pageKey === "censimento-zona-nuova") {
              const zone = fieldValue(values, "Nome zona", "Nuova zona");
              const newArea: CensusAreaRecord = {
                id: makeId("area"),
                zone,
                buildings: 0,
                contacts: 0,
                priority: fieldValue(values, "Priorita", "Normale"),
                updatedAt: nowLabel(),
              };
              onCommit(
                (currentData) => ({
                  ...currentData,
                  censusAreas: [newArea, ...currentData.censusAreas],
                }),
                `Zona censimento ${zone} creata.`,
              );
              return;
            }
            const zone = fieldValue(values, "Zona", "Zona da definire");
            const stable = fieldValue(values, "Stabile", "Stabile da censire");
            const newContact: ContactRecord = {
              id: makeId("contact"),
              name: `${stable} - contatto`,
              type: "Censimento",
              status: "Da ricontattare",
              source: "Censimento",
              owner: "Daniele",
              phone: "",
              note: zone,
              nextStep: fieldValue(values, "Nota ricontatto", "Ricontatto"),
              updatedAt: nowLabel(),
            };
            onCommit(
              (currentData) => ({
                ...currentData,
                contacts: [newContact, ...currentData.contacts],
                censusAreas: currentData.censusAreas.map((area) =>
                  area.zone.toLowerCase() === zone.toLowerCase()
                    ? {
                        ...area,
                        contacts: area.contacts + 1,
                        buildings: pageKey === "censimento-complessi" ? area.buildings + 1 : area.buildings,
                        updatedAt: nowLabel(),
                      }
                    : area,
                ),
                activities: [
                  createActivity({
                    title: `Censimento ${stable}`,
                    type: "Censimento",
                    contact: newContact.name,
                    note: `${zone} - ${newContact.nextStep}`,
                  }),
                  ...currentData.activities,
                ],
              }),
              `Contatto censimento salvato per ${zone}.`,
            );
          }}
        />
      </Panel>
      <Panel className="span-12" title="Ricontatti territoriali">
        <div className="map-strip">
          {data.censusAreas.map((area) => (
            <button
              key={area.zone}
              type="button"
              onClick={() => onAction(`Zona ${area.zone} filtrata.`)}
            >
              <MapPinned size={18} />
              <strong>{area.zone}</strong>
              <span>{area.contacts} contatti</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function GoalsView({ data, onCommit }: { data: CrmData; onCommit: CrmCommit }) {
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
          {data.goals.map((goal) => (
            <ProgressLine
              current={goal.current}
              key={goal.label}
              label={goal.label}
              target={goal.target}
            />
          ))}
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
        <div className="pipeline">
          {data.goals.slice(0, 4).map((goal) => (
            <div key={goal.id}>
              <span>{goal.label}</span>
              <strong>{goal.current}</strong>
              <small>{goal.owner} / target {goal.target}</small>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function UtilitiesView({
  pageKey,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
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
          }, "Pulizia duplicati completata sui nominativi.")} />
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
          {data.activityLog.slice(0, 10).map((item) => (
            <div key={item}>
              <span>Operazione</span>
              <strong>{item}</strong>
              <small>Archivio locale Fenix Suite</small>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SettingsView({ pageKey, onCommit }: { pageKey: string; onCommit: CrmCommit }) {
  const settingLabel = labelForPage("impostazioni", pageKey);
  const settingRows = [
    [settingLabel, "Attivo", "Globale", "Modificabile"],
    [`${settingLabel} vendita`, "Attivo", "Vendite", "Modificabile"],
    [`${settingLabel} locazione`, "In verifica", "Affitti", "Bloccato"],
  ];

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
        <DataTable columns={["Voce", "Stato", "Ambito", "Permesso"]} rows={settingRows} />
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
              <td colSpan={columns.length + (actions.length ? 1 : 0)}>Nessun risultato per la ricerca corrente.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function QuickForm({
  fields,
  button,
  onSubmit,
}: {
  fields: string[];
  button: string;
  onSubmit: (values: Record<string, string>) => void;
}) {
  return (
    <form
      className="quick-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const values = fields.reduce<Record<string, string>>((accumulator, field) => {
          accumulator[field] = String(formData.get(field) || "").trim();
          return accumulator;
        }, {});
        onSubmit(values);
        event.currentTarget.reset();
      }}
    >
      {fields.map((field) => (
        <label key={field}>
          {field}
          <input name={field} required placeholder={field} />
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
    "censimento-contatto-nuovo": "/censimento/nominativi/create",
    "censimento-contatti": "/censimento/nominativi",
    "censimento-zone": "/censimento/zone",
    "censimento-zona-nuova": "/censimento/zone/create",
    "censimento-complessi": "/censimento/complessi",
    "obiettivi-elenco": "/obiettivi",
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
