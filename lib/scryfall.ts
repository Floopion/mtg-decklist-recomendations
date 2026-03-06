import type { ScryfallCard, DeckEntry, ResolvedCard, ResolvedDeck } from "./types";

const SCRYFALL_API = "https://api.scryfall.com";
const BATCH_SIZE = 75; // Scryfall's max per /cards/collection request
const REQUEST_DELAY_MS = 100; // stay well under 10 req/sec

/**
 * Extract the front face name from a double-faced card.
 * Archidekt returns DFC names as "Front // Back" — Scryfall's collection
 * endpoint resolves fine with just the front face name.
 */
function frontFaceName(name: string): string {
  const idx = name.indexOf(" // ");
  return idx === -1 ? name : name.slice(0, idx);
}

interface CollectionRequestIdentifier {
  name: string;
}

interface CollectionResponse {
  data: ScryfallCard[];
  not_found: CollectionRequestIdentifier[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch-resolve card names against Scryfall's /cards/collection endpoint.
 * Sends requests in chunks of 75 (Scryfall's limit) with rate-limit-safe delays.
 */
export async function resolveCards(
  entries: DeckEntry[],
): Promise<ResolvedDeck> {
  // Deduplicate card names (a card can appear in multiple sections but we only
  // need to look it up once)
  const uniqueNames = [...new Set(entries.map((e) => e.cardName))];

  const cardMap = new Map<string, ScryfallCard>();
  const notFoundNames = new Set<string>();

  // Process in batches of 75
  for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
    if (i > 0) await delay(REQUEST_DELAY_MS);

    const batch = uniqueNames.slice(i, i + BATCH_SIZE);
    const identifiers: CollectionRequestIdentifier[] = batch.map((name) => ({
      name: frontFaceName(name),
    }));

    const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "MTGDecklistRecommendations/1.0",
      },
      body: JSON.stringify({ identifiers }),
    });

    if (!res.ok) {
      throw new Error(`Scryfall returned ${res.status}: ${await res.text()}`);
    }

    const data: CollectionResponse = await res.json();

    for (const card of data.data) {
      // Store under the full name AND the front face so DFC lookups match
      cardMap.set(card.name.toLowerCase(), card);
      cardMap.set(frontFaceName(card.name).toLowerCase(), card);
    }

    for (const nf of data.not_found) {
      notFoundNames.add(nf.name.toLowerCase());
    }
  }

  // Map back to the original entries
  const cards: ResolvedCard[] = [];
  const unresolved: DeckEntry[] = [];

  for (const entry of entries) {
    const scryfall =
      cardMap.get(entry.cardName.toLowerCase()) ??
      cardMap.get(frontFaceName(entry.cardName).toLowerCase()) ??
      null;
    if (scryfall) {
      cards.push({ entry, scryfall });
    } else {
      cards.push({ entry, scryfall: null });
      unresolved.push(entry);
    }
  }

  return { cards, unresolved };
}

/**
 * Get the best image URI for a card, handling double-faced cards.
 */
export function getCardImageUri(
  card: ScryfallCard,
  size: "small" | "normal" | "large" = "normal",
): string | null {
  if (card.image_uris) {
    return card.image_uris[size];
  }
  // Double-faced cards store images on card_faces
  if (card.card_faces?.[0]?.image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  return null;
}

/**
 * Get the oracle text for a card, joining faces for DFCs.
 */
export function getOracleText(card: ScryfallCard): string {
  if (card.oracle_text) return card.oracle_text;
  if (card.card_faces) {
    return card.card_faces
      .map((f) => f.oracle_text ?? "")
      .filter(Boolean)
      .join("\n// ---\n");
  }
  return "";
}
