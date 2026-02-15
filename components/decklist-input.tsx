"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { detectInputType, parseDecklistText } from "@/lib/decklist-parser";
import type { ParsedDeck, DetectedInput } from "@/lib/types";

const PLACEHOLDER = `// Commander
1 Atraxa, Praetors' Voice

// Mainboard
1 Sol Ring
1 Arcane Signet
1 Command Tower
1 Rhystic Study
1 Swords to Plowshares

// Sideboard
1 Dovin's Veto

Or paste an Archidekt URL:
https://archidekt.com/decks/1234567/my_deck`;

interface DecklistInputProps {
  onParsed: (deck: ParsedDeck, detected: DetectedInput) => void;
  isLoading?: boolean;
}

export function DecklistInput({ onParsed, isLoading }: DecklistInputProps) {
  const [input, setInput] = useState("");

  const detected = input.trim() ? detectInputType(input) : null;

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;

    const det = detectInputType(input);

    if (det.type === "text") {
      const parsed = parseDecklistText(det.raw);
      onParsed(parsed, det);
    } else {
      // Archidekt URL — pass empty deck, the API route will fetch it
      onParsed({ entries: [], errors: [] }, det);
    }
  }, [input, onParsed]);

  const cardCount = (() => {
    if (!input.trim()) return 0;
    const det = detectInputType(input);
    if (det.type !== "text") return 0;
    const parsed = parseDecklistText(det.raw);
    return parsed.entries.reduce((sum, e) => sum + e.quantity, 0);
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Decklist</CardTitle>
        <CardDescription>
          Paste a Commander decklist or an Archidekt URL to a public deck
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Textarea
          placeholder={PLACEHOLDER}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {detected && (
              <Badge variant="outline">
                {detected.type === "archidekt-url"
                  ? `Archidekt deck #${detected.deckId}`
                  : `${cardCount} cards detected`}
              </Badge>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? "Analyzing..." : "Analyze Deck"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
