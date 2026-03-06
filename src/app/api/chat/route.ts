import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

interface UserProfile {
  name?: string;
  age?: number;
  weight_kg?: number;
  height_in?: number;
  gender?: string;
  fitness_goal?: string;
  activity_level?: string;
  workout_days_per_week?: number;
  daily_calories?: number;
  daily_protein?: number;
  daily_carbs?: number;
  daily_fats?: number;
}

interface MacroSummary {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealEntry {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  meal_type?: string;
  logged_at?: string;
}

interface WorkoutEntry {
  name: string;
  date?: string;
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: string;
    weight?: number;
  }>;
  duration_minutes?: number;
  notes?: string;
}

interface SleepEntry {
  date?: string;
  hours: number;
  quality?: number;
  notes?: string;
}

interface SupplementEntry {
  name: string;
  dosage?: string;
  timing?: string;
}

interface ChatContext {
  profile?: UserProfile;
  recentMeals?: MealEntry[];
  todayFood?: MacroSummary;
  recentWorkouts?: WorkoutEntry[];
  recentSleep?: SleepEntry[];
  supplements?: SupplementEntry[];
}

interface UIMessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: UIMessagePart[];
}

/** Extract plain text from a message (handles both content string and parts array) */
function extractContent(msg: ChatMessage): string {
  if (msg.content) return msg.content;
  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("");
  }
  return "";
}

