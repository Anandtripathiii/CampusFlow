"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = [
  { id: "student", title: "Student", copy: "Semesters, subjects, assignments, exams, class timetable." },
  { id: "teacher", title: "Teacher", copy: "Classes you teach, lecture plans, grading, meetings." },
  { id: "professional", title: "Working professional", copy: "Projects, deadlines, meetings, client work." },
] as const;

export default function Onboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function choose(role: (typeof ROLES)[number]["id"]) {
    setBusy(role);
    await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
    router.replace("/dashboard");
  }
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <p className="eyebrow">One quick thing</p>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>What best describes you?</h1>
        <p style={{ color: "var(--color-ink-soft)", margin: "0 0 1.5rem" }}>
          We shape your dashboard to match. You can change this later in settings.
        </p>
        <div className="roles">
          {ROLES.map((r) => (
            <button key={r.id} className="role-card" onClick={() => choose(r.id)} disabled={busy !== null}>
              <h3>{r.title}</h3>
              <p style={{ color: "var(--color-ink-soft)", margin: 0 }}>{r.copy}</p>
              {busy === r.id && <small style={{ color: "var(--color-ink-faint)" }}>Saving…</small>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
