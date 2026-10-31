import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { serverSupabase } from "@/lib/supabase";
import { SubjectInput } from "@/lib/zod";

export async function GET() {
  return withUser(async (userId) => {
    const sb = serverSupabase();
    const { data, error } = await sb.from("subjects").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (error) return badRequest(error.message);
    return NextResponse.json({ subjects: data });
  });
}

export async function POST(req: Request) {
  return withUser(async (userId) => {
    const parsed = await parseBody(req, SubjectInput);
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const { data, error } = await sb.from("subjects").insert({ user_id: userId, name: parsed.name, color: parsed.color, semester_id: parsed.semester_id ?? null }).select().single();
    if (error) return badRequest(error.message);
    return NextResponse.json({ subject: data }, { status: 201 });
  });
}
