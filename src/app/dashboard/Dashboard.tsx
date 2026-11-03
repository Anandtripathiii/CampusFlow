"use client";
import { useEffect, useMemo, useState } from "react";
import PomodoroTimer from "@/components/PomodoroTimer";

type Priority = "low" | "medium" | "high";
type Task = {
  id: string; title: string; description: string; priority: Priority; tag: string;
  due_at: string | null; completed: boolean; completed_at: string | null;
  subject_id: string | null; semester_id: string | null; sort_order: number;
  reminder_day_before: boolean; reminder_hour_before: boolean; reminder_at_time: boolean;
  google_event_id: string | null;
};
type Subject = { id: string; name: string; color: string; semester_id: string | null };
type Semester = { id: string; name: string };
type Profile = {
  role: string; display_name: string; theme: string;
  pomodoro_work_minutes: number; pomodoro_break_minutes: number;
  reminder_default_day_before: boolean; reminder_default_hour_before: boolean; reminder_default_at_time: boolean;
  current_semester_id: string | null; google_calendar_enabled: boolean;
};
type View = "today" | "upcoming" | "all" | "bySemester";

type RoleCopy = {
  eyebrow: string;
  taskWord: string;
  taskWordPlural: string;
  addTaskLabel: string;
  tasksSectionTitle: string;
  statLabels: { total: string; today: string; done: string; overdue: string };
  secondarySectionTitle: string;
  secondaryEmpty: string;
  secondaryAddLabel: string;
};

