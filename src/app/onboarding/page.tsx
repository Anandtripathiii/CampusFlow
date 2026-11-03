"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "student" | "teacher" | "professional";

const ROLES: { id: Role; title: string; copy: string }[] = [
  { id: "student",      title: "Student",             copy: "Semesters, subjects, assignments, exams, class timetable." },
  { id: "teacher",      title: "Teacher",             copy: "Classes you teach, lecture plans, grading, meetings." },
  { id: "professional", title: "Working professional", copy: "Projects, deadlines, meetings, client work." },
];

const GOALS: Record<Role, string[]> = {
  student: ["Assignments", "Exam prep", "Attendance", "Projects", "Study planning", "Internships"],
  teacher: ["Class management", "Attendance", "Assignments", "Grading", "Announcements", "Performance"],
  professional: ["Project management", "Task tracking", "Meetings", "Deadlines", "Team workload", "Personal productivity"],
};

type Fields = {
  display_name: string;
  institution: string;
  course_or_department: string;
  current_year: string;
  company: string;
  job_title: string;
  team: string;
  goals: string[];
};

const EMPTY: Fields = {
  display_name: "", institution: "", course_or_department: "", current_year: "",
  company: "", job_title: "", team: "", goals: [],
};

export default function Onboarding() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [v, setV] = useState<Fields>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function pickRole(r: Role) { setRole(r); setStep(2); setErr(""); }

  function toggleGoal(g: string) {
    setV((p) => ({ ...p, goals: p.goals.includes(g) ? p.goals.filter((x) => x !== g) : [...p.goals, g] }));
  }

  function validStep2(): boolean {
    if (!v.display_name.trim()) return false;
    if (role === "student")      return !!(v.institution.trim() && v.course_or_department.trim());
    if (role === "teacher")      return !!(v.institution.trim() && v.course_or_department.trim());
    if (role === "professional") return !!(v.company.trim() && v.job_title.trim());
    return false;
  }

  async function submit() {
    if (!role) return;
    setBusy(true); setErr("");
    try {
      const payload = {
        role,
        onboarding_completed: true,
        display_name: v.display_name.trim(),
        institution: v.institution.trim(),
        course_or_department: v.course_or_department.trim(),
        current_year: v.current_year.trim(),
        company: v.company.trim(),
        job_title: v.job_title.trim(),
        team: v.team.trim(),
        goals: v.goals,
      };
      const r = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text());
      router.replace("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save, try again.");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <ProgressBar step={step} />
        {step === 1 && (
          <>
            <p className="eyebrow">Step 1 of 3</p>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>What best describes you?</h1>
            <p style={{ color: "var(--color-ink-soft)", margin: "0 0 1.5rem" }}>
              We shape your dashboard to match. You can change this later in settings.
            </p>
            <div className="roles">
              {ROLES.map((r) => (
                <button key={r.id} className="role-card" onClick={() => pickRole(r.id)} aria-label={r.title}>
                  <h3>{r.title}</h3>
                  <p style={{ color: "var(--color-ink-soft)", margin: 0 }}>{r.copy}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && role && (
          <>
            <p className="eyebrow">Step 2 of 3 · {ROLES.find((r) => r.id === role)!.title}</p>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>Tell us a little about you</h1>
            <div className="field">
              <label className="field__label" htmlFor="name">Your name</label>
              <input id="name" className="field__input" value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} autoFocus />
            </div>
            {role !== "professional" ? (
              <>
                <div className="field">
                  <label className="field__label" htmlFor="inst">Institution</label>
                  <input id="inst" className="field__input" value={v.institution} onChange={(e) => setV({ ...v, institution: e.target.value })} placeholder="e.g. IIT Delhi" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="course">{role === "student" ? "Course / branch" : "Department"}</label>
                  <input id="course" className="field__input" value={v.course_or_department} onChange={(e) => setV({ ...v, course_or_department: e.target.value })} placeholder={role === "student" ? "e.g. B.Tech CSE" : "e.g. Mathematics"} />
                </div>
                {role === "student" && (
                  <div className="field">
                    <label className="field__label" htmlFor="year">Current year (optional)</label>
                    <input id="year" className="field__input" value={v.current_year} onChange={(e) => setV({ ...v, current_year: e.target.value })} placeholder="e.g. 2nd year" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="field">
                  <label className="field__label" htmlFor="co">Company</label>
                  <input id="co" className="field__input" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="job">Job title</label>
                  <input id="job" className="field__input" value={v.job_title} onChange={(e) => setV({ ...v, job_title: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="team">Team (optional)</label>
                  <input id="team" className="field__input" value={v.team} onChange={(e) => setV({ ...v, team: e.target.value })} />
                </div>
              </>
            )}
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!validStep2()} />
          </>
        )}

        {step === 3 && role && (
          <>
            <p className="eyebrow">Step 3 of 3</p>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "0.3rem" }}>What do you want to track?</h1>
            <p style={{ color: "var(--color-ink-soft)", margin: "0 0 1rem" }}>Pick any that apply — we'll surface these first.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {GOALS[role].map((g) => {
                const on = v.goals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    aria-pressed={on}
                    className="button"
                    style={{
                      padding: "0.4rem 0.9rem",
                      borderRadius: "var(--radius-pill)",
                      background: on ? "var(--color-indigo-600)" : "transparent",
                      color: on ? "white" : "var(--color-ink)",
                      borderColor: on ? "var(--color-indigo-600)" : "var(--color-line)",
                    }}
                  >{g}</button>
                );
              })}
            </div>
            {err && <p role="alert" style={{ color: "var(--color-danger)", marginBottom: "0.75rem" }}>{err}</p>}
            <StepNav
              onBack={() => setStep(2)}
              onNext={submit}
              nextLabel={busy ? "Saving…" : "Finish"}
              nextDisabled={busy}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div aria-hidden="true" style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem" }}>
      {[1, 2, 3].map((n) => (
        <span key={n} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: n <= step ? "var(--color-indigo-600)" : "var(--color-line)",
        }} />
      ))}
    </div>
  );
}

function StepNav({ onBack, onNext, nextLabel = "Continue", nextDisabled = false }: {
  onBack: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
      <button className="button" onClick={onBack}>Back</button>
      <button className="button button--primary" onClick={onNext} disabled={nextDisabled}>{nextLabel}</button>
    </div>
  );
}
