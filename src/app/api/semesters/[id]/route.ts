import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { serverSupabase } from "@/lib/supabase";
import { SemesterInput } from "@/lib/zod";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (userId) => {
    const parsed = await parseBody(req, SemesterInput);
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const { data, error } = await sb.from("semesters").update({ name: parsed.name, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select().single();
    if (error) return badRequest(error.message);
    return NextResponse.json({ semester: data });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (userId) => {
    const sb = serverSupabase();
    // Cascade: schema has ON DELETE CASCADE from semesters → subjects → tasks.
    const { error } = await sb.from("semesters").delete().eq("id", id).eq("user_id", userId);
    if (error) return badRequest(error.message);
    await sb.from("user_profiles").update({ current_semester_id: null, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("current_semester_id", id);
    return NextResponse.json({ ok: true });
  });
}
