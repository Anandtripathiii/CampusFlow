import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, parseBody, withUser } from "./api";
import { serverSupabase } from "./supabase";

// Thin factories so each entity route is a 2-liner. Every table in this
// app is scoped by one or two user-id columns and gated by RLS; this
// helper handles the common shape. Entities that need something fancier
// (joined fetches, calendar sync, etc) can keep their bespoke route.

export type OwnerCols = string[]; // columns to match the session user against (first one is also used on insert)

export function listRoute(table: string, owner: OwnerCols, order?: { col: string; asc?: boolean }) {
  return async function GET() {
    return withUser(async (userId) => {
      const sb = serverSupabase();
      let q = sb.from(table).select("*");
      // Match any owner column via `.or` so e.g. assignments visible to owner OR student.
      q = owner.length === 1
        ? q.eq(owner[0], userId)
        : q.or(owner.map((c) => `${c}.eq.${userId}`).join(","));
      if (order) q = q.order(order.col, { ascending: order.asc ?? true });
      const { data, error } = await q;
      if (error) return badRequest(error.message);
      return NextResponse.json({ rows: data ?? [] });
    });
  };
}

export function createRoute<T extends z.ZodTypeAny>(table: string, insertOwnerCol: string, schema: T) {
  return async function POST(req: Request) {
    return withUser(async (userId) => {
      const parsed = await parseBody(req, schema);
      if (parsed instanceof NextResponse) return parsed;
      const sb = serverSupabase();
      const { data, error } = await sb.from(table).insert({ ...parsed, [insertOwnerCol]: userId }).select().single();
      if (error) return badRequest(error.message);
      return NextResponse.json({ row: data }, { status: 201 });
    });
  };
}

export function patchRoute<T extends z.ZodTypeAny>(table: string, owner: OwnerCols, schema: T) {
  return async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return withUser(async (userId) => {
      const { id } = await ctx.params;
      const parsed = await parseBody(req, schema);
      if (parsed instanceof NextResponse) return parsed;
      const sb = serverSupabase();
      let q = sb.from(table).update(parsed).eq("id", id);
      q = owner.length === 1
        ? q.eq(owner[0], userId)
        : q.or(owner.map((c) => `${c}.eq.${userId}`).join(","));
      const { data, error } = await q.select().single();
      if (error) return badRequest(error.message);
      return NextResponse.json({ row: data });
    });
  };
}

export function deleteRoute(table: string, owner: OwnerCols) {
  return async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    return withUser(async (userId) => {
      const { id } = await ctx.params;
      const sb = serverSupabase();
      let q = sb.from(table).delete().eq("id", id);
      q = owner.length === 1
        ? q.eq(owner[0], userId)
        : q.or(owner.map((c) => `${c}.eq.${userId}`).join(","));
      const { error } = await q;
      if (error) return badRequest(error.message);
      return NextResponse.json({ ok: true });
    });
  };
}
