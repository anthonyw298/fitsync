export interface User {
  id: string
  email: string
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  age: number
  height_in: number
  weight_kg: number
  gender: 'male' | 'female'
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  fitness_goal: 'cut' | 'maintain' | 'bulk'
  daily_calories: number
  daily_protein: number
  daily_carbs: number
  daily_fats: number
  workout_days_per_week: number
  goal_weight_lbs: number | null
  daily_water_ml: number
  created_at: string
  updated_at: string
}

export interface FoodEntry {
  id: string
  user_id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_name: string
  photo_url: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
  serving_size: string
  number_of_servings: number
  ai_confidence: number
  created_at: string
}

export interface WorkoutPlan {
  id: string
  user_id: string
  week_number: number
  plan_data: WorkoutDay[]
  split_type: string
  days_per_week: number
  adjusted_for_sleep: boolean
  adjustment_notes: string | null
  active: boolean
  created_at: string
}

export interface WorkoutDay {
  day: string
  name: string
  exercises: Exercise[]
  rest_day: boolean
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  weight: number | null
  rest_seconds: number
  notes: string
  completed?: boolean
  actual_sets?: ActualSet[]
}

export interface ActualSet {
  reps: number
  weight: number
  completed: boolean
}

export interface WorkoutLog {
  id: string
  user_id: string
  date: string
  plan_id: string | null
  workout_name: string
  exercises: LoggedExercise[]
  duration_minutes: number
  calories_burned: number
  notes: string
  completed: boolean
  created_at: string
}

export interface LoggedExercise {
  name: string
  sets: ActualSet[]
}

export interface SleepLog {
  id: string
  user_id: string
  date: string
  bedtime: string
  wake_time: string
  duration_hours: number
  quality: 1 | 2 | 3 | 4 | 5
  notes: string
  pattern_alert: string | null
  created_at: string
}

export interface Supplement {
  id: string
  user_id: string
  name: string
  dosage: string
  unit: string
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'with_meal'
  active: boolean
  created_at: string
}

export interface SupplementLog {
  id: string
  user_id: string
  supplement_id: string
  date: string
  taken: boolean
  taken_at: string | null
  created_at: string
}

export interface Streak {
  id: string
  user_id: string
  streak_type: 'overall' | 'workout' | 'food' | 'sleep' | 'supplements'
  current_count: number
  best_count: number
  last_logged_date: string
  updated_at: string
}

export interface Achievement {
  id: string
  user_id: string
  badge_name: string
  badge_icon: string
  description: string
  unlocked_at: string | null
  criteria: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  context_type: 'nutrition' | 'workout' | 'sleep' | 'general'
  created_at: string
}

export interface WaterEntry {
  id: string
  date: string
  amount_ml: number
  created_at: string
}

export interface WeightLog {
  id: string
  date: string
  weight_kg: number
  notes: string
  created_at: string
}

export interface DailyNote {
  id: string
  date: string
  content: string
  created_at: string
  updated_at: string
}

// ─── Custom Workout Types ────────────────────────────────────────────────────

export interface CustomExerciseEntry {
  exercise_id: string
  name: string
  sets: number
  reps: string
  weight: number | null
  rest_seconds: number
  notes: string
}

export interface SavedWorkout {
  id: string
  name: string
  exercises: CustomExerciseEntry[]
  created_at: string
  last_used: string | null
}
