/**
 * Local storage database layer.
 * Drop-in replacement for Supabase — all data lives in localStorage.
 * Each "table" is a JSON array stored under a key.
 */

function generateId(): string {
  return crypto.randomUUID()
}

function getTable<T>(table: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`fitsync_${table}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setTable<T>(table: string, data: T[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`fitsync_${table}`, JSON.stringify(data))
}

function getSingleton<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`fitsync_${key}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setSingleton<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`fitsync_${key}`, JSON.stringify(data))
}

// ─── Generic CRUD ────────────────────────────────────────────────────────────

export const db = {
  // ── Profile (singleton) ──────────────────────────────────────────────────
  getProfile: () => getSingleton<Record<string, unknown>>('profile'),
  setProfile: (data: Record<string, unknown>) => setSingleton('profile', data),

  // ── Food Entries ─────────────────────────────────────────────────────────
  getFoodByDate: (date: string) => {
    const all = getTable<Record<string, unknown>>('food_entries')
    return all
      .filter((e) => e.date === date)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  },

  getFoodByDateRange: (startDate: string, endDate: string) => {
    const all = getTable<Record<string, unknown>>('food_entries')
    return all.filter((e) => String(e.date) >= startDate && String(e.date) <= endDate)
  },

  addFood: (entry: Record<string, unknown>) => {
    const all = getTable<Record<string, unknown>>('food_entries')
    const newEntry = { ...entry, id: generateId(), created_at: new Date().toISOString() }
    all.push(newEntry)
    setTable('food_entries', all)
    return newEntry
  },

  deleteFood: (id: string) => {
    const all = getTable<Record<string, unknown>>('food_entries')
    setTable('food_entries', all.filter((e) => e.id !== id))
  },

  // ── Workout Plans ───────────────────────────────────────────────────────
  getActivePlan: () => {
    const all = getTable<Record<string, unknown>>('workout_plans')
    return all
      .filter((p) => p.active)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null
  },

  savePlan: (plan: Record<string, unknown>) => {
    const all = getTable<Record<string, unknown>>('workout_plans')
    // Deactivate old plans
    const updated = all.map((p) => ({ ...p, active: false }))
    const newPlan = { ...plan, id: generateId(), active: true, created_at: new Date().toISOString() }
    updated.push(newPlan)
    setTable('workout_plans', updated)
    return newPlan
  },

  // ── Workout Logs ────────────────────────────────────────────────────────
  getWorkoutByDate: (date: string) => {
    const all = getTable<Record<string, unknown>>('workout_logs')
    return all
      .filter((l) => l.date === date)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null
  },

  getRecentWorkouts: (limit = 50) => {
    const all = getTable<Record<string, unknown>>('workout_logs')
    return all
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, limit)
  },

  addWorkoutLog: (log: Record<string, unknown>) => {
    const all = getTable<Record<string, unknown>>('workout_logs')
    // Upsert: replace existing entry for same date
    const existingIdx = all.findIndex((l) => l.date === log.date)
    const entry = { ...log, id: existingIdx >= 0 ? all[existingIdx].id : generateId(), created_at: existingIdx >= 0 ? all[existingIdx].created_at : new Date().toISOString() }
    if (existingIdx >= 0) {
      all[existingIdx] = entry
    } else {
      all.push(entry)
    }
    setTable('workout_logs', all)
    return entry
  },

  updateWorkoutLog: (id: string, updates: Record<string, unknown>) => {
    const all = getTable<Record<string, unknown>>('workout_logs')
    const idx = all.findIndex((l) => l.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates }
      setTable('workout_logs', all)
      return all[idx]
    }
    return null
  },

  // ── Sleep Logs ──────────────────────────────────────────────────────────
  getRecentSleep: (limit = 30) => {
    const all = getTable<Record<string, unknown>>('sleep_logs')
    return all
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, limit)
  },

  addSleepLog: (log: Record<string, unknown>) => {
    const all = getTable<Record<string, unknown>>('sleep_logs')
    // Upsert: replace existing entry for same date
    const existingIdx = all.findIndex((l) => l.date === log.date)
    const entry = { ...log, id: existingIdx >= 0 ? all[existingIdx].id : generateId(), created_at: existingIdx >= 0 ? all[existingIdx].created_at : new Date().toISOString() }
    if (existingIdx >= 0) {
      all[existingIdx] = entry
    } else {
      all.push(entry)
    }
    setTable('sleep_logs', all)
    return entry
  },

  // ── Supplements ─────────────────────────────────────────────────────────
  getSupplements: () => {
    const all = getTable<Record<string, unknown>>('supplements')
    return all.filter((s) => s.active !== false)
  },

  addSupplement: (supp: Record<string, unknown>) => {
    const all = getTable<Record<string, unknown>>('supplements')
    const newSupp = { ...supp, id: generateId(), active: true, created_at: new Date().toISOString() }
    all.push(newSupp)
    setTable('supplements', all)
    return newSupp
  },

  deleteSupplement: (id: string) => {
    const all = getTable<Record<string, unknown>>('supplements')
    setTable('supplements', all.map((s) => (s.id === id ? { ...s, active: false } : s)))
  },

  getSupplementLogsByDate: (date: string) => {
    const all = getTable<Record<string, unknown>>('supplement_logs')
    return all.filter((l) => l.date === date)
  },

  toggleSupplementLog: (supplementId: string, date: string) => {
    const all = getTable<Record<string, unknown>>('supplement_logs')
    const existing = all.find((l) => l.supplement_id === supplementId && l.date === date)

    if (existing) {
      const newTaken = !existing.taken
      const updated = all.map((l) =>
        l.id === existing.id
          ? { ...l, taken: newTaken, taken_at: newTaken ? new Date().toISOString() : null }
          : l
      )
      setTable('supplement_logs', updated)
      return updated.find((l) => l.id === existing.id)!
    } else {
      const newLog = {
        id: generateId(),
        supplement_id: supplementId,
        date,
        taken: true,
        taken_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      all.push(newLog)
      setTable('supplement_logs', all)
      return newLog
    }
  },

  // ── Streaks ─────────────────────────────────────────────────────────────
  getStreaks: () => {
    let streaks = getSingleton<Record<string, unknown>[]>('streaks')
    if (!streaks) {
      streaks = [
        { id: generateId(), streak_type: 'overall', current_count: 0, best_count: 0, last_logged_date: null },
        { id: generateId(), streak_type: 'workout', current_count: 0, best_count: 0, last_logged_date: null },
        { id: generateId(), streak_type: 'food', current_count: 0, best_count: 0, last_logged_date: null },
        { id: generateId(), streak_type: 'sleep', current_count: 0, best_count: 0, last_logged_date: null },
        { id: generateId(), streak_type: 'supplements', current_count: 0, best_count: 0, last_logged_date: null },
      ]
      setSingleton('streaks', streaks)
    }
    return streaks
  },

  updateStreak: (type: string, date: string) => {
    const streaks = db.getStreaks()
    const streak = streaks.find((s) => s.streak_type === type)
    if (!streak) return

    const today = date
    const lastDate = streak.last_logged_date as string | null

    if (lastDate === today) return // Already logged today

    // Check if consecutive (yesterday)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (lastDate === yesterdayStr || !lastDate) {
      streak.current_count = ((streak.current_count as number) || 0) + 1
    } else {
      streak.current_count = 1 // Reset
    }

    streak.best_count = Math.max(streak.best_count as number, streak.current_count as number)
    streak.last_logged_date = today
    streak.updated_at = new Date().toISOString()

    setSingleton('streaks', streaks)
  },

  // ── Achievements ────────────────────────────────────────────────────────
  getAchievements: () => {
    let achievements = getSingleton<Record<string, unknown>[]>('achievements')
    if (!achievements) {
      achievements = [
        { id: generateId(), badge_name: 'First Scan', badge_icon: '📸', description: 'Analyze your first food photo', unlocked_at: null, criteria: { type: 'food_scan', count: 1 } },
        { id: generateId(), badge_name: 'Week Warrior', badge_icon: '⚡', description: '7-day logging streak', unlocked_at: null, criteria: { type: 'streak', count: 7 } },
        { id: generateId(), badge_name: 'Month Master', badge_icon: '🔥', description: '30-day logging streak', unlocked_at: null, criteria: { type: 'streak', count: 30 } },
        { id: generateId(), badge_name: 'Century Club', badge_icon: '💎', description: '100-day logging streak', unlocked_at: null, criteria: { type: 'streak', count: 100 } },
        { id: generateId(), badge_name: 'Macro Master', badge_icon: '🎯', description: 'Hit macro targets 7 days straight', unlocked_at: null, criteria: { type: 'macro_streak', count: 7 } },
        { id: generateId(), badge_name: 'Iron Consistency', badge_icon: '🏋️', description: 'Complete every workout for a month', unlocked_at: null, criteria: { type: 'workout_streak', count: 30 } },
        { id: generateId(), badge_name: 'Sleep King', badge_icon: '👑', description: '7+ hours sleep for 14 days straight', unlocked_at: null, criteria: { type: 'sleep_streak', count: 14 } },
        { id: generateId(), badge_name: 'Supplement Stack', badge_icon: '💊', description: 'Take all supplements for 7 days', unlocked_at: null, criteria: { type: 'supplement_streak', count: 7 } },
      ]
      setSingleton('achievements', achievements)
    }
    return achievements
  },

  // ── Chat History ────────────────────────────────────────────────────────
  getChatHistory: (limit = 50) => {
    const all = getTable<Record<string, unknown>>('chat_history')
    return all
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .slice(-limit)
  },

  addChatMessage: (message: Record<string, unknown>) => {
    const all = getTable<Record<string, unknown>>('chat_history')
    const newMsg = { ...message, id: generateId(), created_at: new Date().toISOString() }
    all.push(newMsg)
    setTable('chat_history', all)
    return newMsg
  },

  // ── Reset ───────────────────────────────────────────────────────────────
  resetAll: () => {
    if (typeof window === 'undefined') return
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('fitsync_'))
    keys.forEach((k) => localStorage.removeItem(k))
  },

  // ── Photo Storage (base64 in localStorage) ─────────────────────────────
  savePhoto: (base64: string): string => {
    const id = generateId()
    if (typeof window !== 'undefined') {
      localStorage.setItem(`fitsync_photo_${id}`, base64)
    }
    return id
  },

  getPhoto: (id: string): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`fitsync_photo_${id}`)
  },
}
