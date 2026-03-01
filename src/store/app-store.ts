import { create } from 'zustand'
import { db } from '@/lib/local-db'
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
} from '@/lib/database.types'
import { getToday } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */
function cast<T>(val: any): T {
  return val as T
}

interface AppState {
  // Profile
  profile: UserProfile | null
  profileLoading: boolean
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>

  // Food
  todayFood: FoodEntry[]
  foodLoading: boolean
  fetchTodayFood: () => Promise<void>
  fetchFoodByDate: (date: string) => Promise<FoodEntry[]>
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'created_at'>) => Promise<void>
  deleteFoodEntry: (id: string) => Promise<void>

  // Workout
  activePlan: WorkoutPlan | null
  todayWorkout: WorkoutLog | null
  workoutLoading: boolean
  fetchActivePlan: () => Promise<void>
  fetchTodayWorkout: () => Promise<void>
  addWorkoutLog: (log: Omit<WorkoutLog, 'id' | 'created_at'>) => Promise<void>
  updateWorkoutLog: (id: string, data: Partial<WorkoutLog>) => Promise<void>

  // Sleep
  recentSleep: SleepLog[]
  sleepLoading: boolean
  fetchRecentSleep: () => Promise<void>
  addSleepLog: (log: Omit<SleepLog, 'id' | 'created_at'>) => Promise<void>

  // Supplements
  supplements: Supplement[]
  todaySupplementLogs: SupplementLog[]
  supplementsLoading: boolean
  fetchSupplements: () => Promise<void>
  fetchTodaySupplementLogs: () => Promise<void>
  addSupplement: (supp: Omit<Supplement, 'id' | 'created_at'>) => Promise<void>
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
    const data = db.getProfile()
    set({ profile: cast<UserProfile | null>(data), profileLoading: false })
  },
  updateProfile: async (updates) => {
    const current = db.getProfile() || {}
    const merged = { ...current, ...updates, updated_at: new Date().toISOString() }
    db.setProfile(merged)
    set({ profile: cast<UserProfile>(merged) })
  },

  // Food
  todayFood: [],
  foodLoading: false,
  fetchTodayFood: async () => {
    set({ foodLoading: true })
    const data = db.getFoodByDate(getToday())
    set({ todayFood: cast<FoodEntry[]>(data), foodLoading: false })
  },
  fetchFoodByDate: async (date: string) => {
    const data = db.getFoodByDate(date)
    return cast<FoodEntry[]>(data)
  },
  addFoodEntry: async (entry) => {
    const data = db.addFood(entry as any)
    if (entry.date === getToday()) {
      set({ todayFood: [...get().todayFood, cast<FoodEntry>(data)] })
    }
    db.updateStreak('food', entry.date)
    db.updateStreak('overall', entry.date)
  },
  deleteFoodEntry: async (id) => {
    db.deleteFood(id)
    set({ todayFood: get().todayFood.filter((f) => f.id !== id) })
  },

  // Workout
  activePlan: null,
  todayWorkout: null,
  workoutLoading: false,
  fetchActivePlan: async () => {
    set({ workoutLoading: true })
    const data = db.getActivePlan()
    set({ activePlan: cast<WorkoutPlan | null>(data), workoutLoading: false })
  },
  fetchTodayWorkout: async () => {
    const data = db.getWorkoutByDate(getToday())
    set({ todayWorkout: cast<WorkoutLog | null>(data) })
  },
  addWorkoutLog: async (log) => {
    const data = db.addWorkoutLog(log as any)
    set({ todayWorkout: cast<WorkoutLog>(data) })
    db.updateStreak('workout', getToday())
    db.updateStreak('overall', getToday())
  },
  updateWorkoutLog: async (id, updates) => {
    const data = db.updateWorkoutLog(id, updates as any)
    if (data) set({ todayWorkout: cast<WorkoutLog>(data) })
  },

  // Sleep
  recentSleep: [],
  sleepLoading: false,
  fetchRecentSleep: async () => {
    set({ sleepLoading: true })
    const data = db.getRecentSleep(30)
    set({ recentSleep: cast<SleepLog[]>(data), sleepLoading: false })
  },
  addSleepLog: async (log) => {
    const data = db.addSleepLog(log as any)
    set({ recentSleep: [cast<SleepLog>(data), ...get().recentSleep.filter((s) => s.date !== (log as any).date)] })
    db.updateStreak('sleep', getToday())
    db.updateStreak('overall', getToday())
  },

  // Supplements
  supplements: [],
  todaySupplementLogs: [],
  supplementsLoading: false,
  fetchSupplements: async () => {
    set({ supplementsLoading: true })
    const data = db.getSupplements()
    set({ supplements: cast<Supplement[]>(data), supplementsLoading: false })
  },
  fetchTodaySupplementLogs: async () => {
    const data = db.getSupplementLogsByDate(getToday())
    set({ todaySupplementLogs: cast<SupplementLog[]>(data) })
  },
  addSupplement: async (supp) => {
    const data = db.addSupplement(supp as any)
    set({ supplements: [...get().supplements, cast<Supplement>(data)] })
  },
  toggleSupplementTaken: async (supplementId, date) => {
    db.toggleSupplementLog(supplementId, date)
    const data = db.getSupplementLogsByDate(getToday())
    set({ todaySupplementLogs: cast<SupplementLog[]>(data) })
    // Check if all supplements taken
    const allSupps = db.getSupplements()
    const allLogs = db.getSupplementLogsByDate(date)
    const takenCount = allLogs.filter((l) => l.taken).length
    if (takenCount >= allSupps.length && allSupps.length > 0) {
      db.updateStreak('supplements', date)
      db.updateStreak('overall', date)
    }
  },
  deleteSupplement: async (id) => {
    db.deleteSupplement(id)
    set({ supplements: get().supplements.filter((s) => s.id !== id) })
  },

  // Streaks
  streaks: [],
  achievements: [],
  fetchStreaks: async () => {
    const data = db.getStreaks()
    set({ streaks: cast<Streak[]>(data) })
  },
  fetchAchievements: async () => {
    const data = db.getAchievements()
    set({ achievements: cast<Achievement[]>(data) })
  },

  // UI
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
