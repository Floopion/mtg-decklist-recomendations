"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCardImageUri } from "@/lib/scryfall";
import type { ValidatedRecommendation } from "@/lib/types";

/** Build the MTG Singles store logo URL from the store ID (e.g. "BayDragon" → "/assets/images/stores/NZ/BayDragon.webp") */
function storeImageUrl(store: string): string {
  return `https://www.mtgsingles.co.nz/assets/images/stores/NZ/${store}.webp`;
}

const CATEGORY_LABELS: Record<string, string> = {
  ramp: "Ramp",
  removal: "Removal",
  card_draw: "Card Draw",
  board_wipe: "Board Wipe",
  protection: "Protection",
  win_condition: "Win Con",
  mana_base: "Mana Base",
  synergy: "Synergy",
  general: "General",
};

interface RecommendationCardProps {
  rec: ValidatedRecommendation;
  type: "cut" | "addition" | "mana_base";
}

export function RecommendationCard({ rec, type }: RecommendationCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const imageUrl = rec.scryfall
    ? getCardImageUri(rec.scryfall, "normal")
    : null;

  const categoryLabel =
    CATEGORY_LABELS[rec.recommendation.category] ?? rec.recommendation.category;

  return (
    <div
      className="relative flex gap-3 rounded-lg border p-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card image thumbnail */}
      <div className="relative h-[100px] w-[72px] shrink-0 overflow-hidden rounded">
        {imageUrl ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 rounded" />
            )}
            <Image
              src={imageUrl}
              alt={rec.recommendation.card_name}
              fill
              sizes="72px"
              className="rounded object-cover"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
            No image
          </div>
        )}

        {/* Hover preview — anchored to thumbnail */}
        {hovered && imageLoaded && imageUrl && (
          <div className="pointer-events-none absolute bottom-0 left-[calc(100%+8px)] z-50 w-[250px] overflow-hidden rounded-lg border bg-background shadow-xl">
            <Image
              src={imageUrl}
              alt={rec.recommendation.card_name}
              width={250}
              height={349}
              className="block"
            />
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {rec.recommendation.card_name}
          </p>
          <Badge
            variant={type === "cut" ? "destructive" : "secondary"}
            className="shrink-0 text-[10px]"
          >
            {type === "cut" ? "Cut" : type === "mana_base" ? "Mana" : "Add"}
          </Badge>
        </div>

        <Badge variant="outline" className="w-fit text-[10px]">
          {categoryLabel}
        </Badge>

        <p className="text-xs text-muted-foreground">
          {rec.recommendation.reason}
        </p>

        {rec.recommendation.replaces && (
          <p className="text-xs text-muted-foreground">
            Replaces:{" "}
            <span className="font-medium text-foreground">
              {rec.recommendation.replaces}
            </span>
          </p>
        )}

        {/* Prices row */}
        <div className="mt-auto flex items-center justify-between">
          {rec.scryfall?.prices.usd && (
            <span className="text-xs text-muted-foreground">
              US ${rec.scryfall.prices.usd}
            </span>
          )}

          {rec.nzPrice && (
            <Button variant="ghost" size="xs" className="bg-white/40" asChild>
              <a
                href={rec.nzPrice.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storeImageUrl(rec.nzPrice.store)}
                  alt={rec.nzPrice.store}
                  className="h-5 w-[40px] shrink-0 rounded object-contain object-center"
                />
                {rec.nzPrice.price}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
