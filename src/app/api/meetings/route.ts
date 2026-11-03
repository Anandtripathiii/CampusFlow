import { listRoute, createRoute } from "@/lib/crud";
import { MeetingInput } from "@/lib/zod";

export const GET  = listRoute("meetings", ["user_id"], { col: "start_at" });
export const POST = createRoute("meetings", "user_id", MeetingInput);
