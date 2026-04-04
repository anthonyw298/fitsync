import { NextResponse } from "next/server";

export async function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon\\.ico|manifest\\.json|icons|sw\\.js|workbox-).*)",
  ],
};
