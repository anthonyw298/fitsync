import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSupplementLogsByDate, toggleSupplementLog, getActiveSupplements } from "@/lib/db";
import { updateStreak } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const data = await getSupplementLogsByDate(user.userId, date);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supplementId, date } = await request.json();
  if (!supplementId || !date) {
    return NextResponse.json({ error: "Missing supplementId or date" }, { status: 400 });
  }

  const data = await toggleSupplementLog(user.userId, supplementId, date);

  // Check if all supplements taken for streak update
  const allSupps = await getActiveSupplements(user.userId);
  const allLogs = await getSupplementLogsByDate(user.userId, date);
  const takenCount = allLogs.filter((l) => l.taken).length;
  if (takenCount >= allSupps.length && allSupps.length > 0) {
    await updateStreak(user.userId, "supplements", date);
    await updateStreak(user.userId, "overall", date);
  }

  return NextResponse.json({ data });
}
