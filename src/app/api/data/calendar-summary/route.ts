import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getCalendarSummary, getProfile } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end date params" }, { status: 400 });
  }

  const profile = await getProfile(user.userId);
  const data = await getCalendarSummary(user.userId, start, end, profile);
  return NextResponse.json({ data });
}
