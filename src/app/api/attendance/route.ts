import { listRoute, createRoute } from "@/lib/crud";
import { AttendanceInput } from "@/lib/zod";

export const GET  = listRoute("attendance", ["user_id"], { col: "date", asc: false });
export const POST = createRoute("attendance", "user_id", AttendanceInput);
