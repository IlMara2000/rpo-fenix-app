import type { CrmSnapshot, PwsPriority, PwsTask, SessionUser } from "./domain";

const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();
const isoToday = () => new Date().toISOString().slice(0, 10);

function belongsToUser(record: Record<string, unknown>, user: SessionUser) {
  const owner = norm(record.owner || record.responsibleAgent || record.assignedAgent || (record.details as Record<string, unknown> | undefined)?.referenceAgent);
  if (!owner) return true;
  const tokens = [user.name, user.email, user.email.split("@")[0], user.name.split(" ")[0]].map(norm);
  return tokens.some((token) => token && (owner === token || owner.includes(token)));
}

function dateValue(record: Record<string, unknown>, keys: string[]) {
  const details = (record.details || {}) as Record<string, unknown>;
  for (const key of keys) {
    const value = String(record[key] || details[key] || "");
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  }
  return "";
}

function priorityFor(date: string, status = ""): PwsPriority {
  if (date && date < isoToday()) return "alta";
  if (/urgente|alta|scadut/i.test(status)) return "alta";
  return date === isoToday() ? "alta" : "media";
}

export function buildGpsSuggestions(data: CrmSnapshot, user: SessionUser, date: string): PwsTask[] {
  const now = new Date().toISOString();
  const suggestions: PwsTask[] = [];
  const push = (record: Record<string, unknown>, sourceType: PwsTask["sourceType"], title: string, due: string, note: string) => {
    const sourceId = String(record.id || `${sourceType}-${title}`);
    if (due && due > date) return;
    suggestions.push({
      id: `gps-${sourceType}-${sourceId}-${date}`,
      source: "crm",
      sourceId,
      sourceType,
      title,
      note,
      date,
      startTime: String(record.time || (record.details as Record<string, unknown> | undefined)?.startTime || ""),
      duration: sourceType === "attivita" ? 45 : 30,
      priority: priorityFor(due, String(record.status || "")),
      status: "proposta",
      createdAt: now,
      updatedAt: now,
    });
  };

  data.activities.filter((item) => belongsToUser(item, user)).forEach((item) => {
    if (/complet|annull|rifiutat/i.test(norm(item.status))) return;
    const due = dateValue(item, ["startDate", "date"]);
    const bucket = norm(item.day);
    if (!due && !["oggi", "passate"].includes(bucket)) return;
    push(item, "attivita", String(item.title || item.type || "Attività CRM"), due || date, [item.contact, item.property, item.note].filter(Boolean).join(" · "));
  });

  data.contacts.filter((item) => belongsToUser(item, user)).forEach((item) => {
    const due = dateValue(item, ["nextContactDate"]);
    const nextStep = String(item.nextStep || (item.details as Record<string, unknown> | undefined)?.nextContactReason || "");
    if (!due || due > date || !nextStep) return;
    push(item, "contatto", `Ricontatta ${String(item.name || "nominativo")}`, due, nextStep);
  });

  data.properties.filter((item) => belongsToUser(item, user)).forEach((item) => {
    const due = dateValue(item, ["mandateExpiry", "mandateEndDate"]);
    if (!due || due > date) return;
    push(item, "immobile", `Verifica incarico ${String(item.code || item.title || "immobile")}`, due, "Scadenza incarico rilevata nella scheda immobile.");
  });

  return suggestions.sort((a, b) =>
    ({ alta: 0, media: 1, bassa: 2 }[a.priority] - { alta: 0, media: 1, bassa: 2 }[b.priority])
    || a.startTime.localeCompare(b.startTime),
  );
}

export function monthlyGoals(data: CrmSnapshot, user: SessionUser) {
  return data.goals.filter((goal) => belongsToUser(goal, user));
}
