import { NextResponse } from "next/server";
import { resolveCards } from "@/lib/scryfall";
import { fetchArchidektDeck, ArchidektError } from "@/lib/archidekt";
import { sanitizeDecklistInput } from "@/lib/validators";
import { parseDecklistText, detectInputType } from "@/lib/decklist-parser";
import { getRecommendations } from "@/lib/gemini";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { checkOrigin } from "@/lib/origin";
import { lookupNzPrice } from "@/lib/mtgsingles";
import type {
  DeckEntry,
  UserContext,
  CardRecommendation,
  ValidatedRecommendation,
  ValidatedRecommendationResponse,
  ResolvedDeck,
  NzPriceInfo,
} from "@/lib/types";

export const maxDuration = 60;

interface RecommendRequest {
  input: string;
  context?: UserContext;
  resolvedDeck?: ResolvedDeck;
}

/**
 * Validate Gemini's recommendations by resolving card names against Scryfall.
 * Drops any hallucinated card names that Scryfall can't find.
 */
async function validateRecommendations(
  recs: CardRecommendation[],
): Promise<ValidatedRecommendation[]> {
  if (recs.length === 0) return [];

  const entries: DeckEntry[] = recs.map((r) => ({
    quantity: 1,
    cardName: r.card_name,
    section: "mainboard",
  }));

  const resolved = await resolveCards(entries);

  return recs
    .map((rec) => {
      const found = resolved.cards.find(
        (c) =>
          c.entry.cardName.toLowerCase() === rec.card_name.toLowerCase() &&
          c.scryfall !== null,
      );
      return {
        recommendation: rec,
        scryfall: found?.scryfall ?? null,
      };
    })
    .filter((v) => v.scryfall !== null);
}

export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;

  // Rate limit check
  const rl = await checkRateLimit(request);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body: RecommendRequest = await request.json();

    // Use pre-resolved deck from client if available (skips duplicate Scryfall work)
    let resolvedDeck: ResolvedDeck;

    if (body.resolvedDeck && body.resolvedDeck.cards?.length > 0) {
      resolvedDeck = body.resolvedDeck;
    } else if (body.input && typeof body.input === "string") {
      const sanitized = sanitizeDecklistInput(body.input);
      const detected = detectInputType(sanitized);

      let entries: DeckEntry[];

      if (detected.type === "archidekt-url" && detected.deckId) {
        try {
          const archidekt = await fetchArchidektDeck(detected.deckId);
          entries = archidekt.entries;
        } catch (err) {
          const message =
            err instanceof ArchidektError
              ? err.message
              : "Failed to fetch deck from Archidekt";
          return NextResponse.json({ error: message }, { status: 502 });
        }
      } else {
        const parsed = parseDecklistText(sanitized);
        entries = parsed.entries;

        if (entries.length === 0) {
          return NextResponse.json(
            { error: "No valid card entries found in input" },
            { status: 400 },
          );
        }
      }

      resolvedDeck = await resolveCards(entries);
    } else {
      return NextResponse.json(
        { error: "Missing input or resolvedDeck" },
        { status: 400 },
      );
    }

    // Get recommendations from Gemini
    const rawRecs = await getRecommendations(resolvedDeck, body.context);

    // 5. Validate all recommended card names against Scryfall (output validation)
    const [validatedCuts, validatedAdditions, validatedManaBase] =
      await Promise.all([
        validateRecommendations(rawRecs.cuts ?? []),
        validateRecommendations(rawRecs.additions ?? []),
        validateRecommendations(rawRecs.mana_base ?? []),
      ]);

    // Look up NZ prices for additions and mana base (not cuts)
    // Feature-flagged: set ENABLE_NZ_PRICES=true to enable
    const nzEnabled = process.env.ENABLE_NZ_PRICES === "true";
    const nzPriceMap = new Map<string, NzPriceInfo | null>();

    if (nzEnabled) {
      const cardsToPrice = [...validatedAdditions, ...validatedManaBase];
      if (cardsToPrice.length > 0) {
        console.log(`[NZ] Looking up ${cardsToPrice.length} cards...`);
        const results = await Promise.allSettled(
          cardsToPrice.map((v) => lookupNzPrice(v.recommendation.card_name)),
        );
        for (const result of results) {
          if (result.status === "fulfilled") {
            nzPriceMap.set(
              result.value.cardName.toLowerCase(),
              result.value.cheapest
                ? {
                    store: result.value.cheapest.store,
                    price: result.value.cheapest.price,
                    url: result.value.cheapest.url,
                    condition: result.value.cheapest.condition,
                  }
                : null,
            );
          }
        }
        console.log(
          `[NZ] Done. ${nzPriceMap.size} results, ${[...nzPriceMap.values()].filter(Boolean).length} found`,
        );
      }
    }

    const attachNzPrices = (
      recs: ValidatedRecommendation[],
    ): ValidatedRecommendation[] =>
      recs.map((r) => ({
        ...r,
        nzPrice:
          nzPriceMap.get(r.recommendation.card_name.toLowerCase()) ?? null,
      }));

    const response: ValidatedRecommendationResponse = {
      cuts: validatedCuts,
      additions: attachNzPrices(validatedAdditions),
      mana_base: attachNzPrices(validatedManaBase),
      general_notes: rawRecs.general_notes ?? "",
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Recommend error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
