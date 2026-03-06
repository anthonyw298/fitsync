import { neon } from "@neondatabase/serverless";
import type {
  UserProfile,
  FoodEntry,
  WorkoutPlan,
  WorkoutLog,
  SleepLog,
  Supplement,
  SupplementLog,
  Streak,
  Achievement,
  ChatMessage,
  WaterEntry,
  WeightLog,
  DailyNote,
} from "./database.types";

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

// ─── Profile ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const sql = getClient();
  const rows = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId} LIMIT 1`;
  return (rows[0] as UserProfile) ?? null;
}

export async function upsertProfile(
  userId: string,
  profile: Omit<UserProfile, "id" | "user_id" | "created_at" | "updated_at">
): Promise<UserProfile> {
  const sql = getClient();
  const existing = await sql`SELECT id FROM user_profiles WHERE user_id = ${userId} LIMIT 1`;

  if (existing.length > 0) {
    const rows = await sql`
      UPDATE user_profiles SET
        age = ${profile.age},
        height_in = ${profile.height_in},
        weight_kg = ${profile.weight_kg},
        gender = ${profile.gender},
        activity_level = ${profile.activity_level},
        fitness_goal = ${profile.fitness_goal},
        daily_calories = ${profile.daily_calories},
        daily_protein = ${profile.daily_protein},
        daily_carbs = ${profile.daily_carbs},
        daily_fats = ${profile.daily_fats},
        workout_days_per_week = ${profile.workout_days_per_week},
        goal_weight_lbs = ${profile.goal_weight_lbs ?? null},
        daily_water_ml = ${profile.daily_water_ml ?? 2500},
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;
    return rows[0] as UserProfile;
  }

  const rows = await sql`
    INSERT INTO user_profiles (user_id, age, height_in, weight_kg, gender, activity_level, fitness_goal, daily_calories, daily_protein, daily_carbs, daily_fats, workout_days_per_week, goal_weight_lbs, daily_water_ml)
    Values (${userId}, ${profile.age}, ${profile.height_in}, ${profile.weight_kg}, ${profile.gender}, ${profile.activity_level}, ${profile.fitness_goal}, ${profile.daily_calories}, ${profile.daily_protein}, ${profile.daily_carbs}, ${profile.daily_fats}, ${profile.workout_days_per_week}, ${profile.goal_weight_lbs ?? null}, ${profile.daily_water_ml ?? 2500})
    RETURNING *
  `;
  return rows[0] as UserProfile;
}

// ─── Food Entries ───────────────────────────────────────────────────────────

export async function getFoodByDate(userId: string, date: string): Promise<FoodEntry[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM food_entries WHERE user_id = ${userId} AND date = ${date} ORDER BY created_at
  `;
  return rows as FoodEntry[];
}

export async function getFoodByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<FoodEntry[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM food_entries
    WHERE user_id = ${userId} AND date >= ${startDate} AND date <= ${endDate}
    ORDER BY date, created_at
  `;
  return rows as FoodEntry[];
}

export async function addFoodEntry(
  userId: string,
  entry: Omit<FoodEntry, "id" | "user_id" | "created_at">
): Promise<FoodEntry> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO food_entries (user_id, date, meal_type, food_name, photo_url, calories, protein_g, carbs_g, fats_g, fiber_g, serving_size, number_of_servings, ai_confidence)
    VALUES (${userId}, ${entry.date}, ${entry.meal_type}, ${entry.food_name}, ${entry.photo_url}, ${entry.calories}, ${entry.protein_g}, ${entry.carbs_g}, ${entry.fats_g}, ${entry.fiber_g}, ${entry.serving_size}, ${entry.number_of_servings ?? 1}, ${entry.ai_confidence})
    RETURNING *
  `;
  return rows[0] as FoodEntry;
}

export async function deleteFoodEntry(userId: string, id: string): Promise<void> {
  const sql = getClient();
  await sql`DELETE FROM food_entries WHERE id = ${id} AND user_id = ${userId}`;
}

export async function updateFoodEntry(
  userId: string,
  id: string,
  updates: Partial<FoodEntry>
): Promise<FoodEntry | null> {
  const sql = getClient();
  const rows = await sql`
    UPDATE food_entries SET
      food_name = COALESCE(${updates.food_name ?? null}, food_name),
      meal_type = COALESCE(${updates.meal_type ?? null}, meal_type),
      calories = COALESCE(${updates.calories ?? null}, calories),
      protein_g = COALESCE(${updates.protein_g ?? null}, protein_g),
      carbs_g = COALESCE(${updates.carbs_g ?? null}, carbs_g),
      fats_g = COALESCE(${updates.fats_g ?? null}, fats_g),
      fiber_g = COALESCE(${updates.fiber_g ?? null}, fiber_g),
      serving_size = COALESCE(${updates.serving_size ?? null}, serving_size),
      number_of_servings = COALESCE(${updates.number_of_servings ?? null}, number_of_servings)
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return (rows[0] as FoodEntry) ?? null;
}

