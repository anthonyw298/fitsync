import { create } from 'zustand'
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
  WaterEntry,
  WeightLog,
} from '@/lib/database.types'
import { getToday } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Normalize a date string from Postgres (e.g. "2026-03-06T00:00:00.000Z") to "2026-03-06" */
function normalizeDate(d: string): string {
  if (!d) return d
  return d.length > 10 ? d.slice(0, 10) : d
}

/** Normalize a SleepLog from the API (fix date format and numeric types) */
function normalizeSleepLog(s: any): SleepLog {
  return {
    ...s,
    date: normalizeDate(s.date),
    duration_hours: typeof s.duration_hours === 'string' ? parseFloat(s.duration_hours) : s.duration_hours,
    quality: typeof s.quality === 'string' ? parseInt(s.quality) : s.quality,
  }
}

async function api<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options)
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

async function apiPost<T>(url: string, body: unknown): Promise<T | null> {
  return api<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function apiPut<T>(url: string, body: unknown): Promise<T | null> {
  return api<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

interface AppState {
  // Profile
  profile: UserProfile | null
  profileLoading: boolean
  fetchProfile: () => Promise<void>
  updateProfile: (data: Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>

  // Food
  todayFood: FoodEntry[]
  foodLoading: boolean
  fetchTodayFood: () => Promise<void>
  fetchFoodByDate: (date: string) => Promise<FoodEntry[]>
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  updateFoodEntry: (id: string, updates: Partial<FoodEntry>) => Promise<FoodEntry | null>
  deleteFoodEntry: (id: string) => Promise<void>

  // Recent / Frequent Foods
  recentFoods: FoodEntry[]
  frequentFoods: (FoodEntry & { frequency?: number })[]
  fetchRecentFoods: () => Promise<void>
  fetchFrequentFoods: () => Promise<void>

  // Water
  todayWater: WaterEntry[]
  waterLoading: boolean
  fetchWaterByDate: (date: string) => Promise<WaterEntry[]>
  addWaterEntry: (date: string, amountMl: number) => Promise<void>
  deleteWaterEntry: (id: string) => Promise<void>

  // Weight
  weightLogs: WeightLog[]
  weightLoading: boolean
  fetchWeightLogs: () => Promise<void>
  addWeightLog: (date: string, weightKg: number, notes?: string) => Promise<void>
  deleteWeightLog: (id: string) => Promise<void>

  // Workout
  activePlan: WorkoutPlan | null
  todayWorkout: WorkoutLog | null
  workoutLoading: boolean
  fetchActivePlan: () => Promise<void>
  fetchTodayWorkout: () => Promise<void>
  addWorkoutLog: (log: Omit<WorkoutLog, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  updateWorkoutLog: (id: string, data: Partial<WorkoutLog>) => Promise<void>
  deleteWorkoutLog: (id: string) => Promise<void>
  workoutLogs: WorkoutLog[]
  fetchWorkoutLogs: (limit?: number) => Promise<void>

  // Sleep
  recentSleep: SleepLog[]
  sleepLoading: boolean
  fetchRecentSleep: () => Promise<void>
  addSleepLog: (log: Omit<SleepLog, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  deleteSleepLog: (id: string) => Promise<void>

  // Supplements
  supplements: Supplement[]
  todaySupplementLogs: SupplementLog[]
  supplementsLoading: boolean
  fetchSupplements: () => Promise<void>
  fetchTodaySupplementLogs: () => Promise<void>
  addSupplement: (supp: Omit<Supplement, 'id' | 'user_id' | 'created_at' | 'active'>) => Promise<void>
  toggleSupplementTaken: (supplementId: string, date: string) => Promise<void>
  deleteSupplement: (id: string) => Promise<void>

  // Streaks
  streaks: Streak[]
  achievements: Achievement[]
  fetchStreaks: () => Promise<void>
  fetchAchievements: () => Promise<void>

  // UI
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Profile
  profile: null,
  profileLoading: false,
  fetchProfile: async () => {
    set({ profileLoading: true })
    const data = await api<UserProfile>('/api/data/profile')
    set({ profile: data, profileLoading: false })
  },
  updateProfile: async (updates) => {
    const data = await apiPut<UserProfile>('/api/data/profile', updates)
    if (data) set({ profile: data })
  },

  // Food
  todayFood: [],
  foodLoading: false,
  fetchTodayFood: async () => {
    set({ foodLoading: true })
    const raw = await api<FoodEntry[]>(`/api/data/food?date=${getToday()}`)
    const data = (raw ?? []).map((f) => ({ ...f, date: normalizeDate(f.date) }))
    set({ todayFood: data, foodLoading: false })
  },
  fetchFoodByDate: async (date: string) => {
    const raw = await api<FoodEntry[]>(`/api/data/food?date=${date}`)
    return (raw ?? []).map((f) => ({ ...f, date: normalizeDate(f.date) }))
  },
  addFoodEntry: async (entry) => {
    const raw = await apiPost<FoodEntry>('/api/data/food', entry)
    const data = raw ? { ...raw, date: normalizeDate(raw.date) } : null
    if (data && data.date === getToday()) {
      set({ todayFood: [...get().todayFood, data] })
    }
    await apiPost('/api/data/streaks', { streakType: 'food', date: entry.date })
    await apiPost('/api/data/streaks', { streakType: 'overall', date: entry.date })
  },
  updateFoodEntry: async (id, updates) => {
    const raw = await apiPut<FoodEntry>(`/api/data/food?id=${id}`, updates)
    const data = raw ? { ...raw, date: normalizeDate(raw.date) } : null
    if (data) {
      set({ todayFood: get().todayFood.map((f) => (f.id === id ? data : f)) })
    }
    return data
  },
  deleteFoodEntry: async (id) => {
    await fetch(`/api/data/food?id=${id}`, { method: 'DELETE' })
    set({ todayFood: get().todayFood.filter((f) => f.id !== id) })
  },

  // Recent / Frequent Foods
  recentFoods: [],
  frequentFoods: [],
  fetchRecentFoods: async () => {
    const data = await api<FoodEntry[]>('/api/data/food/recent?type=recent&limit=20')
    set({ recentFoods: data ?? [] })
  },
  fetchFrequentFoods: async () => {
    const data = await api<(FoodEntry & { frequency?: number })[]>('/api/data/food/recent?type=frequent&limit=20')
    set({ frequentFoods: data ?? [] })
  },

  // Water
  todayWater: [],
  waterLoading: false,
  fetchWaterByDate: async (date: string) => {
    set({ waterLoading: true })
    const raw = await api<WaterEntry[]>(`/api/data/water?date=${date}`)
    const entries = (raw ?? []).map((w) => ({ ...w, date: normalizeDate(w.date), amount_ml: typeof w.amount_ml === 'string' ? parseInt(w.amount_ml) : w.amount_ml }))
    if (date === getToday()) set({ todayWater: entries })
    set({ waterLoading: false })
    return entries
  },
  addWaterEntry: async (date, amountMl) => {
    const raw = await apiPost<WaterEntry>('/api/data/water', { date, amount_ml: amountMl })
    if (raw && date === getToday()) {
      const data = { ...raw, date: normalizeDate(raw.date), amount_ml: typeof raw.amount_ml === 'string' ? parseInt(raw.amount_ml) : raw.amount_ml }
      set({ todayWater: [...get().todayWater, data] })
    }
  },
  deleteWaterEntry: async (id) => {
    await fetch(`/api/data/water?id=${id}`, { method: 'DELETE' })
    set({ todayWater: get().todayWater.filter((w) => w.id !== id) })
  },

  // Weight
  weightLogs: [],
  weightLoading: false,
  fetchWeightLogs: async () => {
    set({ weightLoading: true })
    const raw = await api<WeightLog[]>('/api/data/weight?limit=90')
    const data = (raw ?? []).map((w) => ({ ...w, date: normalizeDate(w.date), weight_kg: typeof w.weight_kg === 'string' ? parseFloat(w.weight_kg) : w.weight_kg }))
    set({ weightLogs: data, weightLoading: false })
  },
  addWeightLog: async (date, weightKg, notes) => {
    const raw = await apiPost<WeightLog>('/api/data/weight', { date, weight_kg: weightKg, notes: notes || '' })
    if (raw) {
      const data = { ...raw, date: normalizeDate(raw.date), weight_kg: typeof raw.weight_kg === 'string' ? parseFloat(raw.weight_kg) : raw.weight_kg }
      const existing = get().weightLogs.filter((w) => w.date !== data.date)
      set({ weightLogs: [data, ...existing].sort((a, b) => b.date.localeCompare(a.date)) })
    }
  },
  deleteWeightLog: async (id) => {
    await fetch(`/api/data/weight?id=${id}`, { method: 'DELETE' })
    set({ weightLogs: get().weightLogs.filter((w) => w.id !== id) })
  },

  // Workout
  activePlan: null,
  todayWorkout: null,
  workoutLoading: false,
  fetchActivePlan: async () => {
    set({ workoutLoading: true })
    const data = await api<WorkoutPlan>('/api/data/workout/plans')
    set({ activePlan: data, workoutLoading: false })
  },
  fetchTodayWorkout: async () => {
    const data = await api<WorkoutLog>(`/api/data/workout/logs?date=${getToday()}`)
    set({ todayWorkout: data })
  },
  addWorkoutLog: async (log) => {
    const data = await apiPost<WorkoutLog>('/api/data/workout/logs', log)
    if (data) set({ todayWorkout: data })
    await apiPost('/api/data/streaks', { streakType: 'workout', date: getToday() })
    await apiPost('/api/data/streaks', { streakType: 'overall', date: getToday() })
  },
  updateWorkoutLog: async (id, updates) => {
    const data = await apiPut<WorkoutLog>(`/api/data/workout/logs?id=${id}`, updates)
    if (data) set({ todayWorkout: data })
  },
  deleteWorkoutLog: async (id) => {
    await fetch(`/api/data/workout/logs?id=${id}`, { method: 'DELETE' })
    set((s) => ({
      workoutLogs: s.workoutLogs.filter((l) => l.id !== id),
      todayWorkout: s.todayWorkout?.id === id ? null : s.todayWorkout,
    }))
  },
  workoutLogs: [],
  fetchWorkoutLogs: async (limit = 50) => {
    const data = await api<WorkoutLog[]>(`/api/data/workout/logs?limit=${limit}`)
    set({ workoutLogs: data ?? [] })
  },

  // Sleep
  recentSleep: [],
  sleepLoading: false,
  fetchRecentSleep: async () => {
    set({ sleepLoading: true })
    const raw = await api<SleepLog[]>('/api/data/sleep?limit=30')
    const data = (raw ?? []).map(normalizeSleepLog)
    set({ recentSleep: data, sleepLoading: false })
  },
  addSleepLog: async (log) => {
    const raw = await apiPost<SleepLog>('/api/data/sleep', log)
    if (raw) {
      const data = normalizeSleepLog(raw)
      set({ recentSleep: [data, ...get().recentSleep.filter((s) => s.date !== data.date)] })
    }
    await apiPost('/api/data/streaks', { streakType: 'sleep', date: getToday() })
    await apiPost('/api/data/streaks', { streakType: 'overall', date: getToday() })
  },
  deleteSleepLog: async (id) => {
    await fetch(`/api/data/sleep?id=${id}`, { method: 'DELETE' })
    set((s) => ({ recentSleep: s.recentSleep.filter((l) => l.id !== id) }))
  },

  // Supplements
  supplements: [],
  todaySupplementLogs: [],
  supplementsLoading: false,
  fetchSupplements: async () => {
    set({ supplementsLoading: true })
    const data = await api<Supplement[]>('/api/data/supplements')
    set({ supplements: data ?? [], supplementsLoading: false })
  },
  fetchTodaySupplementLogs: async () => {
    const data = await api<SupplementLog[]>(`/api/data/supplements/logs?date=${getToday()}`)
    set({ todaySupplementLogs: data ?? [] })
  },
  addSupplement: async (supp) => {
    const data = await apiPost<Supplement>('/api/data/supplements', supp)
    if (data) set({ supplements: [...get().supplements, data] })
  },
  toggleSupplementTaken: async (supplementId, date) => {
    await apiPost('/api/data/supplements/logs', { supplementId, date })
    const data = await api<SupplementLog[]>(`/api/data/supplements/logs?date=${getToday()}`)
    set({ todaySupplementLogs: data ?? [] })
  },
  deleteSupplement: async (id) => {
    await fetch(`/api/data/supplements?id=${id}`, { method: 'DELETE' })
    set({ supplements: get().supplements.filter((s) => s.id !== id) })
  },

  // Streaks
  streaks: [],
  achievements: [],
  fetchStreaks: async () => {
    const data = await api<Streak[]>('/api/data/streaks')
    set({ streaks: data ?? [] })
  },
  fetchAchievements: async () => {
    const data = await api<Achievement[]>('/api/data/streaks?type=achievements')
    set({ achievements: data ?? [] })
  },

  // UI
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
