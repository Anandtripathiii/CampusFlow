import { patchRoute, deleteRoute } from "@/lib/crud";
import { TeamMemberPatch } from "@/lib/zod";

export const PATCH  = patchRoute("team_members", ["user_id"], TeamMemberPatch);
export const DELETE = deleteRoute("team_members", ["user_id"]);
