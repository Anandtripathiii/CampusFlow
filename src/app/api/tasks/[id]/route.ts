import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { serverSupabase } from "@/lib/supabase";
import { TaskPatch } from "@/lib/zod";
import { deleteTaskEvent, upsertTaskEvent } from "@/lib/calendar";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (userId) => {
    const parsed = await parseBody(req, TaskPatch);
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const patch: Record<string, unknown> = { ...parsed, updated_at: new Date().toISOString() };
    if (parsed.completed === true) patch.completed_at = new Date().toISOString();
    if (parsed.completed === false) patch.completed_at = null;

    const { data, error } = await sb.from("tasks").update(patch).eq("id", id).eq("user_id", userId).select().single();
    if (error) return badRequest(error.message);

    if ("due_at" in parsed || "title" in parsed || "description" in parsed) {
      const eventId = await upsertTaskEvent(userId, { id: data.id, title: data.title, description: data.description, due_at: data.due_at, google_event_id: data.google_event_id });
      if (eventId && eventId !== data.google_event_id) {
        await sb.from("tasks").update({ google_event_id: eventId }).eq("id", data.id).eq("user_id", userId);
        data.google_event_id = eventId;
      }
    }
    return NextResponse.json({ task: data });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (userId) => {
    const sb = serverSupabase();
    const { data: existing } = await sb.from("tasks").select("google_event_id").eq("id", id).eq("user_id", userId).maybeSingle();
    const { error } = await sb.from("tasks").delete().eq("id", id).eq("user_id", userId);
    if (error) return badRequest(error.message);
    if (existing?.google_event_id) await deleteTaskEvent(userId, existing.google_event_id);
    return NextResponse.json({ ok: true });
  });
}
