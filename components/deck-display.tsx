"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ParsedDeck, DeckSection } from "@/lib/types";

const SECTION_LABELS: Record<DeckSection, string> = {
  commander: "Commander",
  mainboard: "Mainboard",
  sideboard: "Sideboard",
  maybeboard: "Maybeboard",
};

const SECTION_ORDER: DeckSection[] = [
  "commander",
  "mainboard",
  "sideboard",
  "maybeboard",
];

interface DeckDisplayProps {
  deck: ParsedDeck;
}

export function DeckDisplay({ deck }: DeckDisplayProps) {
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    entries: deck.entries.filter((e) => e.section === section),
  })).filter((g) => g.entries.length > 0);

  const totalCards = deck.entries.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Parsed Deck</CardTitle>
          <Badge variant="secondary">{totalCards} cards</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {grouped.map(({ section, label, entries }) => (
          <div key={section} className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              {label} ({entries.reduce((s, e) => s + e.quantity, 0)})
            </h3>
            <ul className="flex flex-col gap-0.5">
              {entries.map((entry, i) => (
                <li
                  key={`${entry.cardName}-${i}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-6 text-right font-mono text-muted-foreground">
                    {entry.quantity}
                  </span>
                  <span>{entry.cardName}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {deck.errors.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-destructive">
              Parse Errors ({deck.errors.length})
            </h3>
            <ul className="flex flex-col gap-0.5">
              {deck.errors.map((err, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  <span className="font-mono">Line {err.line}:</span>{" "}
                  <span className="text-destructive">{err.text}</span>
                  <span className="ml-2 text-xs">— {err.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
