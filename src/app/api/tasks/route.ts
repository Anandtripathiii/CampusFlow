import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { serverSupabase } from "@/lib/supabase";
import { TaskInput } from "@/lib/zod";
import { upsertTaskEvent } from "@/lib/calendar";

export async function GET() {
  return withUser(async (userId) => {
    const sb = serverSupabase();
    const { data, error } = await sb.from("tasks").select("*").eq("user_id", userId).order("sort_order", { ascending: true }).order("due_at", { ascending: true, nullsFirst: false });
    if (error) return badRequest(error.message);
    return NextResponse.json({ tasks: data });
  });
}

export async function POST(req: Request) {
  return withUser(async (userId) => {
    const parsed = await parseBody(req, TaskInput);
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const insert = {
      user_id: userId,
      title: parsed.title,
      description: parsed.description ?? "",
      priority: parsed.priority ?? "medium",
      tag: parsed.tag ?? "",
      due_at: parsed.due_at ?? null,
      subject_id: parsed.subject_id ?? null,
      semester_id: parsed.semester_id ?? null,
      reminder_day_before: parsed.reminder_day_before ?? true,
      reminder_hour_before: parsed.reminder_hour_before ?? true,
      reminder_at_time: parsed.reminder_at_time ?? true,
    };
    const { data, error } = await sb.from("tasks").insert(insert).select().single();
    if (error) return badRequest(error.message);

    if (data.due_at) {
      const eventId = await upsertTaskEvent(userId, { id: data.id, title: data.title, description: data.description, due_at: data.due_at, google_event_id: null });
      if (eventId) await sb.from("tasks").update({ google_event_id: eventId }).eq("id", data.id).eq("user_id", userId);
      data.google_event_id = eventId;
    }
    return NextResponse.json({ task: data }, { status: 201 });
  });
}
