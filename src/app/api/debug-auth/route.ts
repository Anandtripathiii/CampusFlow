import { NextResponse } from "next/server";

// TEMPORARY — reports which env vars are present (never their values).
// Delete this route before letting real users near the site.
export async function GET() {
  return NextResponse.json({
    has_AUTH_SECRET: !!process.env.AUTH_SECRET,
    has_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    has_AUTH_URL: !!process.env.AUTH_URL,
    AUTH_URL_value: process.env.AUTH_URL ?? null,
    has_NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_value: process.env.NEXTAUTH_URL ?? null,
    has_GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    has_GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    has_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_CRON_SECRET: !!process.env.CRON_SECRET,
    has_RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    node_env: process.env.NODE_ENV ?? null,
    vercel_env: process.env.VERCEL_ENV ?? null,
  });
}
