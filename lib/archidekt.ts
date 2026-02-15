import type { DeckEntry, DeckSection } from "./types";

const ARCHIDEKT_API_BASE = "https://archidekt.com/api/decks";

/** Allowlisted host for SSRF protection. */
const ALLOWED_HOST = "archidekt.com";

const ARCHIDEKT_URL_PATTERN =
  /^https?:\/\/(?:www\.)?archidekt\.com\/decks\/(\d+)/;

export interface ArchidektCard {
  quantity: number;
  card: {
    oracleCard: {
      name: string;
    };
  };
  categories: string[];
}

export interface ArchidektDeckResponse {
  id: number;
  name: string;
  cards: ArchidektCard[];
}

export class ArchidektError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ArchidektError";
  }
}

/**
 * Extract a deck ID from an Archidekt URL.
 * Returns null if the URL isn't a valid Archidekt deck link.
 */
export function extractDeckId(url: string): string | null {
  const match = url.trim().match(ARCHIDEKT_URL_PATTERN);
  return match ? match[1] : null;
}

/**
 * Validate that a URL points to archidekt.com (SSRF guard).
 */
function assertAllowedHost(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ArchidektError("Invalid URL");
  }

  if (parsed.hostname !== ALLOWED_HOST && parsed.hostname !== `www.${ALLOWED_HOST}`) {
    throw new ArchidektError(
      `Blocked: only ${ALLOWED_HOST} is allowed, got ${parsed.hostname}`,
    );
  }
}

/** Map Archidekt category strings to our DeckSection type. */
function mapCategory(categories: string[]): DeckSection {
  const lower = categories.map((c) => c.toLowerCase());
  if (lower.includes("commander")) return "commander";
  if (lower.includes("sideboard")) return "sideboard";
  if (lower.includes("maybeboard")) return "maybeboard";
  return "mainboard";
}

/**
 * Fetch a public deck from Archidekt by its numeric ID.
 * This must only be called server-side.
 */
export async function fetchArchidektDeck(
  deckId: string,
): Promise<{ name: string; entries: DeckEntry[] }> {
  const url = `${ARCHIDEKT_API_BASE}/${deckId}/`;
  assertAllowedHost(url);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 }, // cache for 5 min
  });

  if (res.status === 404) {
    throw new ArchidektError("Deck not found — is it public?", 404);
  }

  if (!res.ok) {
    throw new ArchidektError(
      `Archidekt returned ${res.status}`,
      res.status,
    );
  }

  const data: ArchidektDeckResponse = await res.json();

  const entries: DeckEntry[] = data.cards.map((c) => ({
    quantity: c.quantity,
    cardName: c.card.oracleCard.name,
    section: mapCategory(c.categories),
  }));

  return { name: data.name, entries };
}
