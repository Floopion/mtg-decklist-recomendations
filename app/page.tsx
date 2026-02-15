"use client";

import { useState } from "react";
import { DecklistInput } from "@/components/decklist-input";
import { DeckDisplay } from "@/components/deck-display";
import type { ParsedDeck, DetectedInput } from "@/lib/types";

export default function Home() {
  const [parsedDeck, setParsedDeck] = useState<ParsedDeck | null>(null);
  const [detected, setDetected] = useState<DetectedInput | null>(null);

  function handleParsed(deck: ParsedDeck, det: DetectedInput) {
    setParsedDeck(deck);
    setDetected(det);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          MTG Decklist Recommendations
        </h1>
        <p className="text-muted-foreground">
          Paste your Commander decklist or an Archidekt URL and get AI-powered
          suggestions for cuts, additions, and mana base improvements.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <DecklistInput onParsed={handleParsed} />

        {parsedDeck && detected?.type === "text" && parsedDeck.entries.length > 0 && (
          <DeckDisplay deck={parsedDeck} />
        )}

        {detected?.type === "archidekt-url" && (
          <div className="flex items-center justify-center rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            Archidekt import for deck #{detected.deckId} will be fetched
            server-side when you analyze.
          </div>
        )}
      </div>
    </div>
  );
}
