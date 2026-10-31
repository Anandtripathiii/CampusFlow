import { Resend } from "resend";

let client: Resend | null = null;
function get(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY missing");
    client = new Resend(key);
  }
  return client;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function sendReminder(to: string, task: { title: string; due_at: string | null }, kind: "day_before" | "hour_before" | "at_time") {
  const headline = kind === "at_time" ? "Due now" : kind === "hour_before" ? "Due in 1 hour" : "Due tomorrow";
  const when = task.due_at ? new Date(task.due_at).toLocaleString() : "soon";
  const title = escape(task.title);
  const html = `
    <div style="font-family: 'DM Sans', Segoe UI, sans-serif; color:#202039; background:#f6f7fb; padding:24px;">
      <div style="max-width:520px; margin:0 auto; background:#fff; border:1px solid #e7e7f0; border-radius:16px; padding:24px;">
        <p style="margin:0 0 8px; color:#686982; font-size:12px; text-transform:uppercase; letter-spacing:.08em;">CampusFlow · ${headline}</p>
        <h1 style="font-family:'Space Grotesk', sans-serif; font-size:22px; margin:0 0 8px;">${title}</h1>
        <p style="margin:0; color:#686982;">Due ${escape(when)}</p>
      </div>
    </div>`;
  return get().emails.send({
    from: process.env.EMAIL_FROM || "CampusFlow <reminders@example.com>",
    to,
    subject: `${headline}: ${task.title}`,
    html,
  });
}
