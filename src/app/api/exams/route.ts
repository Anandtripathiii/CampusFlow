import { listRoute, createRoute } from "@/lib/crud";
import { ExamInput } from "@/lib/zod";

export const GET  = listRoute("exams", ["user_id"], { col: "date" });
export const POST = createRoute("exams", "user_id", ExamInput);
