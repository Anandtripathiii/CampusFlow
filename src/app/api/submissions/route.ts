import { listRoute, createRoute } from "@/lib/crud";
import { SubmissionInput } from "@/lib/zod";

// shortcut: student-only ownership in the simple helper; teachers must
// use the assignment-scoped grade endpoint when it lands.
export const GET  = listRoute("submissions", ["student_user_id"], { col: "submitted_at", asc: false });
export const POST = createRoute("submissions", "student_user_id", SubmissionInput);
