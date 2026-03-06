import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getStreaks, updateStreak, getAchievements } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "achievements") {
    const data = await getAchievements(user.userId);
    return NextResponse.json({ data });
  }

  const data = await getStreaks(user.userId);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { streakType, date } = await request.json();
  if (!streakType || !date) {
    return NextResponse.json({ error: "Missing streakType or date" }, { status: 400 });
  }

  const data = await updateStreak(user.userId, streakType, date);
  return NextResponse.json({ data });
}
