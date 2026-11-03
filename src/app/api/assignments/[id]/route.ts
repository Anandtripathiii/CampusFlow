import { patchRoute, deleteRoute } from "@/lib/crud";
import { AssignmentPatch } from "@/lib/zod";

export const PATCH  = patchRoute("assignments", ["owner_user_id", "student_user_id"], AssignmentPatch);
export const DELETE = deleteRoute("assignments", ["owner_user_id"]); // only the owner (teacher) may delete
