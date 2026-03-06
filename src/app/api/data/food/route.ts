import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getFoodByDate, getFoodByDateRange, addFoodEntry, deleteFoodEntry, updateFoodEntry } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (start && end) {
    const data = await getFoodByDateRange(user.userId, start, end);
    return NextResponse.json({ data });
  }
  if (date) {
    const data = await getFoodByDate(user.userId, date);
    return NextResponse.json({ data });
  }
  return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data = await addFoodEntry(user.userId, body);
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await request.json();
  const data = await updateFoodEntry(user.userId, id, body);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteFoodEntry(user.userId, id);
  return NextResponse.json({ success: true });
}
