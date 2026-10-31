import { NextResponse } from "next/server";
import { badRequest, parseBody, withUser } from "@/lib/api";
import { serverSupabase } from "@/lib/supabase";
import { TimerSessionInput } from "@/lib/zod";

export async function POST(req: Request) {
  return withUser(async (userId) => {
    const parsed = await parseBody(req, TimerSessionInput);
    if (parsed instanceof NextResponse) return parsed;
    const sb = serverSupabase();
    const { data, error } = await sb.from("timer_sessions").insert({ user_id: userId, ...parsed }).select().single();
    if (error) return badRequest(error.message);
    return NextResponse.json({ session: data }, { status: 201 });
  });
}
