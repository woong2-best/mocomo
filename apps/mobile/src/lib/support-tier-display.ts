const TIER_ORDER = [
  "SEED",
  "STONE",
  "BRASS",
  "BRONZE",
  "SILVER",
  "GOLD",
  "CRYSTAL",
  "EMERALD",
  "SAPPHIRE",
  "RUBY",
  "DIAMOND",
  "MYTHRIL",
  "ORICHALCUM",
  "LUNA",
  "TERRA",
  "JUPITER",
  "ASTRAL",
  "COSMIC",
] as const;

export function tierRank(level: string): number {
  const idx = TIER_ORDER.indexOf(level as (typeof TIER_ORDER)[number]);
  return idx >= 0 ? idx : 0;
}

/** Web `profileDisplayTier` parity */
export function profileDisplayTier(
  supportTierSent?: string | null,
  earnedMocoTier?: string | null
): string {
  const sent = supportTierSent ?? "SEED";
  const earned = earnedMocoTier ?? "SEED";
  return tierRank(sent) >= tierRank(earned) ? sent : earned;
}
