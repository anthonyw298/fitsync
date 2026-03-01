import { NextRequest, NextResponse } from "next/server";

interface MacroInput {
  age: number;
  height_in: number;
  weight_lbs: number;
  gender: "male" | "female";
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitness_goal: "cut" | "maintain" | "bulk";
  workout_days_per_week: number;
  is_workout_day: boolean;
}

interface MacroResult {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr: number;
  tdee: number;
}

const ACTIVITY_MULTIPLIERS: Record<MacroInput["activity_level"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<MacroInput["fitness_goal"], number> = {
  cut: -0.2, // -20%
  maintain: 0,
  bulk: 0.15, // +15%
};

/**
 * Mifflin-St Jeor Equation for Basal Metabolic Rate
 *
 * Converts imperial inputs internally:
 *   weight_kg = weight_lbs * 0.453592
 *   height_cm = height_in * 2.54
 *
 * Male:   BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
 * Female: BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
 */
function calculateBMR(weight_lbs: number, height_in: number, age: number, gender: string): number {
  const weight_kg = weight_lbs * 0.453592;
  const height_cm = height_in * 2.54;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

function calculateMacros(input: MacroInput): MacroResult {
  // Step 1: BMR via Mifflin-St Jeor
  const bmr = calculateBMR(input.weight_lbs, input.height_in, input.age, input.gender);

  // Step 2: TDEE = BMR * activity multiplier
  const activityMultiplier = ACTIVITY_MULTIPLIERS[input.activity_level] ?? 1.55;
  const tdee = bmr * activityMultiplier;

  // Step 3: Adjust for fitness goal
  const goalAdjustment = GOAL_ADJUSTMENTS[input.fitness_goal] ?? 0;
  let targetCalories = tdee * (1 + goalAdjustment);

  // Step 4: Workout day bonus (extra 200-300 calories)
  // Scale the bonus based on workout frequency: more days = lower per-session bonus
  if (input.is_workout_day) {
    const workoutBonus = input.workout_days_per_week >= 5 ? 200 : input.workout_days_per_week >= 3 ? 250 : 300;
    targetCalories += workoutBonus;
  }

  // Step 5: Calculate macro split
  // Protein: 1g per lb body weight
  const protein = Math.round(input.weight_lbs * 1);
  const proteinCalories = protein * 4;

  // Fats: 25% of total calories
  const fatCalories = targetCalories * 0.25;
  const fats = Math.round(fatCalories / 9);

  // Carbs: remaining calories
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbs = Math.max(0, Math.round(carbCalories / 4));

  // Recalculate actual total to account for rounding
  const actualCalories = protein * 4 + carbs * 4 + fats * 9;

  return {
    calories: Math.round(actualCalories),
    protein,
    carbs,
    fats,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}

function validateInput(body: Record<string, unknown>): { valid: true; data: MacroInput } | { valid: false; error: string } {
  const requiredFields = ["age", "height_in", "weight_lbs", "gender", "activity_level", "fitness_goal"];
  const missing = requiredFields.filter((f) => body[f] === undefined || body[f] === null);

  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(", ")}` };
  }

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 13 || age > 120) {
    return { valid: false, error: "age must be a number between 13 and 120" };
  }

  const height_in = Number(body.height_in);
  if (!Number.isFinite(height_in) || height_in < 48 || height_in > 96) {
    return { valid: false, error: "height_in must be a number between 48 and 96 inches" };
  }

  const weight_lbs = Number(body.weight_lbs);
  if (!Number.isFinite(weight_lbs) || weight_lbs < 60 || weight_lbs > 700) {
    return { valid: false, error: "weight_lbs must be a number between 60 and 700 lbs" };
  }

  const gender = String(body.gender).toLowerCase();
  if (gender !== "male" && gender !== "female") {
    return { valid: false, error: "gender must be 'male' or 'female'" };
  }

  const activity_level = String(body.activity_level).toLowerCase();
  const validActivityLevels = ["sedentary", "light", "moderate", "active", "very_active"];
  if (!validActivityLevels.includes(activity_level)) {
    return {
      valid: false,
      error: `activity_level must be one of: ${validActivityLevels.join(", ")}`,
    };
  }

  const fitness_goal = String(body.fitness_goal).toLowerCase();
  const validGoals = ["cut", "maintain", "bulk"];
  if (!validGoals.includes(fitness_goal)) {
    return {
      valid: false,
      error: `fitness_goal must be one of: ${validGoals.join(", ")}`,
    };
  }

  const workout_days_per_week = Number(body.workout_days_per_week ?? 4);
  if (!Number.isFinite(workout_days_per_week) || workout_days_per_week < 0 || workout_days_per_week > 7) {
    return { valid: false, error: "workout_days_per_week must be between 0 and 7" };
  }

  const is_workout_day = Boolean(body.is_workout_day ?? false);

  return {
    valid: true,
    data: {
      age,
      height_in,
      weight_lbs,
      gender: gender as "male" | "female",
      activity_level: activity_level as MacroInput["activity_level"],
      fitness_goal: fitness_goal as MacroInput["fitness_goal"],
      workout_days_per_week: Math.round(workout_days_per_week),
      is_workout_day,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const result = calculateMacros(validation.data);

    return NextResponse.json({
      success: true,
      data: result,
      input: {
        ...validation.data,
        // Echo back interpreted inputs for transparency
      },
      breakdown: {
        protein_calories: result.protein * 4,
        carb_calories: result.carbs * 4,
        fat_calories: result.fats * 9,
        protein_pct: Math.round((result.protein * 4 / result.calories) * 100),
        carb_pct: Math.round((result.carbs * 4 / result.calories) * 100),
        fat_pct: Math.round((result.fats * 9 / result.calories) * 100),
      },
    });
  } catch (error) {
    console.error("Calculate macros error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to calculate macros",
      },
      { status: 500 }
    );
  }
}
