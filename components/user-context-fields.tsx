"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PowerLevel, BudgetLevel, UserContext } from "@/lib/types";

const POWER_LEVELS: { value: PowerLevel; label: string; description: string }[] = [
  { value: "casual", label: "Casual", description: "Fun and thematic — precons, no fast mana, no infinites" },
  { value: "focused", label: "Focused", description: "Clear game plan — efficient cards, some synergy combos" },
  { value: "optimized", label: "Optimized", description: "Strong and consistent — tutors, efficient combos, tight lists" },
  { value: "cedh", label: "cEDH", description: "Max power — fast mana, free counters, consistent win conditions" },
];

const BUDGET_LEVELS: { value: BudgetLevel; label: string }[] = [
  { value: "no_limit", label: "No limit" },
  { value: "under_50", label: "Under $50/card" },
  { value: "under_25", label: "Under $25/card" },
  { value: "under_5", label: "Under $5/card" },
  { value: "under_1", label: "Under $1/card" },
];

interface UserContextFieldsProps {
  value: UserContext;
  onChange: (context: UserContext) => void;
  disabled?: boolean;
}

export function UserContextFields({
  value,
  onChange,
  disabled,
}: UserContextFieldsProps) {
  const [petCardInput, setPetCardInput] = useState("");

  function addPetCard() {
    const name = petCardInput.trim();
    if (!name) return;
    const current = value.petCards ?? [];
    if (current.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    onChange({ ...value, petCards: [...current, name] });
    setPetCardInput("");
  }

  function removePetCard(name: string) {
    const current = value.petCards ?? [];
    onChange({ ...value, petCards: current.filter((c) => c !== name) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preferences</CardTitle>
        <CardDescription>
          Optional — helps tailor recommendations to your needs
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Power level */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Power Level</label>
          <div className="flex flex-wrap gap-2">
            {POWER_LEVELS.map((pl) => (
              <button
                key={pl.value}
                type="button"
                disabled={disabled}
                title={pl.description}
                onClick={() =>
                  onChange({
                    ...value,
                    powerLevel:
                      value.powerLevel === pl.value ? undefined : pl.value,
                  })
                }
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  value.powerLevel === pl.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                } disabled:opacity-50`}
              >
                {pl.label}
              </button>
            ))}
          </div>
          {value.powerLevel && (
            <p className="text-xs text-muted-foreground">
              {POWER_LEVELS.find((p) => p.value === value.powerLevel)?.description}
            </p>
          )}
        </div>

        {/* Budget */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Budget</label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_LEVELS.map((bl) => (
              <button
                key={bl.value}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    budget: value.budget === bl.value ? undefined : bl.value,
                  })
                }
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  value.budget === bl.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                } disabled:opacity-50`}
              >
                {bl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Strategy / Theme</label>
          <Input
            placeholder='e.g. "voltron", "aristocrats", "storm"'
            value={value.strategy ?? ""}
            onChange={(e) =>
              onChange({ ...value, strategy: e.target.value || undefined })
            }
            disabled={disabled}
          />
        </div>

        {/* Pet cards */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Pet Cards</label>
          <p className="text-xs text-muted-foreground">
            Cards you don&apos;t want cut from the deck
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Card name"
              value={petCardInput}
              onChange={(e) => setPetCardInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPetCard();
                }
              }}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={addPetCard}
              disabled={disabled || !petCardInput.trim()}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {(value.petCards?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {value.petCards!.map((card) => (
                <Badge
                  key={card}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {card}
                  <button
                    type="button"
                    onClick={() => removePetCard(card)}
                    disabled={disabled}
                    className="ml-1 rounded-full p-0.5 hover:bg-accent"
                    aria-label={`Remove ${card}`}
                  >
                    ✕
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
