import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRecentFoods, getFrequentFoods } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "recent";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (type === "frequent") {
    const data = await getFrequentFoods(user.userId, limit);
    return NextResponse.json({ data });
  }

  const data = await getRecentFoods(user.userId, limit);
  return NextResponse.json({ data });
}
