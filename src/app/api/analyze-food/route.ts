import { NextRequest, NextResponse } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

interface NutritionData {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  serving_size: string;
  confidence: number;
}

const FALLBACK_NUTRITION: NutritionData = {
  food_name: "Unknown food",
  calories: 250,
  protein_g: 10,
  carbs_g: 30,
  fats_g: 10,
  fiber_g: 3,
  serving_size: "1 serving (estimated)",
  confidence: 0,
};

const BASE_SYSTEM_PROMPT =
  "You are a nutrition expert. Analyze the food in this image. Return a JSON object with: food_name (string), calories (number), protein_g (number), carbs_g (number), fats_g (number), fiber_g (number), serving_size (string), confidence (number 0-1). Only return valid JSON, no other text.";

interface FoodHints {
  brand?: string;
  ingredients?: string;
  amount?: string;
  calories?: string;
  protein?: string;
}

function buildUserPrompt(hints?: FoodHints): string {
  const parts: string[] = ["Analyze this food image and provide the nutritional information as JSON."];

  if (hints && Object.keys(hints).length > 0) {
    parts.push("");
    parts.push("The user provided these additional details to help with accuracy:");
    if (hints.brand) parts.push(`- Brand/Restaurant: ${hints.brand}`);
    if (hints.ingredients) parts.push(`- Known ingredients: ${hints.ingredients}`);
    if (hints.amount) parts.push(`- Portion size: ${hints.amount}`);
    if (hints.calories) parts.push(`- Known calories: ${hints.calories} kcal (use this exact value)`);
    if (hints.protein) parts.push(`- Known protein: ${hints.protein}g (use this exact value)`);
    parts.push("");
    parts.push("Use the user-provided values where given. For any values not provided, estimate them based on the image and the context above.");
  }

  return parts.join("\n");
}

function parseNutritionResponse(text: string): NutritionData {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text.trim());
    return validateNutritionData(parsed);
  } catch {
    // Try extracting JSON from markdown code block or surrounding text
  }

  // Try extracting from ```json ... ``` blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      return validateNutritionData(parsed);
    } catch {
      // Fall through
    }
  }

  // Try finding a JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateNutritionData(parsed);
    } catch {
      // Fall through
    }
  }

  throw new Error("Could not parse nutrition data from AI response");
}

function validateNutritionData(data: Record<string, unknown>): NutritionData {
  return {
    food_name: typeof data.food_name === "string" ? data.food_name : "Unknown food",
    calories: typeof data.calories === "number" && data.calories >= 0 ? Math.round(data.calories) : 0,
    protein_g: typeof data.protein_g === "number" && data.protein_g >= 0 ? Math.round(data.protein_g * 10) / 10 : 0,
    carbs_g: typeof data.carbs_g === "number" && data.carbs_g >= 0 ? Math.round(data.carbs_g * 10) / 10 : 0,
    fats_g: typeof data.fats_g === "number" && data.fats_g >= 0 ? Math.round(data.fats_g * 10) / 10 : 0,
    fiber_g: typeof data.fiber_g === "number" && data.fiber_g >= 0 ? Math.round(data.fiber_g * 10) / 10 : 0,
    serving_size: typeof data.serving_size === "string" ? data.serving_size : "1 serving",
    confidence: typeof data.confidence === "number" && data.confidence >= 0 && data.confidence <= 1
      ? Math.round(data.confidence * 100) / 100
      : 0.5,
  };
}

function inferMimeType(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
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
    const { image, hints } = body as { image?: string; hints?: FoodHints };

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'image' field. Expected a base64-encoded string." },
        { status: 400 }
      );
    }

    // Strip data URL prefix if present, otherwise use raw base64
    let base64Data: string;
    let mimeType: string;

    if (image.startsWith("data:")) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: "Invalid data URL format" },
          { status: 400 }
        );
      }
      mimeType = match[1];
      base64Data = match[2];
    } else {
      base64Data = image;
      mimeType = inferMimeType(base64Data);
    }

    const userPrompt = buildUserPrompt(hints);

    // Try the 90b model first, fall back to 11b
    let result;
    try {
      result = await generateText({
        model: groq("llama-3.2-90b-vision-preview"),
        system: BASE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: `data:${mimeType};base64,${base64Data}`,
              },
              {
                type: "text",
                text: userPrompt,
              },
            ],
          },
        ],
        maxOutputTokens: 512,
        temperature: 0.1,
      });
    } catch (primaryError) {
      console.warn(
        "90b vision model failed, falling back to 11b:",
        primaryError instanceof Error ? primaryError.message : primaryError
      );

      result = await generateText({
        model: groq("llama-3.2-11b-vision-preview"),
        system: BASE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: `data:${mimeType};base64,${base64Data}`,
              },
              {
                type: "text",
                text: userPrompt,
              },
            ],
          },
        ],
        maxOutputTokens: 512,
        temperature: 0.1,
      });
    }

    const responseText = result.text;
    const nutritionData = parseNutritionResponse(responseText);

    return NextResponse.json({
      success: true,
      data: nutritionData,
      model: result.response?.modelId ?? "llama-3.2-vision",
    });
  } catch (error) {
    console.error("Food analysis error:", error);

    return NextResponse.json({
      success: false,
      data: FALLBACK_NUTRITION,
      error: error instanceof Error ? error.message : "Failed to analyze food image",
      fallback: true,
    });
  }
}
