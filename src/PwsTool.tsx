import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Plus, RefreshCcw, Target, UserRound } from "lucide-react";
import type { DailyPlan, PwsPriority, PwsStatus, PwsTask } from "./pws/domain";
import { buildGpsSuggestions, monthlyGoals } from "./pws/gps";
import { loadCrmSnapshot, loadPlan, loadSession, savePlan, updateCrmActivity } from "./pws/storage";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const statusLabels: Record<PwsStatus, string> = {
  proposta: "Proposta", pianificata: "Pianificata", in_corso: "In corso",
  completata: "Completata", rinviata: "Rinviata", rifiutata: "Rifiutata",
};

export function PwsTool({ onNavigate }: { onNavigate: (path: string) => void }) {
  const session = useMemo(loadSession, []);
  const [date, setDate] = useState(today);
  const [plan, setPlan] = useState<DailyPlan | null>(() => session ? loadPlan(session.id, today()) : null);
  const [notice, setNotice] = useState("");
  const crm = useMemo(loadCrmSnapshot, [date, notice]);
  const suggestions = useMemo(() => session ? buildGpsSuggestions(crm, session, date) : [], [crm, date, session]);
  const goals = useMemo(() => session ? monthlyGoals(crm, session) : [], [crm, session]);

  useEffect(() => { document.title = "Fenix Group | PWS"; }, []);
  useEffect(() => { if (session) setPlan(loadPlan(session.id, date)); }, [date, session]);
  useEffect(() => { if (plan) savePlan(plan); }, [plan]);

  if (!session || !plan) {
    return <main className="pws-shell"><section className="pws-auth"><UserRound size={36}/><h1>PWS personale</h1><p>Accedi prima al CRM: il PWS usa lo stesso account autenticato.</p><button onClick={() => onNavigate("/crm")}>Vai all'accesso CRM</button></section></main>;
  }

  const existingSourceIds = new Set(plan.tasks.map((task) => task.sourceId).filter(Boolean));
  const available = suggestions.filter((task) => !existingSourceIds.has(task.sourceId));
  const occupied = plan.tasks.filter((task) => task.startTime && !["rifiutata", "rinviata"].includes(task.status));
  const overlaps = new Set<string>();
  occupied.forEach((task, index) => occupied.slice(index + 1).forEach((other) => {
    const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    if (minutes(task.startTime) < minutes(other.startTime) + other.duration && minutes(other.startTime) < minutes(task.startTime) + task.duration) {
      overlaps.add(task.id); overlaps.add(other.id);
    }
  }));

  const updateTask = (id: string, patch: Partial<PwsTask>) => setPlan((current) => current && ({
    ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task),
  }));
  const accept = (task: PwsTask) => setPlan((current) => current && ({ ...current, tasks: [...current.tasks, { ...task, status: "pianificata" }] }));
  const reject = (task: PwsTask) => setPlan((current) => current && ({
    ...current,
    tasks: [...current.tasks, { ...task, status: "rifiutata", updatedAt: new Date().toISOString() }],
  }));
  const addManual = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const now = new Date().toISOString();
    const task: PwsTask = { id: crypto.randomUUID(), source: "manuale", title, note: String(form.get("note") || ""), date, startTime: String(form.get("time") || ""), duration: Number(form.get("duration")) || 30, priority: String(form.get("priority")) as PwsPriority, status: "pianificata", createdAt: now, updatedAt: now };
    setPlan((current) => current && ({ ...current, tasks: [...current.tasks, task] }));
    event.currentTarget.reset();
  };
  const completed = plan.tasks.filter((task) => task.status === "completata").length;
  const planned = plan.tasks.filter((task) => task.status !== "rifiutata").length;

  return <main className="pws-shell">
    <header className="pws-header"><button onClick={() => onNavigate("/crm")}><ArrowLeft size={17}/>CRM</button><img src="/logo.png" alt="Fenix Group"/><span><UserRound size={16}/>{session.name}</span></header>
    <section className="pws-hero"><div><span>Personal Work Schedule</span><h1>La tua giornata, concreta.</h1></div><label><CalendarDays size={18}/><input type="date" value={date} onChange={(e) => setDate(e.target.value)}/></label></section>
    <section className="pws-summary">
      <label><Target size={18}/><span>Focus principale</span><input value={plan.focus} onChange={(e) => setPlan({ ...plan, focus: e.target.value })} placeholder="Il risultato più importante di oggi"/></label>
      <article><strong>{planned}</strong><span>Pianificate</span></article><article><strong>{completed}</strong><span>Completate</span></article><article><strong>{overlaps.size}</strong><span>Sovrapposizioni</span></article>
    </section>
    <section className="pws-grid">
      <aside className="pws-panel"><div className="pws-title"><RefreshCcw size={19}/><div><span>GPS lavorativo CRM</span><h2>Attività essenziali</h2></div></div>
        {available.length ? available.map((task) => <article className="pws-suggestion" key={task.id}><span className={`priority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3><p>{task.note || "Nessuna nota disponibile."}</p><div className="pws-suggestion-actions"><button onClick={() => accept(task)}>Accetta</button><button className="secondary" onClick={() => reject(task)}>Rifiuta</button></div></article>) : <p className="pws-empty">Nessuna nuova attività rilevata nei dati CRM per questa data.</p>}
        <p className="pws-warning">I log /telefonista sono locali e privi di accountId: non vengono attribuiti automaticamente per evitare collegamenti inventati.</p>
        <div className="pws-goals"><h3>Obiettivi mensili</h3>{goals.length ? goals.map((goal) => <div key={String(goal.id)}><span>{String(goal.label)}</span><b>{String(goal.current || 0)}/{String(goal.target || 0)}</b></div>) : <p>Nessun obiettivo mensile registrato.</p>}</div>
      </aside>
      <section className="pws-panel pws-day"><div className="pws-title"><Clock3 size={19}/><div><span>Timeline personale</span><h2>Piano del giorno</h2></div></div>
        <div className="pws-task-list">{plan.tasks.length ? [...plan.tasks].sort((a,b) => a.startTime.localeCompare(b.startTime)).map((task) => <article className={`pws-task ${task.source} ${overlaps.has(task.id) ? "overlap" : ""}`} key={task.id}>
          <div className="pws-task-source">{task.source === "crm" ? "GPS CRM" : "Manuale"}{overlaps.has(task.id) ? " · Sovrapposta" : ""}</div>
          <input aria-label="Titolo attività" className="pws-task-title" value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })}/>
          <div className="pws-task-controls"><input aria-label="Orario attività" type="time" value={task.startTime} onChange={(e) => updateTask(task.id, { startTime: e.target.value })}/><input aria-label="Durata in minuti" type="number" min="5" step="5" value={task.duration} onChange={(e) => updateTask(task.id, { duration: Number(e.target.value) })}/><select aria-label="Priorità attività" value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value as PwsPriority })}><option>alta</option><option>media</option><option>bassa</option></select><select aria-label="Stato attività" value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as PwsStatus })}>{Object.entries(statusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></div>
          <textarea aria-label="Note o esito attività" value={task.outcome ?? task.note} onChange={(e) => updateTask(task.id, { outcome: e.target.value })} placeholder="Note o esito"/>
          {task.source === "crm" && task.sourceType === "attivita" && task.sourceId ? <button className="sync" onClick={() => { updateCrmActivity(task.sourceId!, task.status === "completata" ? "Completata" : statusLabels[task.status], task.outcome || ""); setNotice(`sync-${Date.now()}`); }}>Riporta esito nel CRM</button> : null}
        </article>) : <p className="pws-empty">Il piano è vuoto. Accetta un suggerimento o aggiungi un’attività manuale.</p>}</div>
      </section>
      <aside className="pws-panel"><div className="pws-title"><Plus size={19}/><div><span>Conoscenza personale</span><h2>Aggiungi attività</h2></div></div>
        <form className="pws-form" onSubmit={addManual}><label>Attività<input name="title" required placeholder="Sopralluogo, documenti, riunione…"/></label><label>Orario<input name="time" type="time"/></label><label>Durata minuti<input name="duration" type="number" defaultValue="30" min="5" step="5"/></label><label>Priorità<select name="priority" defaultValue="media"><option>alta</option><option>media</option><option>bassa</option></select></label><label>Dettagli<textarea name="note"/></label><button><Plus size={16}/>Aggiungi</button></form>
        <form className="pws-form pws-daily-goals" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const goal = String(form.get("goal") || "").trim(); if (goal) setPlan({ ...plan, dailyGoals: [...plan.dailyGoals, goal] }); event.currentTarget.reset(); }}>
          <h3>Obiettivi giornalieri</h3>
          {plan.dailyGoals.map((goal, index) => <button className="pws-goal-chip" type="button" key={`${goal}-${index}`} onClick={() => setPlan({ ...plan, dailyGoals: plan.dailyGoals.filter((_, itemIndex) => itemIndex !== index) })}>{goal} ×</button>)}
          <label>Nuovo obiettivo<input name="goal" placeholder="Es. 5 ricontatti qualificati"/></label><button>Aggiungi obiettivo</button>
        </form>
        <div className="pws-review"><CheckCircle2 size={20}/><h3>Riepilogo giornata</h3><p>{completed} completate · {plan.tasks.filter(t => t.status === "rinviata").length} rinviate · {plan.tasks.filter(t => !["completata","rinviata","rifiutata"].includes(t.status)).length} aperte</p></div>
      </aside>
    </section>
  </main>;
}
