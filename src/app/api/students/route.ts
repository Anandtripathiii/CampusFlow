import { listRoute, createRoute } from "@/lib/crud";
import { StudentInput } from "@/lib/zod";

export const GET  = listRoute("students", ["teacher_user_id"], { col: "created_at" });
export const POST = createRoute("students", "teacher_user_id", StudentInput);
