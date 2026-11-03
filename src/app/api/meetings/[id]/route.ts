import { patchRoute, deleteRoute } from "@/lib/crud";
import { MeetingPatch } from "@/lib/zod";

export const PATCH  = patchRoute("meetings", ["user_id"], MeetingPatch);
export const DELETE = deleteRoute("meetings", ["user_id"]);
