import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { upcomingEvents } from "@/lib/calendar";

export async function GET() {
  return withUser(async (userId) => {
    const events = await upcomingEvents(userId, 5);
    return NextResponse.json({ events });
  });
}
