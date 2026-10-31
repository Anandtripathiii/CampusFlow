import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignIn() {
  const session = await auth();
  if (session?.user) redirect("/");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1rem" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <p className="eyebrow">Welcome back</p>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>CampusFlow</h1>
        <p style={{ color: "var(--color-ink-soft)", margin: "0 0 1.5rem" }}>
          Your semester, in flow.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="button button--primary button--block">
            Sign in with Google
          </button>
        </form>
        <p style={{ color: "var(--color-ink-faint)", fontSize: "0.78rem", marginTop: "1rem" }}>
          We ask for calendar access so reminders can appear in Google Calendar. You can turn it off later in settings.
        </p>
      </div>
    </div>
  );
}
