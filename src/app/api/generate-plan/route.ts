import { NextRequest, NextResponse } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

interface UserProfile {
  age?: number;
  weight_kg?: number;
  height_in?: number;
  gender?: string;
  fitness_goal?: string; // "cut" | "bulk" | "maintain"
  activity_level?: string;
  workout_days_per_week?: number;
  experience_level?: string; // "beginner" | "intermediate" | "advanced"
  injuries?: string[];
  available_equipment?: string[];
}

interface SleepLog {
  date?: string;
  hours: number;
  quality?: number; // 1-5
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  rest_seconds: number;
  notes: string;
}

interface WorkoutDay {
  day: string;
  name: string;
  rest_day: boolean;
  exercises: Exercise[];
}

interface WorkoutPlan {
  days: WorkoutDay[];
  name?: string;
  created_at?: string;
}

interface RecentWorkout {
  date?: string;
  workout_name?: string;
  exercises?: Array<{
    name: string;
    sets: Array<{ reps: number; weight: number; completed: boolean }>;
  }>;
  duration_minutes?: number;
  completed?: boolean;
}

interface NutritionSummary {
  avgDailyCalories: number;
  avgDailyProtein: number;
  daysTracked: number;
}

interface SupplementInfo {
  name: string;
  dosage?: string;
  timing?: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function analyzeSleepQuality(sleepData: SleepLog[]): {
  avgHours: number;
  avgQuality: number;
  recommendation: string;
} {
  if (!sleepData || sleepData.length === 0) {
    return { avgHours: 0, avgQuality: 0, recommendation: "No sleep data available" };
  }

  const recentSleep = sleepData.slice(0, 7);
  const avgHours = recentSleep.reduce((sum, s) => sum + s.hours, 0) / recentSleep.length;
  const qualityEntries = recentSleep.filter((s) => s.quality !== undefined);
  const avgQuality =
    qualityEntries.length > 0
      ? qualityEntries.reduce((sum, s) => sum + (s.quality ?? 0), 0) / qualityEntries.length
      : 0;

  let recommendation: string;
  if (avgHours < 6 || avgQuality < 2.5) {
    recommendation = "POOR - reduce volume by 20-30%, focus on compound movements, avoid failure";
  } else if (avgHours < 7 || avgQuality < 3.5) {
    recommendation = "FAIR - maintain normal volume but reduce intensity by 10%, add extra rest time";
  } else {
    recommendation = "GOOD - full intensity and volume appropriate";
  }

  return { avgHours, avgQuality, recommendation };
}

function summarizeCurrentPlan(plan: WorkoutPlan | null): string {
  if (!plan || !plan.days || plan.days.length === 0) {
    return "No existing plan. Create a fresh program.";
  }

  const trainingDays = plan.days.filter((d) => !d.rest_day);
  const summary = trainingDays
    .map((d) => {
      const exercises = d.exercises
        .slice(0, 3)
        .map((e) => `${e.name} ${e.sets}x${e.reps}${e.weight ? ` @${e.weight} kg` : ""}`)
        .join(", ");
      return `${d.day} (${d.name}): ${exercises}${d.exercises.length > 3 ? ` +${d.exercises.length - 3} more` : ""}`;
    })
    .join("\n");

  return `Current plan (apply progressive overload - increase weight by 2.5-5% or add 1-2 reps where possible):\n${summary}`;
}

function summarizeRecentWorkouts(workouts: RecentWorkout[]): string {
  if (!workouts || workouts.length === 0) {
    return "No recent workout history available.";
  }

  const lines: string[] = [];
  for (const w of workouts.slice(0, 7)) {
    if (!w.exercises || w.exercises.length === 0) continue;
    const exerciseSummaries = w.exercises.slice(0, 4).map((ex) => {
      const completedSets = ex.sets?.filter((s) => s.completed) ?? [];
      const maxWeight = completedSets.length > 0 ? Math.max(...completedSets.map((s) => s.weight)) : 0;
      const avgReps = completedSets.length > 0 ? Math.round(completedSets.reduce((s, c) => s + c.reps, 0) / completedSets.length) : 0;
      return `${ex.name} ${completedSets.length}x${avgReps}${maxWeight > 0 ? ` @${maxWeight}kg` : ""}`;
    }).join(", ");
    const extras = w.exercises.length > 4 ? ` +${w.exercises.length - 4} more` : "";
    lines.push(`${w.date ?? "?"} (${w.workout_name ?? "Workout"}): ${exerciseSummaries}${extras}`);
  }
  return lines.join("\n");
}

function buildPrompt(
  profile: UserProfile,
  sleepData: SleepLog[],
  currentPlan: WorkoutPlan | null,
  recentWorkouts?: RecentWorkout[],
  nutritionSummary?: NutritionSummary | null,
  supplements?: SupplementInfo[]
): string {
  const sleep = analyzeSleepQuality(sleepData);
  const planSummary = summarizeCurrentPlan(currentPlan);
  const daysPerWeek = profile.workout_days_per_week ?? 4;

  const lines: string[] = [];

  lines.push(`Generate a ${daysPerWeek}-day per week workout plan for the following user:`);
  lines.push("");

  // User stats
  if (profile.age) lines.push(`Age: ${profile.age}`);
  if (profile.gender) lines.push(`Gender: ${profile.gender}`);
  if (profile.weight_kg) lines.push(`Weight: ${profile.weight_kg} kg`);
  if (profile.height_in) lines.push(`Height: ${profile.height_in} inches`);
  if (profile.fitness_goal) lines.push(`Goal: ${profile.fitness_goal}`);
  if (profile.experience_level) lines.push(`Experience: ${profile.experience_level}`);
  if (profile.activity_level) lines.push(`Activity level: ${profile.activity_level}`);
  if (profile.injuries && profile.injuries.length > 0) {
    lines.push(`Injuries/limitations: ${profile.injuries.join(", ")}`);
  }
  if (profile.available_equipment && profile.available_equipment.length > 0) {
    lines.push(`Available equipment: ${profile.available_equipment.join(", ")}`);
  }

  lines.push("");
  lines.push(`## Sleep Analysis (last 7 days)`);
  lines.push(`Average: ${sleep.avgHours.toFixed(1)}h/night${sleep.avgQuality > 0 ? `, quality: ${sleep.avgQuality.toFixed(1)}/5` : ""}`);
  lines.push(`Adjustment: ${sleep.recommendation}`);

  // Nutrition context
  if (nutritionSummary && nutritionSummary.daysTracked > 0) {
    lines.push("");
    lines.push(`## Nutrition (last ${nutritionSummary.daysTracked} days)`);
    lines.push(`Average daily intake: ${nutritionSummary.avgDailyCalories} kcal, ${nutritionSummary.avgDailyProtein}g protein`);
    const proteinPerKg = profile.weight_kg ? (nutritionSummary.avgDailyProtein / profile.weight_kg).toFixed(1) : "?";
    lines.push(`Protein per kg body weight: ${proteinPerKg}g/kg`);
    if (profile.weight_kg && nutritionSummary.avgDailyProtein / profile.weight_kg < 1.6) {
      lines.push(`Note: Protein intake is below 1.6g/kg — consider moderate volume to avoid excessive muscle damage while recovery nutrition is suboptimal.`);
    }
  }

  // Supplements context
  if (supplements && supplements.length > 0) {
    lines.push("");
    lines.push(`## Current Supplements`);
    for (const s of supplements) {
      let line = `- ${s.name}`;
      if (s.dosage) line += ` (${s.dosage})`;
      if (s.timing) line += ` — ${s.timing}`;
      lines.push(line);
    }
    // Add supplement-aware training notes
    const suppNames = supplements.map((s) => s.name.toLowerCase());
    if (suppNames.some((n) => n.includes("creatine"))) {
      lines.push(`Note: User takes creatine — can support higher training volume and intensity. Consider slightly higher volume if recovery allows.`);
    }
    if (suppNames.some((n) => n.includes("caffeine") || n.includes("pre-workout") || n.includes("preworkout"))) {
      lines.push(`Note: User takes a stimulant/pre-workout — can support higher intensity sessions. Place hardest compounds early in the workout.`);
    }
    if (suppNames.some((n) => n.includes("protein") || n.includes("whey") || n.includes("casein"))) {
      lines.push(`Note: User supplements protein — factor this into recovery capacity.`);
    }
  }

  // Recent workout history for progressive overload
  if (recentWorkouts && recentWorkouts.length > 0) {
    lines.push("");
    lines.push(`## Recent Workout History (for progressive overload reference)`);
    lines.push(summarizeRecentWorkouts(recentWorkouts));
    lines.push(`Use this data to inform progressive overload: increase weight by 2.5-5% or add 1-2 reps where the user has been consistently completing all prescribed reps.`);
  }

  lines.push("");
  lines.push(`## Previous Plan`);
  lines.push(planSummary);

  lines.push("");
  lines.push(`## Requirements`);
  lines.push(`- Assign exactly ${daysPerWeek} training days and ${7 - daysPerWeek} rest days across Mon-Sun`);
  lines.push(`- Space training days with adequate rest between same muscle groups`);

  if (profile.fitness_goal === "cut") {
    lines.push("- Goal is cutting: prioritize compound movements, moderate volume, maintain strength");
    lines.push("- Include 1-2 higher-rep metabolic finishers per session");
  } else if (profile.fitness_goal === "bulk") {
    lines.push("- Goal is bulking: higher volume, progressive overload, include both compound and isolation");
    lines.push("- Target 15-20 sets per muscle group per week");
  } else {
    lines.push("- Goal is maintenance: balanced volume and intensity");
  }

  lines.push("- Each training day should have 5-8 exercises");
  lines.push("- Include warm-up sets in notes where appropriate");
  lines.push("- Provide specific rest periods based on exercise type (60-90s for isolation, 90-180s for compounds)");

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are an expert strength and conditioning coach. Generate a weekly workout plan as a JSON array.

Return ONLY a valid JSON array of 7 WorkoutDay objects (one per day of the week, Monday through Sunday). No other text, no markdown, no explanations.

Each training day object:
{
  "day": "Monday",
  "name": "Push Day",
  "rest_day": false,
  "exercises": [
    {
      "name": "Bench Press",
      "sets": 4,
      "reps": "8-10",
      "weight": null,
      "rest_seconds": 90,
      "notes": "2 warm-up sets first"
    }
  ]
}

Each rest day object:
{
  "day": "Wednesday",
  "name": "Rest",
  "rest_day": true,
  "exercises": []
}

Rules:
- Return exactly 7 day objects, Monday through Sunday
- weight should be null (the user will fill in their own weights)
- reps should be a string like "8-10" or "12" or "AMRAP" or "30 sec"
- notes can include cues, warm-up instructions, tempo, or be empty string
- Choose proven, effective exercises for the stated goal`;

function generateFallbackPlan(daysPerWeek: number): WorkoutDay[] {
  const templates: Record<number, WorkoutDay[]> = {
    3: [
      {
        day: "Monday",
        name: "Full Body A",
        rest_day: false,
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "6-8", weight: null, rest_seconds: 150, notes: "2 warm-up sets" },
          { name: "Bench Press", sets: 4, reps: "6-8", weight: null, rest_seconds: 120, notes: "" },
          { name: "Barbell Row", sets: 3, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Overhead Press", sets: 3, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Romanian Deadlift", sets: 3, reps: "10-12", weight: null, rest_seconds: 90, notes: "" },
          { name: "Plank", sets: 3, reps: "45 sec", weight: null, rest_seconds: 60, notes: "" },
        ],
      },
      { day: "Tuesday", name: "Rest", rest_day: true, exercises: [] },
      {
        day: "Wednesday",
        name: "Full Body B",
        rest_day: false,
        exercises: [
          { name: "Deadlift", sets: 4, reps: "5", weight: null, rest_seconds: 180, notes: "2 warm-up sets" },
          { name: "Incline Dumbbell Press", sets: 3, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Pull-ups", sets: 3, reps: "6-10", weight: null, rest_seconds: 90, notes: "Use band if needed" },
          { name: "Leg Press", sets: 3, reps: "10-12", weight: null, rest_seconds: 90, notes: "" },
          { name: "Lateral Raises", sets: 3, reps: "12-15", weight: null, rest_seconds: 60, notes: "" },
          { name: "Cable Crunches", sets: 3, reps: "12-15", weight: null, rest_seconds: 60, notes: "" },
        ],
      },
      { day: "Thursday", name: "Rest", rest_day: true, exercises: [] },
      {
        day: "Friday",
        name: "Full Body C",
        rest_day: false,
        exercises: [
          { name: "Front Squat", sets: 4, reps: "6-8", weight: null, rest_seconds: 150, notes: "2 warm-up sets" },
          { name: "Dumbbell Bench Press", sets: 3, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Seated Cable Row", sets: 3, reps: "10-12", weight: null, rest_seconds: 90, notes: "" },
          { name: "Dumbbell Shoulder Press", sets: 3, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Leg Curl", sets: 3, reps: "10-12", weight: null, rest_seconds: 60, notes: "" },
          { name: "Hanging Leg Raise", sets: 3, reps: "10-15", weight: null, rest_seconds: 60, notes: "" },
        ],
      },
      { day: "Saturday", name: "Rest", rest_day: true, exercises: [] },
      { day: "Sunday", name: "Rest", rest_day: true, exercises: [] },
    ],
    4: [
      {
        day: "Monday",
        name: "Upper Body",
        rest_day: false,
        exercises: [
          { name: "Bench Press", sets: 4, reps: "6-8", weight: null, rest_seconds: 120, notes: "2 warm-up sets" },
          { name: "Barbell Row", sets: 4, reps: "6-8", weight: null, rest_seconds: 120, notes: "" },
          { name: "Overhead Press", sets: 3, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Pull-ups", sets: 3, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Dumbbell Curl", sets: 3, reps: "10-12", weight: null, rest_seconds: 60, notes: "" },
          { name: "Tricep Pushdown", sets: 3, reps: "10-12", weight: null, rest_seconds: 60, notes: "" },
        ],
      },
      {
        day: "Tuesday",
        name: "Lower Body",
        rest_day: false,
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "6-8", weight: null, rest_seconds: 150, notes: "2 warm-up sets" },
          { name: "Romanian Deadlift", sets: 3, reps: "8-10", weight: null, rest_seconds: 120, notes: "" },
          { name: "Leg Press", sets: 3, reps: "10-12", weight: null, rest_seconds: 90, notes: "" },
          { name: "Leg Curl", sets: 3, reps: "10-12", weight: null, rest_seconds: 60, notes: "" },
          { name: "Calf Raises", sets: 4, reps: "12-15", weight: null, rest_seconds: 60, notes: "" },
          { name: "Plank", sets: 3, reps: "60 sec", weight: null, rest_seconds: 60, notes: "" },
        ],
      },
      { day: "Wednesday", name: "Rest", rest_day: true, exercises: [] },
      {
        day: "Thursday",
        name: "Upper Body",
        rest_day: false,
        exercises: [
          { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Seated Cable Row", sets: 4, reps: "8-10", weight: null, rest_seconds: 90, notes: "" },
          { name: "Lateral Raises", sets: 3, reps: "12-15", weight: null, rest_seconds: 60, notes: "" },
          { name: "Face Pulls", sets: 3, reps: "12-15", weight: null, rest_seconds: 60, notes: "" },
          { name: "Hammer Curls", sets: 3, reps: "10-12", weight: null, rest_seconds: 60, notes: "" },
          { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", weight: null, rest_seconds: 60, notes: "" },
        ],
      },
      {
        day: "Friday",
        name: "Lower Body",
        rest_day: false,
        exercises: [
          { name: "Deadlift", sets: 4, reps: "5", weight: null, rest_seconds: 180, notes: "2 warm-up sets" },
          { name: "Front Squat", sets: 3, reps: "8-10", weight: null, rest_seconds: 120, notes: "" },
          { name: "Walking Lunges", sets: 3, reps: "12 each", weight: null, rest_seconds: 90, notes: "" },
          { name: "Leg Extension", sets: 3, reps: "12-15", weight: null, rest_seconds: 60, notes: "" },
          { name: "Seated Calf Raises", sets: 4, reps: "12-15", weight: null, rest_seconds: 60, notes: "" },
          { name: "Hanging Leg Raise", sets: 3, reps: "10-15", weight: null, rest_seconds: 60, notes: "" },
        ],
      },
      { day: "Saturday", name: "Rest", rest_day: true, exercises: [] },
      { day: "Sunday", name: "Rest", rest_day: true, exercises: [] },
    ],
  };

  // Default to 4-day split if we don't have a specific template
  return templates[daysPerWeek] ?? templates[4]!;
}

function parsePlanResponse(text: string): WorkoutDay[] {
  // Try direct parse
  try {
    const parsed = JSON.parse(text.trim());
    const days = Array.isArray(parsed) ? parsed : parsed.days ?? parsed.plan;
    if (Array.isArray(days)) return validatePlan(days);
  } catch {
    // Fall through
  }

  // Try extracting from code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      const days = Array.isArray(parsed) ? parsed : parsed.days ?? parsed.plan;
      if (Array.isArray(days)) return validatePlan(days);
    } catch {
      // Fall through
    }
  }

  // Try finding a JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return validatePlan(parsed);
    } catch {
      // Fall through
    }
  }

  throw new Error("Could not parse workout plan from AI response");
}

function validatePlan(days: Record<string, unknown>[]): WorkoutDay[] {
  return days.map((day, index) => ({
    day: typeof day.day === "string" ? day.day : DAYS_OF_WEEK[index] ?? `Day ${index + 1}`,
    name: typeof day.name === "string" ? day.name : "Workout",
    rest_day: Boolean(day.rest_day),
    exercises: Array.isArray(day.exercises)
      ? day.exercises.map((ex: Record<string, unknown>) => ({
          name: typeof ex.name === "string" ? ex.name : "Exercise",
          sets: typeof ex.sets === "number" ? ex.sets : 3,
          reps: typeof ex.reps === "string" ? ex.reps : String(ex.reps ?? "8-10"),
          weight: typeof ex.weight === "number" ? ex.weight : null,
          rest_seconds: typeof ex.rest_seconds === "number" ? ex.rest_seconds : 90,
          notes: typeof ex.notes === "string" ? ex.notes : "",
        }))
      : [],
  }));
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      profile,
      sleepData,
      currentPlan,
      recentWorkouts,
      nutritionSummary,
      supplements,
    } = body as {
      profile?: UserProfile;
      sleepData?: SleepLog[];
      currentPlan?: WorkoutPlan | null;
      recentWorkouts?: RecentWorkout[];
      nutritionSummary?: NutritionSummary | null;
      supplements?: SupplementInfo[];
    };

    if (!profile) {
      return NextResponse.json(
        { error: "Missing 'profile' in request body" },
        { status: 400 }
      );
    }

    const userPrompt = buildPrompt(profile, sleepData ?? [], currentPlan ?? null, recentWorkouts, nutritionSummary, supplements);

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 4096,
      temperature: 0.3,
    });

    const plan = parsePlanResponse(result.text);

    return NextResponse.json({
      success: true,
      plan,
      sleep_analysis: analyzeSleepQuality(sleepData ?? []),
      model: result.response?.modelId ?? "llama-3.3-70b-versatile",
    });
  } catch (error) {
    console.error("Generate plan error:", error);

    const body = await request.clone().json().catch(() => ({}));
    const daysPerWeek = (body as Record<string, unknown>)?.profile
      ? ((body as Record<string, Record<string, unknown>>).profile.workout_days_per_week as number) ?? 4
      : 4;

    return NextResponse.json({
      success: false,
      plan: generateFallbackPlan(daysPerWeek),
      error: error instanceof Error ? error.message : "Failed to generate plan",
      fallback: true,
    });
  }
}