const ROLE_COPY: Record<"student" | "teacher" | "professional" | "default", RoleCopy> = {
  student: {
    eyebrow: "Current semester",
    taskWord: "assignment", taskWordPlural: "Assignments",
    addTaskLabel: "+ Add assignment",
    tasksSectionTitle: "Assignments",
    statLabels: { total: "Total", today: "Due today", done: "Completed", overdue: "Overdue" },
    secondarySectionTitle: "Subjects",
    secondaryEmpty: "Add your first subject to organize assignments by course.",
    secondaryAddLabel: "+ Add subject",
  },
  teacher: {
    eyebrow: "Today's classes",
    taskWord: "task", taskWordPlural: "Pending work",
    addTaskLabel: "+ Add class task",
    tasksSectionTitle: "To grade & plan",
    statLabels: { total: "Items", today: "Due today", done: "Done", overdue: "Overdue" },
    secondarySectionTitle: "Classes & subjects",
    secondaryEmpty: "Add the classes you teach to see them grouped here.",
    secondaryAddLabel: "+ Add class",
  },
  professional: {
    eyebrow: "Today's priorities",
    taskWord: "task", taskWordPlural: "Tasks",
    addTaskLabel: "+ Add task",
    tasksSectionTitle: "Tasks",
    statLabels: { total: "Total", today: "Due today", done: "Completed", overdue: "Overdue" },
    secondarySectionTitle: "Projects",
    secondaryEmpty: "Add a project to group related work and deadlines.",
    secondaryAddLabel: "+ Add project",
  },
  default: {
    eyebrow: "Current term",
    taskWord: "task", taskWordPlural: "Tasks",
    addTaskLabel: "+ Add task",
    tasksSectionTitle: "Tasks",
    statLabels: { total: "Total tasks", today: "Due today", done: "Completed", overdue: "Overdue" },
    secondarySectionTitle: "Subjects",
    secondaryEmpty: "Create a subject to organize your task queue.",
    secondaryAddLabel: "+ Add subject",
  },
};

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function fmtDue(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard({ initial }: {
  initial: { profile: Profile; semesters: Semester[]; subjects: Subject[]; tasks: Task[]; userName: string };
}) {
  const [profile, setProfile] = useState<Profile>(initial.profile);
  const copy = ROLE_COPY[(initial.profile.role as keyof typeof ROLE_COPY)] ?? ROLE_COPY.default;
  const [semesters, setSemesters] = useState<Semester[]>(initial.semesters);
  const [subjects, setSubjects] = useState<Subject[]>(initial.subjects);
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [view, setView] = useState<View>("today");
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);
  const [manageSem, setManageSem] = useState(false);
  const [addingSem, setAddingSem] = useState(false);
  const [addingSubj, setAddingSubj] = useState(false);
  const [timerTask, setTimerTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; summary: string; start: string | null }>>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", profile.theme === "system" ? "" : profile.theme);
  }, [profile.theme]);

  useEffect(() => {
    if (!profile.google_calendar_enabled) return;
    j<{ events: typeof events }>("/api/calendar/sync").then((d) => setEvents(d.events)).catch(() => {});
  }, [profile.google_calendar_enabled]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfTomorrow = new Date(now); startOfTomorrow.setDate(now.getDate() + 1); startOfTomorrow.setHours(0, 0, 0, 0);
    const in7 = new Date(now); in7.setDate(now.getDate() + 7);
    const sem = profile.current_semester_id;
    const scoped = sem ? tasks.filter((t) => t.semester_id === sem || t.semester_id === null) : tasks;
    switch (view) {
      case "today": return scoped.filter((t) => t.due_at && new Date(t.due_at).toDateString() === now.toDateString());
      case "upcoming": return scoped.filter((t) => t.due_at && new Date(t.due_at) >= startOfTomorrow && new Date(t.due_at) <= in7);
      case "all": return scoped;
      case "bySemester": return scoped;
    }
  }, [tasks, view, profile.current_semester_id]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    const today = tasks.filter((t) => t.due_at && new Date(t.due_at).toDateString() === new Date().toDateString()).length;
    const overdue = tasks.filter((t) => !t.completed && t.due_at && new Date(t.due_at) < new Date()).length;
    return { total, done, today, overdue };
  }, [tasks]);

  async function toggle(t: Task) {
    const next = !t.completed;
    setTasks((xs) => xs.map((x) => x.id === t.id ? { ...x, completed: next } : x));
    try { await j(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ completed: next }) }); }
    catch { setTasks((xs) => xs.map((x) => x.id === t.id ? { ...x, completed: !next } : x)); flash("Could not save"); }
  }

  async function deleteTask(t: Task) {
    if (!confirm(`Delete “${t.title}”? This cannot be undone.`)) return;
    const prev = tasks;
    setTasks((xs) => xs.filter((x) => x.id !== t.id));
    try { await j(`/api/tasks/${t.id}`, { method: "DELETE" }); flash("Task deleted"); }
    catch { setTasks(prev); flash("Could not delete"); }
  }

  async function saveTask(values: Partial<Task>, id: string | null) {
    try {
      if (id) {
        const { task } = await j<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(values) });
        setTasks((xs) => xs.map((x) => x.id === id ? task : x));
        flash("Task updated");
      } else {
        const { task } = await j<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify(values) });
        setTasks((xs) => [...xs, task]);
        flash("Task added");
      }
      setEditing(null); setAdding(false);
    } catch { flash("Could not save"); }
  }

  async function dragReorder(from: number, to: number) {
    const next = [...filtered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const sort = next.map((t, i) => ({ ...t, sort_order: i }));
    setTasks((xs) => xs.map((x) => sort.find((s) => s.id === x.id) ?? x));
    try {
      await Promise.all(sort.map((t) => j(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ sort_order: t.sort_order }) })));
    } catch { flash("Reorder failed"); }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/dashboard"><span className="brand__mark">C</span>CampusFlow</a>

        <div className="card" style={{ padding: "0.9rem 1rem" }}>
          <p className="eyebrow">{copy.eyebrow}</p>
          <strong style={{ display: "block" }}>{semesters.find((s) => s.id === profile.current_semester_id)?.name ?? "No term set"}</strong>
          <small style={{ color: "var(--color-ink-soft)" }}>{stats.done} / {stats.total} done</small>
          <select
            className="field__select"
            style={{ marginTop: "0.6rem", width: "100%" }}
            value={profile.current_semester_id ?? ""}
            onChange={async (e) => {
              const value = e.target.value || null;
              setProfile((p) => ({ ...p, current_semester_id: value }));
              await j("/api/profile", { method: "PATCH", body: JSON.stringify({ current_semester_id: value }) });
            }}
          >
            <option value="">Select a term</option>
            {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button className="button" style={{ flex: 1, padding: "0.4rem", fontSize: "0.82rem" }} onClick={() => setAddingSem(true)}>+ Add</button>
            <button className="button" style={{ flex: 1, padding: "0.4rem", fontSize: "0.82rem" }} onClick={() => setManageSem(true)}>Manage</button>
          </div>
        </div>

        <nav className="nav">
          {([["today", "Today"], ["upcoming", "Upcoming"], ["all", "All tasks"], ["bySemester", "By semester"]] as const).map(([v, label]) => (
            <button key={v} className={`nav-item ${view === v ? "nav-item--active" : ""}`} onClick={() => setView(v)}>{label}</button>
          ))}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <a className="nav-item" href="/settings">Settings</a>
          <form action="/api/auth/signout" method="post">
            <button className="nav-item" type="submit" style={{ width: "100%", textAlign: "left" }}>Sign out</button>
          </form>
        </div>
      </aside>

      <main className="main">
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <p className="eyebrow">{greeting()}</p>
            <h1 style={{ fontSize: "1.8rem" }}>{profile.display_name || initial.userName}</h1>
          </div>
          <button className="button button--primary" onClick={() => setAdding(true)}>{copy.addTaskLabel}</button>
        </header>

        <section className="stats">
          <div className="stat"><div className="stat__label">{copy.statLabels.total}</div><div className="stat__value">{stats.total}</div></div>
          <div className="stat"><div className="stat__label">{copy.statLabels.today}</div><div className="stat__value">{stats.today}</div></div>
          <div className="stat"><div className="stat__label">{copy.statLabels.done}</div><div className="stat__value">{stats.done}</div></div>
          <div className="stat"><div className="stat__label">{copy.statLabels.overdue}</div><div className="stat__value">{stats.overdue}</div></div>
        </section>

        <section className="panel">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2>{view === "today" ? "Today" : view === "upcoming" ? "Next 7 days" : view === "bySemester" ? "By semester" : copy.tasksSectionTitle}</h2>
            <small style={{ color: "var(--color-ink-soft)" }}>{filtered.length} shown</small>
          </div>
          {view === "bySemester" ? (
            <SemesterGroups tasks={filtered} semesters={semesters} subjects={subjects} onToggle={toggle} onEdit={setEditing} onDelete={deleteTask} />
          ) : (
            <TaskList tasks={filtered} subjects={subjects} onToggle={toggle} onEdit={setEditing} onDelete={deleteTask} onReorder={dragReorder} />
          )}
          {filtered.length === 0 && (
            <div className="empty">
              <p style={{ marginBottom: "0.75rem" }}>No {copy.taskWord}s here yet.</p>
              <button className="button button--primary" onClick={() => setAdding(true)}>{copy.addTaskLabel}</button>
            </div>
          )}
        </section>

        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
            <h2>{copy.secondarySectionTitle}</h2>
            <button className="button" onClick={() => setAddingSubj(true)}>{copy.secondaryAddLabel}</button>
          </div>
          {subjects.length === 0 ? (
            <div className="empty"><p>{copy.secondaryEmpty}</p></div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
              {subjects.map((s) => (
                <li key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0.75rem", border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm)" }}>
                  <span><strong>{s.name}</strong>{s.semester_id && <small style={{ color: "var(--color-ink-soft)", marginLeft: "0.4rem" }}>· {semesters.find((x) => x.id === s.semester_id)?.name}</small>}</span>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${s.name}`}
                    onClick={async () => {
                      if (!confirm(`Delete “${s.name}”? Tasks keep going but lose this subject.`)) return;
                      await j(`/api/subjects/${s.id}`, { method: "DELETE" });
                      setSubjects((xs) => xs.filter((x) => x.id !== s.id));
                      setTasks((xs) => xs.map((t) => t.subject_id === s.id ? { ...t, subject_id: null } : t));
                    }}
                  >×</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: "0.75rem" }}>Focus timer</h2>
          <PomodoroTimer
            workMin={profile.pomodoro_work_minutes}
            breakMin={profile.pomodoro_break_minutes}
            activeTask={timerTask}
            tasks={tasks.filter((t) => !t.completed)}
            onPickTask={(t) => setTimerTask(t ? tasks.find((x) => x.id === t.id) ?? null : null)}
          />
        </section>

        {profile.google_calendar_enabled && (
          <section className="panel">
            <h2 style={{ marginBottom: "0.75rem" }}>Calendar (next 5)</h2>
            {events.length === 0 ? <p style={{ color: "var(--color-ink-soft)" }}>No upcoming calendar events.</p> : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
                {events.map((e) => (
                  <li key={e.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{e.summary}</span>
                    <small style={{ color: "var(--color-ink-soft)" }}>{e.start ? new Date(e.start).toLocaleString() : ""}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {(adding || editing) && (
        <TaskForm
          task={editing}
          subjects={subjects}
          semesters={semesters}
          defaults={{
            reminder_day_before: profile.reminder_default_day_before,
            reminder_hour_before: profile.reminder_default_hour_before,
            reminder_at_time: profile.reminder_default_at_time,
            semester_id: profile.current_semester_id,
          }}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSubmit={(v) => saveTask(v, editing?.id ?? null)}
        />
      )}

      {addingSem && (
        <SimpleForm
          title="Add semester"
          placeholder="e.g. B.Tech Semester 3"
          onCancel={() => setAddingSem(false)}
          onSubmit={async (name) => {
            const { semester } = await j<{ semester: Semester }>("/api/semesters", { method: "POST", body: JSON.stringify({ name }) });
            setSemesters((xs) => [...xs, semester]);
            setProfile((p) => ({ ...p, current_semester_id: semester.id }));
            await j("/api/profile", { method: "PATCH", body: JSON.stringify({ current_semester_id: semester.id }) });
            setAddingSem(false); flash(`Term “${name}” added`);
          }}
        />
      )}

      {addingSubj && (
        <SubjectForm
          semesters={semesters}
          defaultSemester={profile.current_semester_id}
          onCancel={() => setAddingSubj(false)}
          onSubmit={async (v) => {
            const { subject } = await j<{ subject: Subject }>("/api/subjects", { method: "POST", body: JSON.stringify(v) });
            setSubjects((xs) => [...xs, subject]);
            setAddingSubj(false); flash("Subject added");
          }}
        />
      )}

      {manageSem && (
        <div className="modal-backdrop" onClick={() => setManageSem(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Manage semesters</h2>
            {semesters.length === 0 ? (
              <p style={{ color: "var(--color-ink-soft)" }}>No semesters yet.</p>
            ) : (
              <ul className="semester-list">
                {semesters.map((s) => (
                  <li key={s.id} className={`semester-list__row ${s.id === profile.current_semester_id ? "semester-list__row--active" : ""}`}>
                    <span>{s.name}{s.id === profile.current_semester_id && <small style={{ marginLeft: "0.5rem", color: "var(--color-indigo-700)" }}>Current</small>}</span>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${s.name}`}
                      onClick={async () => {
                        if (!confirm("Delete this semester and everything inside it? This cannot be undone.")) return;
                        await j(`/api/semesters/${s.id}`, { method: "DELETE" });
                        setSemesters((xs) => xs.filter((x) => x.id !== s.id));
                        setSubjects((xs) => xs.filter((x) => x.semester_id !== s.id));
                        setTasks((xs) => xs.filter((t) => t.semester_id !== s.id));
                        if (profile.current_semester_id === s.id) setProfile((p) => ({ ...p, current_semester_id: null }));
                      }}
                    >🗑</button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="button" onClick={() => setManageSem(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TaskList({ tasks, subjects, onToggle, onEdit, onDelete, onReorder }: {
  tasks: Task[]; subjects: Subject[];
  onToggle: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (t: Task) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {tasks.map((t, i) => {
        const subject = subjects.find((s) => s.id === t.subject_id);
        return (
          <li
            key={t.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i); setDragIndex(null); }}
            className={`task-row ${t.completed ? "task-row--done" : ""}`}
          >
            <button className={`task-row__check ${t.completed ? "task-row__check--done" : ""}`} aria-pressed={t.completed} onClick={() => onToggle(t)}>
              {t.completed ? "✓" : ""}
            </button>
            <div className="task-row__body">
              <strong className="task-row__title">{t.title}</strong>
              <div className="task-row__meta">
                {subject?.name ?? "Unassigned"} · {fmtDue(t.due_at)}{t.tag ? ` · #${t.tag}` : ""}
              </div>
            </div>
            <span className={`priority-pill priority-pill--${t.priority}`}>{t.priority}</span>
            <button className="icon-button" aria-label="Edit" onClick={() => onEdit(t)}>✎</button>
            <button className="icon-button" aria-label="Delete" onClick={() => onDelete(t)}>×</button>
          </li>
        );
      })}
    </ul>
  );
}

function SemesterGroups(props: {
  tasks: Task[]; semesters: Semester[]; subjects: Subject[];
  onToggle: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (t: Task) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string | null, Task[]>();
    for (const t of props.tasks) {
      const k = t.semester_id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return map;
  }, [props.tasks]);
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {Array.from(groups.entries()).map(([semId, items]) => (
        <div key={semId ?? "none"}>
          <p className="eyebrow">{props.semesters.find((s) => s.id === semId)?.name ?? "Unassigned to term"}</p>
          <TaskList tasks={items} subjects={props.subjects} onToggle={props.onToggle} onEdit={props.onEdit} onDelete={props.onDelete} onReorder={() => {}} />
        </div>
      ))}
    </div>
  );
}

function TaskForm({ task, subjects, semesters, defaults, onCancel, onSubmit }: {
  task: Task | null; subjects: Subject[]; semesters: Semester[];
  defaults: { reminder_day_before: boolean; reminder_hour_before: boolean; reminder_at_time: boolean; semester_id: string | null };
  onCancel: () => void; onSubmit: (v: Partial<Task>) => void;
}) {
  const [v, setV] = useState<Partial<Task>>(task ?? {
    title: "", description: "", priority: "medium", tag: "",
    due_at: null, subject_id: null, semester_id: defaults.semester_id,
    reminder_day_before: defaults.reminder_day_before,
    reminder_hour_before: defaults.reminder_hour_before,
    reminder_at_time: defaults.reminder_at_time,
  });
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{task ? "Edit task" : "Add task"}</h2>
        <div className="field"><label className="field__label">Title</label>
          <input className="field__input" value={v.title ?? ""} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </div>
        <div className="field"><label className="field__label">Description</label>
          <textarea className="field__textarea" rows={2} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="field"><label className="field__label">Priority</label>
            <select className="field__select" value={v.priority ?? "medium"} onChange={(e) => setV({ ...v, priority: e.target.value as Priority })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <div className="field"><label className="field__label">Tag</label>
            <input className="field__input" value={v.tag ?? ""} onChange={(e) => setV({ ...v, tag: e.target.value })} />
          </div>
        </div>
        <div className="field"><label className="field__label">Due date &amp; time</label>
          <input className="field__input" type="datetime-local" value={v.due_at ? new Date(v.due_at).toISOString().slice(0, 16) : ""}
                 onChange={(e) => setV({ ...v, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="field"><label className="field__label">Semester</label>
            <select className="field__select" value={v.semester_id ?? ""} onChange={(e) => setV({ ...v, semester_id: e.target.value || null })}>
              <option value="">—</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field"><label className="field__label">Subject</label>
            <select className="field__select" value={v.subject_id ?? ""} onChange={(e) => setV({ ...v, subject_id: e.target.value || null })}>
              <option value="">Unassigned</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <fieldset style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm)", padding: "0.75rem", margin: "0.5rem 0 1rem" }}>
          <legend style={{ padding: "0 0.4rem", fontSize: "0.82rem", color: "var(--color-ink-soft)" }}>Email reminders</legend>
          {([["reminder_day_before", "1 day before"], ["reminder_hour_before", "1 hour before"], ["reminder_at_time", "At the time"]] as const).map(([k, label]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0" }}>
              <input type="checkbox" checked={Boolean(v[k])} onChange={(e) => setV({ ...v, [k]: e.target.checked })} />
              {label}
            </label>
          ))}
        </fieldset>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button className="button" onClick={onCancel}>Cancel</button>
          <button className="button button--primary" onClick={() => v.title && onSubmit(v)}>{task ? "Save" : "Add task"}</button>
        </div>
      </div>
    </div>
  );
}

function SimpleForm({ title, placeholder, onCancel, onSubmit }: { title: string; placeholder: string; onCancel: () => void; onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="field"><input className="field__input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} autoFocus /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button className="button" onClick={onCancel}>Cancel</button>
          <button className="button button--primary" onClick={() => v.trim() && onSubmit(v.trim())}>Save</button>
        </div>
      </div>
    </div>
  );
}

function SubjectForm({ semesters, defaultSemester, onCancel, onSubmit }: {
  semesters: Semester[]; defaultSemester: string | null; onCancel: () => void;
  onSubmit: (v: { name: string; color: string; semester_id: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("indigo");
  const [semester_id, setSem] = useState<string | null>(defaultSemester);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add subject</h2>
        <div className="field"><label className="field__label">Name</label>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="field"><label className="field__label">Color</label>
            <select className="field__select" value={color} onChange={(e) => setColor(e.target.value)}>
              {["indigo", "mint", "peach", "coral", "lavender", "blue", "yellow", "green", "pink", "teal"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label className="field__label">Semester</label>
            <select className="field__select" value={semester_id ?? ""} onChange={(e) => setSem(e.target.value || null)}>
              <option value="">—</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button className="button" onClick={onCancel}>Cancel</button>
          <button className="button button--primary" onClick={() => name.trim() && onSubmit({ name: name.trim(), color, semester_id })}>Add</button>
        </div>
      </div>
    </div>
  );
}
