import { patchRoute, deleteRoute } from "@/lib/crud";
import { SubmissionPatch } from "@/lib/zod";

export const PATCH  = patchRoute("submissions", ["student_user_id"], SubmissionPatch);
export const DELETE = deleteRoute("submissions", ["student_user_id"]);