export async function getRecentFoods(userId: string, limit: number = 20): Promise<FoodEntry[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT DISTINCT ON (LOWER(food_name)) *
    FROM food_entries
    WHERE user_id = ${userId}
    ORDER BY LOWER(food_name), created_at DESC
    LIMIT ${limit}
  `;
  return rows as FoodEntry[];
}

export async function getFrequentFoods(userId: string, limit: number = 20): Promise<(FoodEntry & { frequency: number })[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT f.*, sub.freq AS frequency
    FROM food_entries f
    INNER JOIN (
      SELECT LOWER(food_name) AS lname, COUNT(*) AS freq, MAX(created_at) AS latest
      FROM food_entries
      WHERE user_id = ${userId}
      GROUP BY LOWER(food_name)
      ORDER BY freq DESC
      LIMIT ${limit}
    ) sub ON LOWER(f.food_name) = sub.lname AND f.created_at = sub.latest
    WHERE f.user_id = ${userId}
    ORDER BY sub.freq DESC
  `;
  return rows as (FoodEntry & { frequency: number })[];
}

// ─── Water Tracking ─────────────────────────────────────────────────────────

export async function getWaterByDate(userId: string, date: string): Promise<WaterEntry[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM water_entries WHERE user_id = ${userId} AND date = ${date} ORDER BY created_at
  `;
  return rows as WaterEntry[];
}

export async function addWaterEntry(userId: string, date: string, amountMl: number): Promise<WaterEntry> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO water_entries (user_id, date, amount_ml)
    VALUES (${userId}, ${date}, ${amountMl})
    RETURNING *
  `;
  return rows[0] as WaterEntry;
}

export async function deleteWaterEntry(userId: string, id: string): Promise<void> {
  const sql = getClient();
  await sql`DELETE FROM water_entries WHERE id = ${id} AND user_id = ${userId}`;
}

// ─── Weight Tracking ────────────────────────────────────────────────────────

export async function getWeightLogs(userId: string, limit: number = 90): Promise<WeightLog[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM weight_logs WHERE user_id = ${userId} ORDER BY date DESC LIMIT ${limit}
  `;
  return rows as WeightLog[];
}

export async function upsertWeightLog(
  userId: string,
  date: string,
  weightKg: number,
  notes: string = ""
): Promise<WeightLog> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO weight_logs (user_id, date, weight_kg, notes)
    VALUES (${userId}, ${date}, ${weightKg}, ${notes})
    ON CONFLICT (user_id, date) DO UPDATE SET
      weight_kg = EXCLUDED.weight_kg,
      notes = EXCLUDED.notes
    RETURNING *
  `;
  return rows[0] as WeightLog;
}

export async function deleteWeightLog(userId: string, id: string): Promise<void> {
  const sql = getClient();
  await sql`DELETE FROM weight_logs WHERE id = ${id} AND user_id = ${userId}`;
}

// ─── Daily Notes ────────────────────────────────────────────────────────────

export async function getDailyNote(userId: string, date: string): Promise<DailyNote | null> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM daily_notes WHERE user_id = ${userId} AND date = ${date} LIMIT 1
  `;
  return (rows[0] as DailyNote) ?? null;
}

export async function upsertDailyNote(userId: string, date: string, content: string): Promise<DailyNote> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO daily_notes (user_id, date, content)
    VALUES (${userId}, ${date}, ${content})
    ON CONFLICT (user_id, date) DO UPDATE SET
      content = EXCLUDED.content,
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as DailyNote;
}

// ─── Workout Plans ──────────────────────────────────────────────────────────

export async function getActivePlan(userId: string): Promise<WorkoutPlan | null> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM workout_plans WHERE user_id = ${userId} AND active = TRUE ORDER BY created_at DESC LIMIT 1
  `;
  return (rows[0] as WorkoutPlan) ?? null;
}

