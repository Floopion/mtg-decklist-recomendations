"use client";

import { useState } from "react";
import { DecklistInput } from "@/components/decklist-input";
import { DeckDisplay } from "@/components/deck-display";
import { UserContextFields } from "@/components/user-context-fields";
import { RecommendationsDisplay } from "@/components/recommendations-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { detectInputType } from "@/lib/decklist-parser";
import type {
  ResolvedDeck,
  UserContext,
  ValidatedRecommendationResponse,
} from "@/lib/types";

type LoadingPhase = "resolving" | "analyzing" | null;

export default function Home() {
  const [url, setUrl] = useState("");
  const [decklist, setDecklist] = useState("");
  const [resolvedDeck, setResolvedDeck] = useState<ResolvedDeck | null>(null);
  const [recommendations, setRecommendations] =
    useState<ValidatedRecommendationResponse | null>(null);
  const [deckName, setDeckName] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<UserContext>({});
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null);
  const [error, setError] = useState<string | null>(null);

  const detectedUrl = url.trim() ? detectInputType(url) : null;
  const hasUrl = detectedUrl?.type === "archidekt-url";
  const hasDecklist = decklist.trim().length > 0;
  const canSubmit = hasUrl || hasDecklist;

  async function handleSubmit() {
    const detected = hasUrl ? detectedUrl! : detectInputType(decklist);

    setLoadingPhase("resolving");
    setError(null);
    setResolvedDeck(null);
    setRecommendations(null);
    setDeckName(null);

    try {
      // Step 1: Resolve cards
      const resolveRes = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: detected.raw }),
      });

      const resolveData = await resolveRes.json();

      if (!resolveRes.ok) {
        setError(resolveData.error ?? "Failed to resolve cards");
        return;
      }

      setResolvedDeck({
        cards: resolveData.cards,
        unresolved: resolveData.unresolved,
      });
      if (resolveData.deckName) setDeckName(resolveData.deckName);

      // Step 2: Get recommendations
      setLoadingPhase("analyzing");

      const recRes = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: detected.raw,
          context: userContext,
          resolvedDeck: {
            cards: resolveData.cards,
            unresolved: resolveData.unresolved,
          },
        }),
      });

      const recData = await recRes.json();

      if (!recRes.ok) {
        setError(recData.error ?? "Failed to get recommendations");
        return;
      }

      setRecommendations(recData);
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoadingPhase(null);
    }
  }

  const isLoading = loadingPhase !== null;

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

      <DecklistInput
        url={url}
        onUrlChange={setUrl}
        decklist={decklist}
        onDecklistChange={setDecklist}
        isLoading={isLoading}
      />

      <UserContextFields
        value={userContext}
        onChange={setUserContext}
        disabled={isLoading}
      />

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || isLoading}
        size="lg"
        className="w-full"
      >
        {isLoading ? "Analyzing..." : "Analyze Deck"}
      </Button>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading states */}
      {loadingPhase === "resolving" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Resolving cards against Scryfall...
          </p>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[488/680] rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {loadingPhase === "analyzing" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Analyzing deck and generating recommendations...
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {deckName && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Imported:{" "}
          <span className="font-medium text-foreground">{deckName}</span>
        </p>
      )}

      {resolvedDeck && !isLoading && <DeckDisplay deck={resolvedDeck} />}

      {recommendations && !isLoading && (
        <RecommendationsDisplay data={recommendations} />
      )}
    </div>
  );
}
