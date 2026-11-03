import { patchRoute, deleteRoute } from "@/lib/crud";
import { ProjectPatch } from "@/lib/zod";

export const PATCH  = patchRoute("projects", ["user_id"], ProjectPatch);
export const DELETE = deleteRoute("projects", ["user_id"]);
