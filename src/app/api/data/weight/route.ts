import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getWeightLogs, upsertWeightLog, deleteWeightLog } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "90", 10);

  const data = await getWeightLogs(user.userId, limit);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, weight_kg, notes } = await request.json();
  if (!date || !weight_kg) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const data = await upsertWeightLog(user.userId, date, weight_kg, notes || "");
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteWeightLog(user.userId, id);
  return NextResponse.json({ success: true });
}
