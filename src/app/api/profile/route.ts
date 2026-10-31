import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { serverSupabase } from "@/lib/supabase";
import { ProfilePatch } from "@/lib/zod";

export async function GET() {
  return withUser(async (userId) => {
    const sb = serverSupabase();
    const { data, error } = await sb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) return badRequest(error.message);
    return NextResponse.json({ profile: data });
  });
}

export async function PATCH(req: Request) {
  return withUser(async (userId) => {
    const parsed = await parseBody(req, ProfilePatch);
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const { data, error } = await sb.from("user_profiles").update({ ...parsed, updated_at: new Date().toISOString() }).eq("user_id", userId).select().single();
    if (error) return badRequest(error.message);
    return NextResponse.json({ profile: data });
  });
}
