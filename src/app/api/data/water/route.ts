import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getWaterByDate, addWaterEntry, deleteWaterEntry } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const data = await getWaterByDate(user.userId, date);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, amount_ml } = await request.json();
  if (!date || !amount_ml) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const data = await addWaterEntry(user.userId, date, amount_ml);
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteWaterEntry(user.userId, id);
  return NextResponse.json({ success: true });
}
