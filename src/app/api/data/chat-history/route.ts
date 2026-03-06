import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getChatHistory, addChatMessage } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");

  const data = await getChatHistory(user.userId, limit ? parseInt(limit) : 50);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data = await addChatMessage(user.userId, body);
  return NextResponse.json({ data });
}
