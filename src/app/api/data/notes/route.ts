import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDailyNote, upsertDailyNote } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const data = await getDailyNote(user.userId, date);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, content } = await request.json();
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const data = await upsertDailyNote(user.userId, date, content || "");
  return NextResponse.json({ data });
}
