import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { serverSupabase } from "@/lib/supabase";
import { SubjectInput } from "@/lib/zod";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (userId) => {
    const parsed = await parseBody(req, SubjectInput.partial());
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const { data, error } = await sb.from("subjects").update({ ...parsed, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select().single();
    if (error) return badRequest(error.message);
    return NextResponse.json({ subject: data });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (userId) => {
    const sb = serverSupabase();
    const { error } = await sb.from("subjects").delete().eq("id", id).eq("user_id", userId);
    if (error) return badRequest(error.message);
    return NextResponse.json({ ok: true });
  });
}
