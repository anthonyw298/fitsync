import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fitsync-dev-secret-change-me"
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("fitsync_token")?.value;

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Invalid/expired token → redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("fitsync_token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login (auth page)
     * - /api/auth/* (auth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /manifest.json, /icons/* (static files)
     */
    "/((?!login|api/auth|_next|favicon\\.ico|manifest\\.json|icons|sw\\.js|workbox-).*)",
  ],
};
