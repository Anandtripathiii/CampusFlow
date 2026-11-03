import { patchRoute, deleteRoute } from "@/lib/crud";
import { StudentPatch } from "@/lib/zod";

export const PATCH  = patchRoute("students", ["teacher_user_id"], StudentPatch);
export const DELETE = deleteRoute("students", ["teacher_user_id"]);
