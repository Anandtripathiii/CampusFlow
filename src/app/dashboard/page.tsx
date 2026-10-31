import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverSupabase } from "@/lib/supabase";
import Dashboard from "./Dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/signin");
  const sb = serverSupabase();
  const [profile, semesters, subjects, tasks] = await Promise.all([
    sb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("semesters").select("*").eq("user_id", userId).order("created_at"),
    sb.from("subjects").select("*").eq("user_id", userId).order("created_at"),
    sb.from("tasks").select("*").eq("user_id", userId).order("sort_order").order("due_at", { ascending: true, nullsFirst: false }),
  ]);
  if (!profile.data?.role) redirect("/onboarding");

  return (
    <Dashboard
      initial={{
        profile: profile.data,
        semesters: semesters.data ?? [],
        subjects: subjects.data ?? [],
        tasks: tasks.data ?? [],
        userName: session.user.name ?? session.user.email ?? "",
      }}
    />
  );
}
