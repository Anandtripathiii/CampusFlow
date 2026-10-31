import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// TEMPORARY — probes exactly what @auth/supabase-adapter does: a service-role
// client talking to the `next_auth` schema. If PostgREST isn't exposing that
// schema (Supabase default is public/storage/graphql_public only), we see
// the raw error here instead of guessing from NextAuth's AdapterError.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, where: "env", missing: { url: !url, key: !key } }, { status: 500 });
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  async function probe(label: string, fn: () => Promise<unknown>) {
    try {
      const result = await fn();
      return { label, ok: true, result };
    } catch (err) {
      const e = err as { message?: string; code?: string; details?: string; hint?: string; name?: string };
      return { label, ok: false, error: { name: e.name, message: e.message, code: e.code, details: e.details, hint: e.hint } };
    }
  }

  // 1) next_auth schema reachable via PostgREST?
  const nextAuthUsers = await probe("next_auth.users (via .schema())", async () => {
    const { data, error } = await sb.schema("next_auth" as never).from("users").select("id", { count: "exact", head: true });
    if (error) throw error;
    return { data };
  });

  // 2) public tables reachable?
  const publicProfiles = await probe("public.user_profiles", async () => {
    const { data, error } = await sb.from("user_profiles").select("user_id", { count: "exact", head: true });
    if (error) throw error;
    return { data };
  });

  // 3) Try the exact adapter-shaped insert into next_auth.users
  const insertProbe = await probe("insert next_auth.users (test row)", async () => {
    const testEmail = `probe-${Date.now()}@example.invalid`;
    const { data, error } = await sb.schema("next_auth" as never).from("users").insert({ email: testEmail, name: "probe" }).select().single();
    if (error) throw error;
    // Clean up
    if (data && (data as { id?: string }).id) {
      await sb.schema("next_auth" as never).from("users").delete().eq("id", (data as { id: string }).id);
    }
    return { inserted: data };
  });

  const allOk = nextAuthUsers.ok && publicProfiles.ok && insertProbe.ok;
  return NextResponse.json({ ok: allOk, probes: [nextAuthUsers, publicProfiles, insertProbe] }, { status: allOk ? 200 : 500 });
}
