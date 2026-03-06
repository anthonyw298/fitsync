import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const rows = await sql`
      SELECT id, email, password_hash FROM users WHERE email = ${email.toLowerCase().trim()}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user = rows[0];
    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createToken(user.id as string, user.email as string);
    await setAuthCookie(token);

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login. Please try again." }, { status: 500 });
  }
}
