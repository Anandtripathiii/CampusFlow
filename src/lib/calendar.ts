import { google } from "googleapis";
import { serverSupabase } from "./supabase";

function oauth(refreshToken: string) {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  });
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

async function userRefreshToken(userId: string): Promise<string | null> {
  const sb = serverSupabase();
  const { data } = await sb.from("user_profiles").select("google_refresh_token, google_calendar_enabled").eq("user_id", userId).maybeSingle();
  if (!data?.google_calendar_enabled || !data.google_refresh_token) return null;
  return data.google_refresh_token;
}

type TaskEvent = { id: string; title: string; description?: string; due_at: string | null; google_event_id: string | null };

export async function upsertTaskEvent(userId: string, task: TaskEvent): Promise<string | null> {
  if (!task.due_at) return task.google_event_id;
  const refresh = await userRefreshToken(userId);
  if (!refresh) return task.google_event_id;
  const cal = google.calendar({ version: "v3", auth: oauth(refresh) });
  const start = new Date(task.due_at).toISOString();
  const end = new Date(new Date(task.due_at).getTime() + 30 * 60 * 1000).toISOString();
  const resource = { summary: task.title, description: task.description ?? "", start: { dateTime: start }, end: { dateTime: end } };
  try {
    if (task.google_event_id) {
      await cal.events.update({ calendarId: "primary", eventId: task.google_event_id, requestBody: resource });
      return task.google_event_id;
    }
    const res = await cal.events.insert({ calendarId: "primary", requestBody: resource });
    return res.data.id ?? null;
  } catch {
    return task.google_event_id;
  }
}

export async function deleteTaskEvent(userId: string, eventId: string | null) {
  if (!eventId) return;
  const refresh = await userRefreshToken(userId);
  if (!refresh) return;
  const cal = google.calendar({ version: "v3", auth: oauth(refresh) });
  try { await cal.events.delete({ calendarId: "primary", eventId }); } catch { /* ignore */ }
}

export async function upcomingEvents(userId: string, limit = 5) {
  const refresh = await userRefreshToken(userId);
  if (!refresh) return [];
  const cal = google.calendar({ version: "v3", auth: oauth(refresh) });
  try {
    const res = await cal.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: limit,
      singleEvents: true,
      orderBy: "startTime",
    });
    return (res.data.items ?? []).map((e) => ({ id: e.id!, summary: e.summary ?? "(no title)", start: e.start?.dateTime ?? e.start?.date ?? null }));
  } catch { return []; }
}
