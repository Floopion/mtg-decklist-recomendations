"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCardImageUri } from "@/lib/scryfall";
import type { ScryfallCard } from "@/lib/types";

interface CardPreviewProps {
  card: ScryfallCard;
  quantity: number;
}

export function CardPreview({ card, quantity }: CardPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageUrl = getCardImageUri(card, "normal");

  const price = card.prices.usd
    ? `$${card.prices.usd}`
    : card.prices.eur
      ? `€${card.prices.eur}`
      : null;

  return (
    <div className="group relative">
      <div className="relative aspect-[488/680] w-full overflow-hidden rounded-lg">
        {imageUrl ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 rounded-lg" />
            )}
            <Image
              src={imageUrl}
              alt={card.name}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              className="rounded-lg object-cover"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg bg-muted p-2 text-center text-xs text-muted-foreground">
            {card.name}
          </div>
        )}

        {quantity > 1 && (
          <Badge className="absolute top-1 right-1 text-xs" variant="default">
            x{quantity}
          </Badge>
        )}
      </div>

      <div className="mt-1.5 flex items-start justify-between gap-1">
        <p className="truncate text-xs font-medium">{card.name}</p>
        {price && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {price}
          </span>
        )}
      </div>
    </div>
  );
}
