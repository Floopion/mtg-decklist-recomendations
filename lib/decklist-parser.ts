import type { DeckEntry, DeckSection, ParsedDeck, DetectedInput } from "./types";

const ARCHIDEKT_URL_PATTERN =
  /^https?:\/\/(?:www\.)?archidekt\.com\/decks\/(\d+)/;

const CARD_LINE_PATTERN = /^(\d+)x?\s+(.+)$/;

const SECTION_HEADER_PATTERN = /^\/\/\s*(.+)$/;

const SECTION_MAP: Record<string, DeckSection> = {
  commander: "commander",
  commanders: "commander",
  command: "commander",
  mainboard: "mainboard",
  main: "mainboard",
  deck: "mainboard",
  sideboard: "sideboard",
  side: "sideboard",
  maybeboard: "maybeboard",
  maybe: "maybeboard",
  considering: "maybeboard",
};

/**
 * Detect whether the input is a plain text decklist or an Archidekt URL.
 */
export function detectInputType(input: string): DetectedInput {
  const trimmed = input.trim();
  const match = trimmed.match(ARCHIDEKT_URL_PATTERN);

  if (match) {
    return { type: "archidekt-url", deckId: match[1], raw: trimmed };
  }

  return { type: "text", raw: trimmed };
}

/**
 * Parse a plain-text decklist into structured entries.
 *
 * Supports:
 * - "1 Sol Ring" or "1x Sol Ring"
 * - Section headers: "// Commander", "// Sideboard", etc.
 * - Comments starting with #
 * - Blank lines
 */
export function parseDecklistText(text: string): ParsedDeck {
  const lines = text.split("\n");
  const entries: DeckEntry[] = [];
  const errors: ParsedDeck["errors"] = [];
  let currentSection: DeckSection = "mainboard";

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();

    // Skip blank lines and comments
    if (raw === "" || raw.startsWith("#")) {
      continue;
    }

    // Check for section header
    const sectionMatch = raw.match(SECTION_HEADER_PATTERN);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim().toLowerCase();
      const mapped = SECTION_MAP[sectionName];
      if (mapped) {
        currentSection = mapped;
      }
      // Even if we don't recognise the section name, skip the line
      // (it's still a valid section header, just not one we track)
      continue;
    }

    // Try to parse as a card line
    const cardMatch = raw.match(CARD_LINE_PATTERN);
    if (cardMatch) {
      const quantity = parseInt(cardMatch[1], 10);
      const cardName = cardMatch[2].trim();

      if (quantity < 1 || quantity > 99) {
        errors.push({
          line: i + 1,
          text: raw,
          reason: `Invalid quantity: ${quantity}`,
        });
        continue;
      }

      entries.push({ quantity, cardName, section: currentSection });
      continue;
    }

    // Unrecognised line
    errors.push({
      line: i + 1,
      text: raw,
      reason: "Could not parse as a card entry",
    });
  }

  return { entries, errors };
}
