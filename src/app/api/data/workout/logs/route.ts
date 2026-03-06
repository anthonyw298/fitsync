import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getWorkoutLogByDate, getRecentWorkouts, upsertWorkoutLog, updateWorkoutLog, deleteWorkoutLog } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const limit = searchParams.get("limit");

  if (date) {
    const data = await getWorkoutLogByDate(user.userId, date);
    return NextResponse.json({ data });
  }
  const data = await getRecentWorkouts(user.userId, limit ? parseInt(limit) : 50);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data = await upsertWorkoutLog(user.userId, body);
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await request.json();
  const data = await updateWorkoutLog(user.userId, id, body);
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteWorkoutLog(user.userId, id);
  return NextResponse.json({ success: true });
}
