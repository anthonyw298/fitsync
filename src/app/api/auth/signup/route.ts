import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { hashPassword, createToken, setAuthCookie, seedUserDefaults } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const rows = await sql`
      INSERT INTO users (email, password_hash) VALUES (${email.toLowerCase().trim()}, ${passwordHash})
      RETURNING id, email, created_at
    `;
    const user = rows[0];

    // Seed defaults (streaks, achievements)
    await seedUserDefaults(user.id as string);

    // Create JWT and set cookie
    const token = await createToken(user.id as string, user.email as string);
    await setAuthCookie(token);

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
