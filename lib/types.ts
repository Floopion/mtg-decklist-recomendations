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

// --- Recommendation types ---

export type RecommendationCategory =
  | "ramp"
  | "removal"
  | "card_draw"
  | "board_wipe"
  | "protection"
  | "win_condition"
  | "mana_base"
  | "synergy"
  | "general";

export interface CardRecommendation {
  card_name: string;
  reason: string;
  category: RecommendationCategory;
  replaces?: string;
}

export interface RecommendationResponse {
  cuts: CardRecommendation[];
  additions: CardRecommendation[];
  mana_base: CardRecommendation[];
  general_notes: string;
}

/** A recommendation enriched with Scryfall data after output validation. */
export interface ValidatedRecommendation {
  recommendation: CardRecommendation;
  scryfall: ScryfallCard | null;
}

export interface ValidatedRecommendationResponse {
  cuts: ValidatedRecommendation[];
  additions: ValidatedRecommendation[];
  mana_base: ValidatedRecommendation[];
  general_notes: string;
}

export type PowerLevel = "casual" | "focused" | "optimized" | "cedh";
export type BudgetLevel = "no_limit" | "under_50" | "under_25" | "under_5" | "under_1";

export interface UserContext {
  powerLevel?: PowerLevel;
  budget?: BudgetLevel;
  strategy?: string;
  /** Cards the user doesn't want cut. */
  petCards?: string[];
}

// --- Deck analysis (computed server-side for prompt enrichment) ---

export interface DeckAnalysis {
  commanderName: string | null;
  colorIdentity: string[];
  totalCards: number;
  manaCurve: Record<string, number>;
  typeDistribution: Record<string, number>;
  landCount: number;
  rampCount: number;
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
