export type DeckSection =
  | "commander"
  | "mainboard"
  | "sideboard"
  | "maybeboard";

export interface DeckEntry {
  quantity: number;
  cardName: string;
  section: DeckSection;
}

export interface ParsedDeck {
  entries: DeckEntry[];
  errors: ParseError[];
}

export interface ParseError {
  line: number;
  text: string;
  reason: string;
}

// --- Scryfall types (subset of fields we actually use) ---

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords: string[];
  legalities: Record<string, string>;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  prices: ScryfallPrices;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
}

export interface ScryfallImageUris {
  small: string;
  normal: string;
  large: string;
  art_crop: string;
  png: string;
}

export interface ScryfallPrices {
  usd: string | null;
  usd_foil: string | null;
  eur: string | null;
}

/** A deck entry enriched with Scryfall data. */
export interface ResolvedCard {
  entry: DeckEntry;
  scryfall: ScryfallCard | null;
}

export interface ResolvedDeck {
  cards: ResolvedCard[];
  /** Cards that Scryfall couldn't find. */
  unresolved: DeckEntry[];
}

// --- Input types ---

export type InputType = "text" | "archidekt-url";

export interface DetectedInput {
  type: InputType;
  /** For archidekt-url, the extracted deck ID */
  deckId?: string;
  /** The raw input text */
  raw: string;
}
