import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { serverSupabase } from "./supabase";

// Google Calendar read/write when the user grants it. The refresh_token comes
// back only on the first consent, so we also pass access_type=offline + prompt.
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

// Fallbacks keep the module importable during `next build` (page-data
// collection evaluates every route). They are never used in a running request:
// a request without real env values fails loudly when the adapter talks to
// Supabase, which is the correct place to notice.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  }),
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: `openid email profile ${CALENDAR_SCOPE}`,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) (session.user as { id?: string }).id = user.id;
      return session;
    },
    async signIn({ account }) {
      if (account?.provider === "google" && account.refresh_token) {
        try {
          const sb = serverSupabase();
          await sb.from("user_profiles").upsert(
            { user_id: account.userId as string, google_refresh_token: account.refresh_token, google_calendar_enabled: true },
            { onConflict: "user_id" },
          );
        } catch {
          /* best-effort; profile row is created by the trigger */
        }
      }
      return true;
    },
  },
  pages: { signIn: "/signin" },
});

export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}
