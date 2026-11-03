import { patchRoute, deleteRoute } from "@/lib/crud";
import { ClassPatch } from "@/lib/zod";

export const PATCH  = patchRoute("classes", ["user_id"], ClassPatch);
export const DELETE = deleteRoute("classes", ["user_id"]);
