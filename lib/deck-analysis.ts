import type { ResolvedDeck, DeckAnalysis, ScryfallCard } from "./types";
import { getOracleText } from "./scryfall";

const RAMP_KEYWORDS = [
  "add {",
  "add one mana",
  "add two mana",
  "add three mana",
  "search your library for a basic land",
  "search your library for a land",
  "put it onto the battlefield tapped",
  "mana of any color",
  "mana of any type",
];

function isLand(card: ScryfallCard): boolean {
  return card.type_line.toLowerCase().includes("land");
}

function isRamp(card: ScryfallCard): boolean {
  if (isLand(card)) return false;
  const text = getOracleText(card).toLowerCase();
  return RAMP_KEYWORDS.some((kw) => text.includes(kw));
}

function getCardType(card: ScryfallCard): string {
  const typeLine = card.type_line.toLowerCase();
  if (typeLine.includes("creature")) return "Creature";
  if (typeLine.includes("planeswalker")) return "Planeswalker";
  if (typeLine.includes("instant")) return "Instant";
  if (typeLine.includes("sorcery")) return "Sorcery";
  if (typeLine.includes("enchantment")) return "Enchantment";
  if (typeLine.includes("artifact")) return "Artifact";
  if (typeLine.includes("land")) return "Land";
  return "Other";
}

function getCmcBucket(cmc: number): string {
  if (cmc >= 7) return "7+";
  return String(Math.floor(cmc));
}

/**
 * Analyse a resolved deck to produce structured data for the Gemini prompt.
 */
export function analyzeDeck(deck: ResolvedDeck): DeckAnalysis {
  const resolvedCards = deck.cards.filter((c) => c.scryfall !== null);

  // Find commander
  const commanderCards = deck.cards.filter(
    (c) => c.entry.section === "commander" && c.scryfall,
  );
  const commanderName =
    commanderCards.length > 0
      ? commanderCards.map((c) => c.scryfall!.name).join(" + ")
      : null;

  // Colour identity (union of all cards, but primarily from commander)
  const colorIdentity = commanderCards.length > 0
    ? [...new Set(commanderCards.flatMap((c) => c.scryfall!.color_identity))]
    : [...new Set(resolvedCards.flatMap((c) => c.scryfall!.color_identity))];

  // Total cards
  const totalCards = deck.cards.reduce((sum, c) => sum + c.entry.quantity, 0);

  // Mana curve (excluding lands)
  const manaCurve: Record<string, number> = {};
  for (const c of resolvedCards) {
    if (isLand(c.scryfall!)) continue;
    const bucket = getCmcBucket(c.scryfall!.cmc);
    manaCurve[bucket] = (manaCurve[bucket] ?? 0) + c.entry.quantity;
  }

  // Type distribution
  const typeDistribution: Record<string, number> = {};
  for (const c of resolvedCards) {
    const type = getCardType(c.scryfall!);
    typeDistribution[type] =
      (typeDistribution[type] ?? 0) + c.entry.quantity;
  }

  // Land & ramp counts
  let landCount = 0;
  let rampCount = 0;
  for (const c of resolvedCards) {
    if (isLand(c.scryfall!)) landCount += c.entry.quantity;
    if (isRamp(c.scryfall!)) rampCount += c.entry.quantity;
  }

  return {
    commanderName,
    colorIdentity,
    totalCards,
    manaCurve,
    typeDistribution,
    landCount,
    rampCount,
  };
}

/**
 * Format the deck analysis into a human-readable string for the prompt.
 */
export function formatAnalysis(analysis: DeckAnalysis): string {
  const lines: string[] = [];

  if (analysis.commanderName) {
    lines.push(`Commander: ${analysis.commanderName}`);
  }
  lines.push(`Color Identity: ${analysis.colorIdentity.join("") || "Colorless"}`);
  lines.push(`Total Cards: ${analysis.totalCards}`);
  lines.push(`Lands: ${analysis.landCount}`);
  lines.push(`Ramp Sources: ${analysis.rampCount}`);
  lines.push("");

  lines.push("Mana Curve (excluding lands):");
  const cmcKeys = ["0", "1", "2", "3", "4", "5", "6", "7+"];
  for (const key of cmcKeys) {
    const count = analysis.manaCurve[key] ?? 0;
    lines.push(`  ${key} CMC: ${count}`);
  }
  lines.push("");

  lines.push("Card Type Distribution:");
  for (const [type, count] of Object.entries(analysis.typeDistribution).sort(
    (a, b) => b[1] - a[1],
  )) {
    lines.push(`  ${type}: ${count}`);
  }

  return lines.join("\n");
}

/**
 * Format the full card list for the prompt (Scryfall-grounded data).
 */
export function formatCardList(deck: ResolvedDeck): string {
  const lines: string[] = [];

  for (const c of deck.cards) {
    if (!c.scryfall) continue;
    const s = c.scryfall;
    const oracle = getOracleText(s);
    lines.push(
      `${c.entry.quantity}x ${s.name} | ${s.mana_cost ?? "N/A"} | ${s.type_line} | ${oracle || "No text"} [${c.entry.section}]`,
    );
  }

  return lines.join("\n");
}
