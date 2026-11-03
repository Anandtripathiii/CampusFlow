import { patchRoute, deleteRoute } from "@/lib/crud";
import { AttendancePatch } from "@/lib/zod";

export const PATCH  = patchRoute("attendance", ["user_id"], AttendancePatch);
export const DELETE = deleteRoute("attendance", ["user_id"]);
