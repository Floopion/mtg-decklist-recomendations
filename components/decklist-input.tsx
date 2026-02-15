"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
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

const DECKLIST_PLACEHOLDER = `// Commander
1 Atraxa, Praetors' Voice

// Mainboard
1 Sol Ring
1 Arcane Signet
1 Command Tower
1 Rhystic Study
1 Swords to Plowshares

// Sideboard
1 Dovin's Veto`;

interface DecklistInputProps {
  onParsed: (deck: ParsedDeck, detected: DetectedInput) => void;
  isLoading?: boolean;
}

export function DecklistInput({ onParsed, isLoading }: DecklistInputProps) {
  const [url, setUrl] = useState("");
  const [decklist, setDecklist] = useState("");

  const detectedUrl = url.trim() ? detectInputType(url) : null;
  const hasUrl = detectedUrl?.type === "archidekt-url";
  const hasDecklist = decklist.trim().length > 0;

  const cardCount = (() => {
    if (!hasDecklist) return 0;
    const parsed = parseDecklistText(decklist.trim());
    return parsed.entries.reduce((sum, e) => sum + e.quantity, 0);
  })();

  const handleSubmit = useCallback(() => {
    if (hasUrl) {
      onParsed({ entries: [], errors: [] }, detectedUrl!);
    } else if (hasDecklist) {
      const det = detectInputType(decklist);
      const parsed = parseDecklistText(det.raw);
      onParsed(parsed, det);
    }
  }, [url, decklist, hasUrl, hasDecklist, detectedUrl, onParsed]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Import from Archidekt</CardTitle>
          <CardDescription>
            Paste a link to a public Archidekt deck
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="url"
            placeholder="https://archidekt.com/decks/1234567/my_deck"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading || hasDecklist}
          />
          {hasUrl && (
            <Badge variant="outline" className="w-fit">
              Archidekt deck #{detectedUrl!.deckId}
            </Badge>
          )}
          {url.trim() && !hasUrl && (
            <p className="text-sm text-destructive">
              Not a valid Archidekt URL
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paste a Decklist</CardTitle>
          <CardDescription>
            One card per line: &quot;1 Sol Ring&quot; or &quot;1x Sol Ring&quot;.
            Use &quot;// Section&quot; headers to separate Commander, Sideboard, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            placeholder={DECKLIST_PLACEHOLDER}
            value={decklist}
            onChange={(e) => setDecklist(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            disabled={isLoading || hasUrl}
          />
          {hasDecklist && (
            <Badge variant="outline" className="w-fit">
              {cardCount} cards detected
            </Badge>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={(!hasUrl && !hasDecklist) || isLoading}
        size="lg"
        className="w-full"
      >
        {isLoading ? "Analyzing..." : "Analyze Deck"}
      </Button>
    </div>
  );
}
