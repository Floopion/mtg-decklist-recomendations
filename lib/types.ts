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

export type InputType = "text" | "archidekt-url";

export interface DetectedInput {
  type: InputType;
  /** For archidekt-url, the extracted deck ID */
  deckId?: string;
  /** The raw input text */
  raw: string;
}
