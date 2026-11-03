import { listRoute, createRoute } from "@/lib/crud";
import { AssignmentInput } from "@/lib/zod";

// Visible to the owner (teacher) OR the student it's assigned to.
export const GET  = listRoute("assignments", ["owner_user_id", "student_user_id"], { col: "due_at" });
export const POST = createRoute("assignments", "owner_user_id", AssignmentInput);
