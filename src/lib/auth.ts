import { SignJWT, jwtVerify } from "jose";
import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fitsync-dev-secret-change-me"
);
const COOKIE_NAME = "fitsync_token";
const EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

// ─── Password ───────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// ─── JWT ────────────────────────────────────────────────────────────────────

export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ─────────────────────────────────────────────────────────

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EXPIRES_IN,
    path: "/",
  });
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── Get authenticated user from cookie ─────────────────────────────────────

export async function getAuthUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Seed default streaks & achievements for a new user ─────────────────────

export async function seedUserDefaults(userId: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = neon(url);

  // Streaks
  await sql`
    INSERT INTO streaks (user_id, streak_type, current_count, best_count, last_logged_date)
    VALUES
      (${userId}, 'overall', 0, 0, CURRENT_DATE),
      (${userId}, 'workout', 0, 0, CURRENT_DATE),
      (${userId}, 'food', 0, 0, CURRENT_DATE),
      (${userId}, 'sleep', 0, 0, CURRENT_DATE),
      (${userId}, 'supplements', 0, 0, CURRENT_DATE)
    ON CONFLICT (user_id, streak_type) DO NOTHING
  `;

  // Achievements
  await sql`
    INSERT INTO achievements (user_id, badge_name, badge_icon, description, criteria)
    VALUES
      (${userId}, 'First Scan', '📸', 'Analyze your first food photo', '{"type":"food_scan","count":1}'),
      (${userId}, 'Week Warrior', '⚡', '7-day logging streak', '{"type":"streak","count":7}'),
      (${userId}, 'Month Master', '🔥', '30-day logging streak', '{"type":"streak","count":30}'),
      (${userId}, 'Century Club', '💎', '100-day logging streak', '{"type":"streak","count":100}'),
      (${userId}, 'Macro Master', '🎯', 'Hit macro targets 7 days straight', '{"type":"macro_streak","count":7}'),
      (${userId}, 'Iron Consistency', '🏋️', 'Complete every workout for a month', '{"type":"workout_streak","count":30}'),
      (${userId}, 'Sleep King', '👑', '7+ hours sleep for 14 days straight', '{"type":"sleep_streak","count":14}'),
      (${userId}, 'Supplement Stack', '💊', 'Take all supplements for 7 days', '{"type":"supplement_streak","count":7}')
    ON CONFLICT (user_id, badge_name) DO NOTHING
  `;
}
