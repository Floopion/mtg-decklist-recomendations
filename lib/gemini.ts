import type { ResolvedDeck, UserContext, RecommendationResponse } from "./types";
import { analyzeDeck, formatAnalysis, formatCardList } from "./deck-analysis";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

function getModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

const SYSTEM_INSTRUCTION = `You are an experienced Commander/EDH deck-building advisor.
Your role is to analyze Commander decks and provide specific, actionable recommendations.

RULES:
- Only suggest cards that are legal in the Commander format.
- Only suggest cards within the commander's color identity.
- Use the provided Scryfall card data as your source of truth for the current deck.
- Do not invent card names or abilities. Only recommend real Magic: The Gathering cards.
- Consider the user's stated power level and budget constraints if provided.
- Focus on actionable advice: specific cards to cut, specific cards to add, and why.
- When suggesting a replacement, explain why the new card is better for this deck.

OUTPUT FORMAT:
Respond with ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "cuts": [
    { "card_name": "Card Name", "reason": "Why to cut this", "category": "category" }
  ],
  "additions": [
    { "card_name": "Card Name", "reason": "Why to add this", "category": "category", "replaces": "Optional card it replaces" }
  ],
  "mana_base": [
    { "card_name": "Card Name", "reason": "Why this land/mana fix", "category": "mana_base" }
  ],
  "general_notes": "Overall deck assessment and strategic advice."
}

Valid categories: ramp, removal, card_draw, board_wipe, protection, win_condition, mana_base, synergy, general

Aim for 5-10 cuts, 5-10 additions, and 2-5 mana base suggestions.`;

function buildUserPrompt(
  deck: ResolvedDeck,
  context?: UserContext,
): string {
  const analysis = analyzeDeck(deck);
  const analysisText = formatAnalysis(analysis);
  const cardList = formatCardList(deck);

  const parts: string[] = [];

  parts.push("=== DECK ANALYSIS ===");
  parts.push(analysisText);
  parts.push("");

  if (context) {
    parts.push("=== USER PREFERENCES ===");
    if (context.powerLevel) {
      const labels: Record<string, string> = {
        casual: "Casual (fun, thematic, not trying to win fast)",
        focused: "Focused (has a clear game plan, some synergy)",
        optimized: "Optimized (efficient, strong synergy, consistent)",
        cedh: "Competitive EDH (max power, combo-oriented)",
      };
      parts.push(`Power Level: ${labels[context.powerLevel]}`);
    }
    if (context.budget) {
      const labels: Record<string, string> = {
        no_limit: "No budget limit",
        under_50: "Under $50 per card",
        under_25: "Under $25 per card",
        under_5: "Under $5 per card",
        under_1: "Under $1 per card",
      };
      parts.push(`Budget: ${labels[context.budget]}`);
    }
    if (context.strategy) {
      parts.push(`Strategy/Theme: ${context.strategy}`);
    }
    if (context.petCards && context.petCards.length > 0) {
      parts.push(`Pet Cards (DO NOT suggest cutting these): ${context.petCards.join(", ")}`);
    }
    parts.push("");
  }

  parts.push("=== FULL CARD LIST (Scryfall-verified data) ===");
  parts.push("<USER_DECKLIST>");
  parts.push(cardList);
  parts.push("</USER_DECKLIST>");
  parts.push("");
  parts.push(
    "Analyze this Commander deck and provide recommendations for cuts, additions, and mana base improvements.",
  );

  return parts.join("\n");
}

/**
 * Stream recommendations from Gemini Flash.
 * Returns a ReadableStream of text chunks.
 */
export async function streamRecommendations(
  deck: ResolvedDeck,
  context?: UserContext,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const userPrompt = buildUserPrompt(deck, context);

  const model = getModel();
  const res = await fetch(`${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 16384,
        thinkingConfig: {
          thinkingBudget: 4096,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini returned ${res.status}: ${text}`);
  }

  if (!res.body) {
    throw new Error("Gemini returned no response body");
  }

  return res.body;
}

/**
 * Call Gemini and return the full response (non-streaming, for output validation).
 */
export async function getRecommendations(
  deck: ResolvedDeck,
  context?: UserContext,
): Promise<RecommendationResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const userPrompt = buildUserPrompt(deck, context);

  const model = getModel();
  const res = await fetch(
    `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          // Cap thinking tokens so they don't eat the output budget
          // (Gemini 2.5-flash uses "thinking" by default)
          thinkingConfig: {
            thinkingBudget: 4096,
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini returned ${res.status}: ${text}`);
  }

  const data = await res.json();

  console.log("[Gemini] Full response structure:", JSON.stringify(data, null, 2).slice(0, 2000));

  const rawText: string =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!rawText) {
    console.error("[Gemini] No text in response. Candidates:", JSON.stringify(data.candidates, null, 2));
    throw new Error("Gemini returned an empty response");
  }

  console.log("[Gemini] Raw text (first 500 chars):", rawText.slice(0, 500));

  // Strip markdown code fences if present
  const cleaned = rawText.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  try {
    return JSON.parse(cleaned) as RecommendationResponse;
  } catch (err) {
    console.error("[Gemini] JSON parse failed. Cleaned text:", cleaned.slice(0, 1000));
    throw new Error(`Failed to parse Gemini response as JSON: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}
