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

const BASE_SYSTEM_PROMPT = `You are a precise nutrition calculator. Your job is to estimate macronutrients as accurately as possible using USDA standard values.

CRITICAL RULES:
1. If the user provides a description of the food and portions, use that as the primary source — not just the image.
2. Calculate macros based on actual portion sizes. Do NOT underestimate.
3. Use standard nutritional data (USDA) for calculations.
4. Return ONLY a valid JSON object with these fields: food_name (string), calories (number), protein_g (number), carbs_g (number), fats_g (number), fiber_g (number), serving_size (string), confidence (number 0-1).
5. No markdown, no explanation, no other text — just the JSON object.`;

interface FoodHints {
  description?: string;
  brand?: string;
  ingredients?: string;
  amount?: string;
  calories?: string;
  protein?: string;
}

function buildUserPrompt(hints?: FoodHints): string {
  const parts: string[] = [];

  if (hints?.description) {
    parts.push(`The user describes this meal as: "${hints.description}"`);
    parts.push("");
    parts.push("Use this description as the PRIMARY source of truth for what the food is and how much there is. The image is secondary — use it only to confirm or supplement the description.");
  } else {
    parts.push("Analyze this food image and provide the nutritional information as JSON.");
  }

  if (hints && Object.keys(hints).filter(k => k !== 'description').length > 0) {
    parts.push("");
    parts.push("Additional details from the user (use these for accuracy):");
    if (hints.brand) parts.push(`- Brand/Restaurant: ${hints.brand}`);
    if (hints.ingredients) parts.push(`- Known ingredients: ${hints.ingredients}`);
    if (hints.amount) parts.push(`- Portion size/amount: ${hints.amount}. IMPORTANT: Calculate all macros based on this exact portion size.`);
    if (hints.calories) parts.push(`- Known calories: ${hints.calories} kcal — use this EXACT value`);
    if (hints.protein) parts.push(`- Known protein: ${hints.protein}g — use this EXACT value`);
  }

  parts.push("");
  parts.push("IMPORTANT: Be accurate with portion sizes. Use standard USDA nutritional data. For reference:");
  parts.push("- 1 cup cooked chicken breast ≈ 140g = ~43g protein, ~0g carbs, ~5g fat, ~230 cal");
  parts.push("- 1 cup cooked white rice ≈ 186g = ~4g protein, ~45g carbs, ~0.4g fat, ~205 cal");
  parts.push("- 1 large egg = ~6g protein, ~0.6g carbs, ~5g fat, ~72 cal");
  parts.push("Scale all values proportionally to the actual portion described or shown.");

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
      const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        // Fallback: just strip the prefix and assume JPEG
        const commaIdx = image.indexOf(",");
        if (commaIdx > 0) {
          mimeType = "image/jpeg";
          base64Data = image.slice(commaIdx + 1);
        } else {
          return NextResponse.json(
            { error: "Invalid data URL format" },
            { status: 400 }
          );
        }
      } else {
        mimeType = match[1];
        base64Data = match[2];
      }
    } else {
      base64Data = image;
      mimeType = inferMimeType(base64Data);
    }

    const userPrompt = buildUserPrompt(hints);
    const imageDataUrl = `data:${mimeType};base64,${base64Data}`;

    // Models to try in order (Llama 4 vision-capable models on Groq)
    const MODELS = [
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
    ];

    let result;
    let lastError: unknown;

    for (const modelId of MODELS) {
      try {
        result = await generateText({
          model: groq(modelId),
          system: BASE_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  image: imageDataUrl,
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
        break; // Success – stop trying models
      } catch (err) {
        lastError = err;
        console.warn(
          `Model ${modelId} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    if (!result) {
      throw lastError ?? new Error("All vision models failed");
    }

    const responseText = result.text;
    const nutritionData = parseNutritionResponse(responseText);

    return NextResponse.json({
      success: true,
      data: nutritionData,
      model: result.response?.modelId ?? MODELS[0],
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
