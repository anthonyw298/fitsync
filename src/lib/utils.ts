import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function calculateBMR(
  weightLbs: number,
  heightIn: number,
  age: number,
  gender: 'male' | 'female'
): number {
  // Mifflin-St Jeor Equation (convert imperial to metric internally)
  const weightKg = weightLbs * 0.453592
  const heightCm = heightIn * 2.54
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  return Math.round(bmr * (multipliers[activityLevel] || 1.55))
}

export function calculateMacros(
  tdee: number,
  goal: string,
  weightLbs: number
): { calories: number; protein: number; carbs: number; fats: number } {
  let calories = tdee

  switch (goal) {
    case 'cut':
      calories = Math.round(tdee * 0.8) // 20% deficit
      break
    case 'bulk':
      calories = Math.round(tdee * 1.15) // 15% surplus
      break
    case 'maintain':
    default:
      break
  }

  // Protein: 1g per lb bodyweight
  const protein = Math.round(weightLbs)
  // Fats: 25% of calories
  const fats = Math.round((calories * 0.25) / 9)
  // Carbs: remaining calories
  const carbs = Math.round((calories - protein * 4 - fats * 9) / 4)

  return { calories, protein, carbs, fats }
}

// Helper: format height in feet/inches
export function formatHeight(totalInches: number): string {
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${feet}'${inches}"`
}

export function getStreakEmoji(count: number): string {
  if (count >= 100) return '💎'
  if (count >= 30) return '🔥'
  if (count >= 7) return '⚡'
  if (count >= 3) return '✨'
  return '🌱'
}

export function getMacroColor(type: string): string {
  switch (type) {
    case 'protein': return '#8B5CF6'
    case 'carbs': return '#3B82F6'
    case 'fats': return '#F59E0B'
    case 'calories': return '#10B981'
    default: return '#6B7280'
  }
}
