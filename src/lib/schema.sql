-- FitSync Database Schema for Neon Postgres
-- Run this SQL in your Neon console to create all tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User Profile (one per user) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  height_in NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  fitness_goal VARCHAR(10) NOT NULL CHECK (fitness_goal IN ('cut', 'maintain', 'bulk')),
  daily_calories INTEGER NOT NULL DEFAULT 2000,
  daily_protein INTEGER NOT NULL DEFAULT 150,
  daily_carbs INTEGER NOT NULL DEFAULT 200,
  daily_fats INTEGER NOT NULL DEFAULT 65,
  workout_days_per_week INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Food Entries ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(10) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name VARCHAR(255) NOT NULL,
  photo_url TEXT,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fats_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  serving_size VARCHAR(100) NOT NULL DEFAULT '1 serving',
  ai_confidence NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, date);

-- ─── Workout Plans (plan_data stored as JSONB) ─────────────────────────────

CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL DEFAULT 1,
  plan_data JSONB NOT NULL DEFAULT '[]',
  split_type VARCHAR(50) NOT NULL DEFAULT 'Full Body',
  days_per_week INTEGER NOT NULL DEFAULT 3,
  adjusted_for_sleep BOOLEAN NOT NULL DEFAULT FALSE,
  adjustment_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON workout_plans(user_id, active);

-- ─── Workout Logs (one per user per day, exercises as JSONB) ────────────────

CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
  workout_name VARCHAR(255) NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  calories_burned NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, date);

-- ─── Sleep Logs (one per user per day) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bedtime VARCHAR(5) NOT NULL,
  wake_time VARCHAR(5) NOT NULL,
  duration_hours NUMERIC NOT NULL,
  quality INTEGER NOT NULL CHECK (quality BETWEEN 1 AND 5),
  notes TEXT NOT NULL DEFAULT '',
  pattern_alert TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, date);

-- ─── Supplements (soft delete via active flag) ──────────────────────────────

CREATE TABLE IF NOT EXISTS supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  dosage VARCHAR(50) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  time_of_day VARCHAR(20) NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'with_meal')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplements_user ON supplements(user_id, active);

-- ─── Supplement Logs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplement_id UUID NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  taken BOOLEAN NOT NULL DEFAULT FALSE,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplement_id, date)
);

CREATE INDEX IF NOT EXISTS idx_supplement_logs_user_date ON supplement_logs(user_id, date);

-- ─── Streaks ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_type VARCHAR(20) NOT NULL CHECK (streak_type IN ('overall', 'workout', 'food', 'sleep', 'supplements')),
  current_count INTEGER NOT NULL DEFAULT 0,
  best_count INTEGER NOT NULL DEFAULT 0,
  last_logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

-- ─── Achievements ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_name VARCHAR(100) NOT NULL,
  badge_icon VARCHAR(10) NOT NULL,
  description TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ,
  criteria JSONB NOT NULL DEFAULT '{}',
  UNIQUE(user_id, badge_name)
);

-- ─── Chat Messages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_type VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (context_type IN ('nutrition', 'workout', 'sleep', 'general')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at);

-- ─── Water Entries ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS water_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_entries_user_date ON water_entries(user_id, date);

-- ─── Weight Logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_lbs NUMERIC NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date);

-- ─── Daily Notes (food diary notes) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── Schema Migrations (run these ALTER statements for existing databases) ──

-- Add number_of_servings to food_entries
ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS number_of_servings NUMERIC NOT NULL DEFAULT 1;

-- Add goal_weight_lbs and daily_water_ml to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS goal_weight_lbs NUMERIC;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_water_ml INTEGER NOT NULL DEFAULT 2500;
