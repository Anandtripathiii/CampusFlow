import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireUserId } from "./auth";

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function badRequest(detail: unknown) {
  return NextResponse.json({ error: "bad_request", detail }, { status: 400 });
}

export function serverError(message = "server_error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function withUser<T>(handler: (userId: string) => Promise<T>): Promise<T | NextResponse> {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return handler(userId);
}

export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T> | NextResponse> {
  try {
    const data = await req.json();
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) return badRequest(err.flatten());
    return badRequest("invalid_json");
  }
}
