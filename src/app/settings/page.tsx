import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverSupabase } from "@/lib/supabase";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = (session.user as { id?: string }).id!;
  const sb = serverSupabase();
  const { data } = await sb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
  return (
    <div style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <a href="/dashboard" style={{ color: "var(--color-ink-soft)", fontSize: "0.85rem" }}>← Back</a>
      <h1 style={{ margin: "0.5rem 0 1.5rem" }}>Settings</h1>
      <SettingsForm profile={data} />
    </div>
  );
}
