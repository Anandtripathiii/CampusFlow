import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverSupabase } from "@/lib/supabase";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/signin");
  const sb = serverSupabase();
  const { data: profile } = await sb.from("user_profiles").select("role").eq("user_id", userId).maybeSingle();
  if (!profile?.role) redirect("/onboarding");
  redirect("/dashboard");
}
