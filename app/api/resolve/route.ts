import { NextResponse } from "next/server";
import { resolveCards } from "@/lib/scryfall";
import { fetchArchidektDeck, ArchidektError } from "@/lib/archidekt";
import { sanitizeDecklistInput } from "@/lib/validators";
import { parseDecklistText, detectInputType } from "@/lib/decklist-parser";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { checkOrigin } from "@/lib/origin";
import type { DeckEntry } from "@/lib/types";

export const runtime = "edge";

interface ResolveRequest {
  input: string;
}

export async function POST(request: Request) {
  const originError = checkOrigin(request);
  if (originError) return originError;

  // Rate limit check
  const rl = await checkRateLimit(request);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body: ResolveRequest = await request.json();

    if (!body.input || typeof body.input !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'input' field" },
        { status: 400 },
      );
    }

    const sanitized = sanitizeDecklistInput(body.input);
    const detected = detectInputType(sanitized);

    let entries: DeckEntry[];
    let deckName: string | undefined;

    if (detected.type === "archidekt-url" && detected.deckId) {
      try {
        const archidekt = await fetchArchidektDeck(detected.deckId);
        entries = archidekt.entries;
        deckName = archidekt.name;
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

    const resolved = await resolveCards(entries);

    return NextResponse.json({
      deckName,
      ...resolved,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
