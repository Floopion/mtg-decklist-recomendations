"use client";

import { useState } from "react";
import { DecklistInput } from "@/components/decklist-input";
import { DeckDisplay } from "@/components/deck-display";
import type { ParsedDeck, DetectedInput, ResolvedDeck } from "@/lib/types";

export default function Home() {
  const [resolvedDeck, setResolvedDeck] = useState<ResolvedDeck | null>(null);
  const [deckName, setDeckName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParsed(_deck: ParsedDeck, detected: DetectedInput) {
    setIsLoading(true);
    setError(null);
    setResolvedDeck(null);
    setDeckName(null);

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: detected.raw }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setResolvedDeck({ cards: data.cards, unresolved: data.unresolved });
      if (data.deckName) setDeckName(data.deckName);
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setIsLoading(false);
    }
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

      <DecklistInput onParsed={handleParsed} isLoading={isLoading} />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {deckName && (
        <p className="text-sm text-muted-foreground">
          Imported: <span className="font-medium text-foreground">{deckName}</span>
        </p>
      )}

      {resolvedDeck && <DeckDisplay deck={resolvedDeck} />}
    </div>
  );
}
