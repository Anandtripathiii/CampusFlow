"use client";
import { useEffect, useRef, useState } from "react";

type Task = { id: string; title: string };

// Soft "ding" via WebAudio — no asset to ship.
function ding(muted: boolean) {
  if (muted || typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.9);
  } catch { /* ignore */ }
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PomodoroTimer({ workMin, breakMin, activeTask, tasks, onPickTask }: {
  workMin: number; breakMin: number; activeTask: Task | null; tasks: Task[];
  onPickTask: (t: Task | null) => void;
}) {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [remaining, setRemaining] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => { if (!running) setRemaining((mode === "work" ? workMin : breakMin) * 60); }, [workMin, breakMin, mode, running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          setRunning(false);
          ding(muted);
          const seconds = (mode === "work" ? workMin : breakMin) * 60;
          if (startRef.current) {
            void fetch("/api/timer", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({
                task_id: activeTask?.id ?? null,
                mode, started_at: new Date(startRef.current).toISOString(),
                ended_at: new Date().toISOString(), seconds,
              }),
            });
          }
          setMode((m) => (m === "work" ? "break" : "work"));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode, workMin, breakMin, muted, activeTask?.id]);

  function start() {
    startRef.current = Date.now();
    setRunning(true);
  }
  function stop() { setRunning(false); startRef.current = null; }
  function reset() { setRunning(false); startRef.current = null; setRemaining((mode === "work" ? workMin : breakMin) * 60); }

  return (
    <div className="timer">
      <small className="eyebrow" style={{ margin: 0 }}>{mode === "work" ? "Focus" : "Break"}</small>
      <div className="timer__face" aria-live="polite">{fmt(remaining)}</div>
      <select
        className="field__select"
        value={activeTask?.id ?? ""}
        onChange={(e) => onPickTask(tasks.find((t) => t.id === e.target.value) ?? null)}
        style={{ maxWidth: 320 }}
      >
        <option value="">Not linked to a task</option>
        {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <div className="timer__controls">
        {running
          ? <button className="button" onClick={stop}>Pause</button>
          : <button className="button button--primary" onClick={start}>Start</button>}
        <button className="button" onClick={reset}>Reset</button>
        <button className="button" onClick={() => setMuted((m) => !m)}>{muted ? "Unmute" : "Mute"}</button>
      </div>
    </div>
  );
}
