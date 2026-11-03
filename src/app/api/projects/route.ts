import { listRoute, createRoute } from "@/lib/crud";
import { ProjectInput } from "@/lib/zod";

export const GET  = listRoute("projects", ["user_id"], { col: "created_at", asc: false });
export const POST = createRoute("projects", "user_id", ProjectInput);
