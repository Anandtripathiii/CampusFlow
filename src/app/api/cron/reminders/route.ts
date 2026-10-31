import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";
import { sendReminder } from "@/lib/email";

// Called every 5 minutes by Vercel Cron. Finds tasks whose next due-reminder
// window has started and whose log row doesn't exist yet, then sends mail and
// records the log atomically (via unique constraint on (task_id, kind)).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = serverSupabase();
  const now = new Date();
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: tasks } = await sb
    .from("tasks")
    .select("id, title, due_at, user_id, reminder_day_before, reminder_hour_before, reminder_at_time")
    .eq("completed", false)
    .not("due_at", "is", null)
    .lte("due_at", in24h.toISOString())
    .gte("due_at", new Date(now.getTime() - 10 * 60 * 1000).toISOString()); // 10-min grace

  if (!tasks?.length) return NextResponse.json({ sent: 0 });

  const userIds = Array.from(new Set(tasks.map((t) => t.user_id)));
  const { data: users } = await sb.schema("next_auth" as never).from("users").select("id, email").in("id", userIds);
  const emailByUser = new Map((users as { id: string; email: string }[] | null)?.map((u) => [u.id, u.email]) ?? []);

  let sent = 0;
  for (const task of tasks) {
    const due = new Date(task.due_at as string);
    const email = emailByUser.get(task.user_id);
    if (!email) continue;

    const kinds: Array<{ kind: "day_before" | "hour_before" | "at_time"; when: boolean; enabled: boolean }> = [
      { kind: "day_before", when: due <= in24h && due > in1h, enabled: task.reminder_day_before },
      { kind: "hour_before", when: due <= in1h && due > now, enabled: task.reminder_hour_before },
      { kind: "at_time", when: due <= now && due.getTime() + 10 * 60 * 1000 > now.getTime(), enabled: task.reminder_at_time },
    ];

    for (const k of kinds) {
      if (!k.when || !k.enabled) continue;
      // Insert first; if the unique constraint fires, another cron run already sent it.
      const { error: logErr } = await sb.from("reminder_log").insert({ task_id: task.id, kind: k.kind });
      if (logErr) continue;
      try {
        await sendReminder(email, { title: task.title, due_at: task.due_at }, k.kind);
        sent++;
      } catch {
        /* keep going; the log row prevents retries this run */
      }
    }
  }
  return NextResponse.json({ sent });
}
