import type { CrmSnapshot, DailyPlan, SessionUser } from "./domain";

export const crmStorageKey = "fenix-suite-crm-data-v2";
export const sessionStorageKey = "fenix-suite-current-user-v1";
const pwsStorageKey = "fenix-suite-pws-v1";

function parse<T>(value: string | null, fallback: T): T {
  try {
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export function loadSession(): SessionUser | null {
  const session = parse<SessionUser | null>(localStorage.getItem(sessionStorageKey), null);
  return session?.id && session?.email ? session : null;
}

export function loadCrmSnapshot(): CrmSnapshot {
  const data = parse<Partial<CrmSnapshot>>(localStorage.getItem(crmStorageKey), {});
  return {
    properties: Array.isArray(data.properties) ? data.properties : [],
    requests: Array.isArray(data.requests) ? data.requests : [],
    contacts: Array.isArray(data.contacts) ? data.contacts : [],
    activities: Array.isArray(data.activities) ? data.activities : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
  };
}

export function loadPlans(): DailyPlan[] {
  const plans = parse<DailyPlan[]>(localStorage.getItem(pwsStorageKey), []);
  return Array.isArray(plans) ? plans : [];
}

export function loadPlan(userId: string, date: string): DailyPlan {
  return loadPlans().find((plan) => plan.userId === userId && plan.date === date) ?? {
    userId,
    date,
    focus: "",
    dailyGoals: [],
    tasks: [],
    updatedAt: new Date().toISOString(),
  };
}

export function savePlan(plan: DailyPlan) {
  const plans = loadPlans();
  const next = plans.filter((item) => !(item.userId === plan.userId && item.date === plan.date));
  localStorage.setItem(pwsStorageKey, JSON.stringify([{ ...plan, updatedAt: new Date().toISOString() }, ...next]));
}

export function updateCrmActivity(sourceId: string, status: string, outcome: string) {
  const data = loadCrmSnapshot();
  const now = new Date().toLocaleString("it-IT");
  data.activities = data.activities.map((activity) =>
    String(activity.id) === sourceId
      ? { ...activity, status, note: outcome || activity.note, updatedAt: now }
      : activity,
  );
  data.activityLog = [`${now} · Esito PWS sincronizzato: ${outcome || status}`, ...data.activityLog].slice(0, 80);
  localStorage.setItem(crmStorageKey, JSON.stringify(data));
}
