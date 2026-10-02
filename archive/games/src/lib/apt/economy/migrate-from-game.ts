import { createDefaultGameState } from "@/lib/apt/game/defaults";
import { isStarterOwned } from "@/lib/apt/game/shop";
import type { AptGameState } from "@/lib/apt/game/types";
import type { InventoryItemSource } from "./types";

export type LegacyEconomySeed = {
  gold: number;
  gems: number;
  items: Array<{ itemId: string; quantity: number; source: InventoryItemSource }>;
};

const STARTER_IDS = [
  "room-shell",
  "door",
  "window",
  "sofa",
  "rug",
  "plant",
  "lamp",
  "mailbox",
  "telephone",
  "computer",
  "mascot-sit",
] as const;

export function buildLegacyEconomySeed(game: AptGameState | null | undefined): LegacyEconomySeed {
  const base = createDefaultGameState();
  const merged = game ?? base;
  const itemMap = new Map<string, { quantity: number; source: InventoryItemSource }>();

  for (const itemId of STARTER_IDS) {
    itemMap.set(itemId, { quantity: 1, source: "starter" });
  }

  for (const itemId of merged.ownedStickers) {
    if (isStarterOwned(itemId)) continue;
    const prev = itemMap.get(itemId);
    itemMap.set(itemId, {
      quantity: (prev?.quantity ?? 0) + 1,
      source: "shop",
    });
  }

  return {
    gold: merged.gold,
    gems: merged.gems,
    items: [...itemMap.entries()].map(([itemId, v]) => ({
      itemId,
      quantity: v.quantity,
      source: v.source,
    })),
  };
}
