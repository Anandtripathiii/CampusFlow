import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { serverSupabase } from "@/lib/supabase";
import { SemesterInput } from "@/lib/zod";

export async function GET() {
  return withUser(async (userId) => {
    const sb = serverSupabase();
    const { data, error } = await sb.from("semesters").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (error) return badRequest(error.message);
    return NextResponse.json({ semesters: data });
  });
}

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "semesters:post"), 30, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  return withUser(async (userId) => {
    const parsed = await parseBody(req, SemesterInput);
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const { data, error } = await sb.from("semesters").insert({ user_id: userId, name: parsed.name }).select().single();
    if (error) return badRequest(error.message);
    return NextResponse.json({ semester: data }, { status: 201 });
  });
}
