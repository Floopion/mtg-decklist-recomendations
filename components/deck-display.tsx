"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardPreview } from "@/components/card-preview";
import type { ResolvedDeck, DeckSection } from "@/lib/types";

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
  deck: ResolvedDeck;
}

export function DeckDisplay({ deck }: DeckDisplayProps) {
  const [open, setOpen] = useState(false);

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    cards: deck.cards.filter((c) => c.entry.section === section),
  })).filter((g) => g.cards.length > 0);

  const totalCards = deck.cards.reduce(
    (sum, c) => sum + c.entry.quantity,
    0,
  );

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Your Deck</CardTitle>
            <span className="text-muted-foreground transition-transform duration-200" style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▾
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{totalCards} cards</Badge>
            {deck.unresolved.length > 0 && (
              <Badge variant="destructive">
                {deck.unresolved.length} not found
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="flex flex-col gap-8">
          {grouped.map(({ section, label, cards }) => (
          <div key={section} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {label} ({cards.reduce((s, c) => s + c.entry.quantity, 0)})
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {cards.map((resolved, i) =>
                resolved.scryfall ? (
                  <CardPreview
                    key={`${resolved.entry.cardName}-${i}`}
                    card={resolved.scryfall}
                    quantity={resolved.entry.quantity}
                  />
                ) : (
                  <div
                    key={`${resolved.entry.cardName}-${i}`}
                    className="flex aspect-[488/680] items-center justify-center rounded-lg border border-dashed p-2 text-center text-xs text-muted-foreground"
                  >
                    <span>
                      {resolved.entry.quantity}x {resolved.entry.cardName}
                      <br />
                      <span className="text-destructive">Not found</span>
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
        </CardContent>
      )}
    </Card>
  );
}
