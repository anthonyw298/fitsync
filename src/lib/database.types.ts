export interface UserProfile {
  id: string
  age: number
  height_in: number
  weight_lbs: number
  gender: 'male' | 'female'
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  fitness_goal: 'cut' | 'maintain' | 'bulk'
  daily_calories: number
  daily_protein: number
  daily_carbs: number
  daily_fats: number
  workout_days_per_week: number
  created_at: string
  updated_at: string
}

export interface FoodEntry {
  id: string
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
  ai_confidence: number
  created_at: string
}

export interface WorkoutPlan {
  id: string
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
  name: string
  dosage: string
  unit: string
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'with_meal'
  active: boolean
  created_at: string
}

export interface SupplementLog {
  id: string
  supplement_id: string
  date: string
  taken: boolean
  taken_at: string | null
  created_at: string
}

export interface Streak {
  id: string
  streak_type: 'overall' | 'workout' | 'food' | 'sleep' | 'supplements'
  current_count: number
  best_count: number
  last_logged_date: string
  updated_at: string
}

export interface Achievement {
  id: string
  badge_name: string
  badge_icon: string
  description: string
  unlocked_at: string | null
  criteria: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  context_type: 'nutrition' | 'workout' | 'sleep' | 'general'
  created_at: string
}
