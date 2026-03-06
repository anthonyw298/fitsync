import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getProfile, upsertProfile } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(user.userId);
  return NextResponse.json({ data: profile });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const profile = await upsertProfile(user.userId, body);
  return NextResponse.json({ data: profile });
}
