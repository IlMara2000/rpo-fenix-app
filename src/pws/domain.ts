export type PwsSource = "crm" | "manuale";
export type PwsStatus = "proposta" | "pianificata" | "in_corso" | "completata" | "rinviata" | "rifiutata";
export type PwsPriority = "alta" | "media" | "bassa";

export type PwsTask = {
  id: string;
  source: PwsSource;
  sourceId?: string;
  sourceType?: "attivita" | "contatto" | "immobile";
  title: string;
  note: string;
  date: string;
  startTime: string;
  duration: number;
  priority: PwsPriority;
  status: PwsStatus;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyPlan = {
  userId: string;
  date: string;
  focus: string;
  dailyGoals: string[];
  tasks: PwsTask[];
  updatedAt: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type CrmSnapshot = {
  properties: Array<Record<string, unknown>>;
  requests: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  activityLog: string[];
};
