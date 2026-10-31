"use client";
import { useState } from "react";

type Profile = {
  display_name: string; role: string; theme: string;
  pomodoro_work_minutes: number; pomodoro_break_minutes: number;
  reminder_default_day_before: boolean; reminder_default_hour_before: boolean; reminder_default_at_time: boolean;
  google_calendar_enabled: boolean;
};

export default function SettingsForm({ profile }: { profile: Profile | null }) {
  const [p, setP] = useState<Profile>(profile ?? {
    display_name: "", role: "", theme: "system",
    pomodoro_work_minutes: 25, pomodoro_break_minutes: 5,
    reminder_default_day_before: true, reminder_default_hour_before: true, reminder_default_at_time: true,
    google_calendar_enabled: false,
  });
  const [saved, setSaved] = useState("");

  async function save() {
    await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    setSaved("Saved"); setTimeout(() => setSaved(""), 1500);
  }

  return (
    <div className="panel">
      <div className="field"><label className="field__label">Display name</label>
        <input className="field__input" value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="field"><label className="field__label">Role</label>
          <select className="field__select" value={p.role} onChange={(e) => setP({ ...p, role: e.target.value })}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="professional">Professional</option>
          </select>
        </div>
        <div className="field"><label className="field__label">Theme</label>
          <select className="field__select" value={p.theme} onChange={(e) => setP({ ...p, theme: e.target.value })}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="field"><label className="field__label">Pomodoro — work (min)</label>
          <input type="number" min={1} max={180} className="field__input" value={p.pomodoro_work_minutes}
                 onChange={(e) => setP({ ...p, pomodoro_work_minutes: Number(e.target.value) })} />
        </div>
        <div className="field"><label className="field__label">Pomodoro — break (min)</label>
          <input type="number" min={1} max={60} className="field__input" value={p.pomodoro_break_minutes}
                 onChange={(e) => setP({ ...p, pomodoro_break_minutes: Number(e.target.value) })} />
        </div>
      </div>
      <fieldset style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm)", padding: "0.75rem", margin: "0.5rem 0 1rem" }}>
        <legend style={{ padding: "0 0.4rem", fontSize: "0.82rem", color: "var(--color-ink-soft)" }}>Default reminders for new tasks</legend>
        {([["reminder_default_day_before", "1 day before"], ["reminder_default_hour_before", "1 hour before"], ["reminder_default_at_time", "At the time"]] as const).map(([k, label]) => (
          <label key={k} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0" }}>
            <input type="checkbox" checked={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} /> {label}
          </label>
        ))}
      </fieldset>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <input type="checkbox" checked={p.google_calendar_enabled} onChange={(e) => setP({ ...p, google_calendar_enabled: e.target.checked })} />
        Create Google Calendar events for tasks with a due time
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", alignItems: "center" }}>
        {saved && <small style={{ color: "var(--color-ink-soft)" }}>{saved}</small>}
        <button className="button button--primary" onClick={save}>Save settings</button>
      </div>
    </div>
  );
}
