import { listRoute, createRoute } from "@/lib/crud";
import { TeamMemberInput } from "@/lib/zod";

export const GET  = listRoute("team_members", ["user_id"], { col: "name" });
export const POST = createRoute("team_members", "user_id", TeamMemberInput);