export async function savePlan(
  userId: string,
  plan: Omit<WorkoutPlan, "id" | "user_id" | "created_at">
): Promise<WorkoutPlan> {
  const sql = getClient();
  await sql`UPDATE workout_plans SET active = FALSE WHERE user_id = ${userId} AND active = TRUE`;
  const rows = await sql`
    INSERT INTO workout_plans (user_id, week_number, plan_data, split_type, days_per_week, adjusted_for_sleep, adjustment_notes, active)
    VALUES (${userId}, ${plan.week_number}, ${JSON.stringify(plan.plan_data)}, ${plan.split_type}, ${plan.days_per_week}, ${plan.adjusted_for_sleep}, ${plan.adjustment_notes}, ${plan.active})
    RETURNING *
  `;
  return rows[0] as WorkoutPlan;
}

// ─── Workout Logs ───────────────────────────────────────────────────────────

export async function getWorkoutLogByDate(userId: string, date: string): Promise<WorkoutLog | null> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM workout_logs WHERE user_id = ${userId} AND date = ${date} LIMIT 1
  `;
  return (rows[0] as WorkoutLog) ?? null;
}

export async function getRecentWorkouts(userId: string, limit: number = 50): Promise<WorkoutLog[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM workout_logs WHERE user_id = ${userId} ORDER BY date DESC LIMIT ${limit}
  `;
  return rows as WorkoutLog[];
}

export async function upsertWorkoutLog(
  userId: string,
  log: Omit<WorkoutLog, "id" | "user_id" | "created_at">
): Promise<WorkoutLog> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO workout_logs (user_id, date, plan_id, workout_name, exercises, duration_minutes, calories_burned, notes, completed)
    VALUES (${userId}, ${log.date}, ${log.plan_id}, ${log.workout_name}, ${JSON.stringify(log.exercises)}, ${log.duration_minutes}, ${log.calories_burned}, ${log.notes}, ${log.completed})
    ON CONFLICT (user_id, date) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      workout_name = EXCLUDED.workout_name,
      exercises = EXCLUDED.exercises,
      duration_minutes = EXCLUDED.duration_minutes,
      calories_burned = EXCLUDED.calories_burned,
      notes = EXCLUDED.notes,
      completed = EXCLUDED.completed
    RETURNING *
  `;
  return rows[0] as WorkoutLog;
}

export async function updateWorkoutLog(
  userId: string,
  id: string,
  updates: Partial<WorkoutLog>
): Promise<WorkoutLog | null> {
  const sql = getClient();
  // Build dynamic update — only update fields that are provided
  const rows = await sql`
    UPDATE workout_logs SET
      workout_name = COALESCE(${updates.workout_name ?? null}, workout_name),
      exercises = COALESCE(${updates.exercises ? JSON.stringify(updates.exercises) : null}, exercises),
      duration_minutes = COALESCE(${updates.duration_minutes ?? null}, duration_minutes),
      calories_burned = COALESCE(${updates.calories_burned ?? null}, calories_burned),
      notes = COALESCE(${updates.notes ?? null}, notes),
      completed = COALESCE(${updates.completed ?? null}, completed)
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return (rows[0] as WorkoutLog) ?? null;
}

// ─── Sleep Logs ─────────────────────────────────────────────────────────────

export async function getRecentSleep(userId: string, days: number = 30): Promise<SleepLog[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM sleep_logs WHERE user_id = ${userId} ORDER BY date DESC LIMIT ${days}
  `;
  return rows as SleepLog[];
}

export async function upsertSleepLog(
  userId: string,
  log: Omit<SleepLog, "id" | "user_id" | "created_at">
): Promise<SleepLog> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO sleep_logs (user_id, date, bedtime, wake_time, duration_hours, quality, notes, pattern_alert)
    VALUES (${userId}, ${log.date}, ${log.bedtime}, ${log.wake_time}, ${log.duration_hours}, ${log.quality}, ${log.notes}, ${log.pattern_alert})
    ON CONFLICT (user_id, date) DO UPDATE SET
      bedtime = EXCLUDED.bedtime,
      wake_time = EXCLUDED.wake_time,
      duration_hours = EXCLUDED.duration_hours,
      quality = EXCLUDED.quality,
      notes = EXCLUDED.notes,
      pattern_alert = EXCLUDED.pattern_alert
    RETURNING *
  `;
  return rows[0] as SleepLog;
}

