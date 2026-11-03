import { patchRoute, deleteRoute } from "@/lib/crud";
import { ExamPatch } from "@/lib/zod";

export const PATCH  = patchRoute("exams", ["user_id"], ExamPatch);
export const DELETE = deleteRoute("exams", ["user_id"]);
