import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client with the service role. Never import this from client code.
// We still filter by user_id on every query (defense in depth with RLS).
let cached: SupabaseClient | null = null;
export function serverSupabase(): SupabaseClient {
  if (!cached) {
    if (!url || !serviceKey) throw new Error("Supabase env vars missing");
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "public" },
    });
  }
  return cached;
}
