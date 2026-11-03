import { listRoute, createRoute } from "@/lib/crud";
import { ClassInput } from "@/lib/zod";

export const GET  = listRoute("classes", ["user_id"], { col: "created_at" });
export const POST = createRoute("classes", "user_id", ClassInput);