function buildSystemPrompt(context: ChatContext): string {
  const sections: string[] = [];

  sections.push(
    `You are FitSync AI, a friendly and knowledgeable fitness and nutrition coach. You provide personalized, evidence-based advice grounded in the user's actual data. Be concise, supportive, and actionable. Use the user's real data to give specific recommendations rather than generic advice. You can answer any question the user asks — whether it's about exercises, nutrition, general knowledge, or just casual conversation. Always be helpful and conversational.`
  );

  // User profile
  if (context.profile) {
    const p = context.profile;
    const profileLines: string[] = [];
    if (p.name) profileLines.push(`Name: ${p.name}`);
    if (p.age) profileLines.push(`Age: ${p.age}`);
    if (p.gender) profileLines.push(`Gender: ${p.gender}`);
    if (p.weight_kg) profileLines.push(`Weight: ${p.weight_kg} kg`);
    if (p.height_in) profileLines.push(`Height: ${p.height_in} inches`);
    if (p.fitness_goal) profileLines.push(`Goal: ${p.fitness_goal}`);
    if (p.activity_level) profileLines.push(`Activity level: ${p.activity_level}`);
    if (p.workout_days_per_week) profileLines.push(`Training days/week: ${p.workout_days_per_week}`);

    const targets: string[] = [];
    if (p.daily_calories) targets.push(`${p.daily_calories} kcal`);
    if (p.daily_protein) targets.push(`${p.daily_protein}g protein`);
    if (p.daily_carbs) targets.push(`${p.daily_carbs}g carbs`);
    if (p.daily_fats) targets.push(`${p.daily_fats}g fats`);
    if (targets.length > 0) profileLines.push(`Daily targets: ${targets.join(", ")}`);

    if (profileLines.length > 0) {
      sections.push(`## User Profile\n${profileLines.join("\n")}`);
    }
  }

  // Today's food intake and remaining macros
  if (context.todayFood) {
    const m = context.todayFood;
    const macroLines = [
      `Consumed today: ${m.calories} kcal | ${m.protein}g protein | ${m.carbs}g carbs | ${m.fats}g fats`,
    ];

    if (context.profile) {
      const p = context.profile;
      const remaining: string[] = [];
      if (p.daily_calories) remaining.push(`${p.daily_calories - m.calories} kcal`);
      if (p.daily_protein) remaining.push(`${p.daily_protein - m.protein}g protein`);
      if (p.daily_carbs) remaining.push(`${p.daily_carbs - m.carbs}g carbs`);
      if (p.daily_fats) remaining.push(`${p.daily_fats - m.fats}g fats`);
      if (remaining.length > 0) {
        macroLines.push(`Remaining: ${remaining.join(" | ")}`);
      }
    }

    sections.push(`## Today's Nutrition\n${macroLines.join("\n")}`);
  }

  if (context.recentMeals && context.recentMeals.length > 0) {
    const mealLines = context.recentMeals.slice(0, 10).map((meal) => {
      const time = meal.logged_at
        ? new Date(meal.logged_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : "";
      const type = meal.meal_type ? `[${meal.meal_type}]` : "";
      return `- ${meal.food_name} ${type} ${time}: ${meal.calories} kcal, ${meal.protein_g}g P / ${meal.carbs_g}g C / ${meal.fats_g}g F`;
    });
    sections.push(`## Recent Meals\n${mealLines.join("\n")}`);
  }

  // Workout history
  if (context.recentWorkouts && context.recentWorkouts.length > 0) {
    const workoutLines = context.recentWorkouts.slice(0, 7).map((w) => {
      const date = w.date || "Unknown date";
      const exerciseCount = w.exercises?.length ?? 0;
      const duration = w.duration_minutes ? `${w.duration_minutes} min` : "";
      let line = `- ${date}: ${w.name}`;
      if (exerciseCount > 0) line += ` (${exerciseCount} exercises)`;
      if (duration) line += ` - ${duration}`;
      if (w.exercises && w.exercises.length > 0) {
        const topExercises = w.exercises.slice(0, 4).map((e) => {
          let detail = e.name;
          if (e.sets && e.reps) detail += ` ${e.sets}x${e.reps}`;
          if (e.weight) detail += ` @ ${e.weight} kg`;
          return detail;
        });
        line += `\n  Exercises: ${topExercises.join(", ")}`;
      }
      return line;
    });
    sections.push(`## Recent Workouts (last 7 days)\n${workoutLines.join("\n")}`);
  }

  // Sleep patterns
  if (context.recentSleep && context.recentSleep.length > 0) {
    const sleepLines = context.recentSleep.slice(0, 7).map((s) => {
      const date = s.date || "Unknown date";
      const quality = s.quality !== undefined ? `quality: ${s.quality}/5` : "";
      let line = `- ${date}: ${s.hours}h`;
      if (quality) line += ` (${quality})`;
      if (s.notes) line += ` - ${s.notes}`;
      return line;
    });

    const avgHours =
      context.recentSleep.reduce((sum, s) => sum + s.hours, 0) / context.recentSleep.length;
    const avgQuality = context.recentSleep
      .filter((s) => s.quality !== undefined)
      .reduce((sum, s, _, arr) => sum + (s.quality ?? 0) / arr.length, 0);

    sleepLines.push(`\nAverage: ${avgHours.toFixed(1)}h/night${avgQuality > 0 ? `, quality: ${avgQuality.toFixed(1)}/5` : ""}`);
    sections.push(`## Recent Sleep\n${sleepLines.join("\n")}`);
  }

  // Supplements
  if (context.supplements && context.supplements.length > 0) {
    const suppLines = context.supplements.map((s) => {
      let line = `- ${s.name}`;
      if (s.dosage) line += ` (${s.dosage})`;
      if (s.timing) line += ` - ${s.timing}`;
      return line;
    });
    sections.push(`## Current Supplements\n${suppLines.join("\n")}`);
  }

  sections.push(
    `## Response Guidelines
- Reference the user's actual data when giving advice (e.g., "You've had X protein so far, you need Y more")
- If their sleep has been poor, factor that into workout/recovery recommendations
- Suggest specific foods or meals to hit remaining macro targets
- Keep responses focused and practical
- Use metric units (kg, cm) unless the user specifies otherwise
- If you don't have enough data to answer confidently, say so`
  );

  return sections.join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { messages, context } = body as {
      messages?: ChatMessage[];
      context?: ChatContext;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'messages' array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(context ?? {});

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: messages
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: extractContent(msg),
        }))
        .filter((msg) => msg.content.length > 0) as Array<{ role: "user"; content: string } | { role: "assistant"; content: string }>,
      maxOutputTokens: 1024,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