// ─── Supplements ────────────────────────────────────────────────────────────

export async function getActiveSupplements(userId: string): Promise<Supplement[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM supplements WHERE user_id = ${userId} AND active = TRUE ORDER BY created_at
  `;
  return rows as Supplement[];
}

export async function addSupplement(
  userId: string,
  supp: Omit<Supplement, "id" | "user_id" | "created_at" | "active">
): Promise<Supplement> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO supplements (user_id, name, dosage, unit, time_of_day)
    VALUES (${userId}, ${supp.name}, ${supp.dosage}, ${supp.unit}, ${supp.time_of_day})
    RETURNING *
  `;
  return rows[0] as Supplement;
}

export async function deactivateSupplement(userId: string, id: string): Promise<void> {
  const sql = getClient();
  await sql`UPDATE supplements SET active = FALSE WHERE id = ${id} AND user_id = ${userId}`;
}

// ─── Supplement Logs ────────────────────────────────────────────────────────

export async function getSupplementLogsByDate(userId: string, date: string): Promise<SupplementLog[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM supplement_logs WHERE user_id = ${userId} AND date = ${date}
  `;
  return rows as SupplementLog[];
}

export async function toggleSupplementLog(
  userId: string,
  supplementId: string,
  date: string
): Promise<SupplementLog> {
  const sql = getClient();
  const existing = await sql`
    SELECT * FROM supplement_logs WHERE user_id = ${userId} AND supplement_id = ${supplementId} AND date = ${date}
  `;

  if (existing.length > 0) {
    const rows = await sql`
      UPDATE supplement_logs SET
        taken = NOT taken,
        taken_at = CASE WHEN taken THEN NULL ELSE NOW() END
      WHERE id = ${existing[0].id} AND user_id = ${userId}
      RETURNING *
    `;
    return rows[0] as SupplementLog;
  }

  const rows = await sql`
    INSERT INTO supplement_logs (user_id, supplement_id, date, taken, taken_at)
    VALUES (${userId}, ${supplementId}, ${date}, TRUE, NOW())
    RETURNING *
  `;
  return rows[0] as SupplementLog;
}

// ─── Streaks ────────────────────────────────────────────────────────────────

export async function getStreaks(userId: string): Promise<Streak[]> {
  const sql = getClient();
  const rows = await sql`SELECT * FROM streaks WHERE user_id = ${userId} ORDER BY streak_type`;
  return rows as Streak[];
}

export async function updateStreak(userId: string, streakType: string, date: string): Promise<Streak> {
  const sql = getClient();
  const rows = await sql`
    UPDATE streaks SET
      current_count = CASE
        WHEN last_logged_date = (${date}::date - INTERVAL '1 day')::date THEN current_count + 1
        WHEN last_logged_date = ${date}::date THEN current_count
        ELSE 1
      END,
      best_count = GREATEST(best_count, CASE
        WHEN last_logged_date = (${date}::date - INTERVAL '1 day')::date THEN current_count + 1
        ELSE 1
      END),
      last_logged_date = ${date},
      updated_at = NOW()
    WHERE user_id = ${userId} AND streak_type = ${streakType}
    RETURNING *
  `;
  return rows[0] as Streak;
}

// ─── Achievements ───────────────────────────────────────────────────────────

export async function getAchievements(userId: string): Promise<Achievement[]> {
  const sql = getClient();
  const rows = await sql`SELECT * FROM achievements WHERE user_id = ${userId} ORDER BY badge_name`;
  return rows as Achievement[];
}

// ─── Chat Messages ──────────────────────────────────────────────────────────

export async function getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT * FROM chat_messages WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}
  `;
  return (rows as ChatMessage[]).reverse();
}

export async function addChatMessage(
  userId: string,
  msg: Omit<ChatMessage, "id" | "user_id" | "created_at">
): Promise<ChatMessage> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO chat_messages (user_id, role, content, context_type)
    VALUES (${userId}, ${msg.role}, ${msg.content}, ${msg.context_type})
    RETURNING *
  `;
  return rows[0] as ChatMessage;
}
