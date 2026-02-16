"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { detectInputType, parseDecklistText } from "@/lib/decklist-parser";

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
  url: string;
  onUrlChange: (url: string) => void;
  decklist: string;
  onDecklistChange: (decklist: string) => void;
  isLoading?: boolean;
}

export function DecklistInput({
  url,
  onUrlChange,
  decklist,
  onDecklistChange,
  isLoading,
}: DecklistInputProps) {
  const detectedUrl = url.trim() ? detectInputType(url) : null;
  const hasUrl = detectedUrl?.type === "archidekt-url";
  const hasDecklist = decklist.trim().length > 0;

  const cardCount = (() => {
    if (!hasDecklist) return 0;
    const parsed = parseDecklistText(decklist.trim());
    return parsed.entries.reduce((sum, e) => sum + e.quantity, 0);
  })();

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
          <div className="relative">
            <Input
              type="url"
              placeholder="https://archidekt.com/decks/1234567/my_deck"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              disabled={isLoading || hasDecklist}
              className={url ? "pr-8" : ""}
            />
            {url && !isLoading && (
              <button
                type="button"
                onClick={() => onUrlChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear URL"
              >
                ✕
              </button>
            )}
          </div>
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
          <div className="relative">
            <Textarea
              placeholder={DECKLIST_PLACEHOLDER}
              value={decklist}
              onChange={(e) => onDecklistChange(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              disabled={isLoading || hasUrl}
            />
            {hasDecklist && !isLoading && (
              <button
                type="button"
                onClick={() => onDecklistChange("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                aria-label="Clear decklist"
              >
                ✕
              </button>
            )}
          </div>
          {hasDecklist && (
            <Badge variant="outline" className="w-fit">
              {cardCount} cards detected
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
