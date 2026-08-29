import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

const TIER_META: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  SEED: { label: "Seed", color: "#84cc16", icon: "https://mocomo.net/support/tiers/seed.png" },
  STONE: { label: "Stone", color: "#78716c", icon: "https://mocomo.net/support/tiers/stone.png" },
  BRONZE: { label: "Bronze", color: "#b45309", icon: "https://mocomo.net/support/tiers/bronze.png" },
  SILVER: { label: "Silver", color: "#94a3b8", icon: "https://mocomo.net/support/tiers/silver.png" },
  GOLD: { label: "Gold", color: "#eab308", icon: "https://mocomo.net/support/tiers/gold.png" },
  CRYSTAL: { label: "Crystal", color: "#ec4899", icon: "https://mocomo.net/support/tiers/crystal.png" },
  EMERALD: { label: "Emerald", color: "#10b981", icon: "https://mocomo.net/support/tiers/emerald.png" },
  SAPPHIRE: { label: "Sapphire", color: "#3b82f6", icon: "https://mocomo.net/support/tiers/sapphire.png" },
  RUBY: { label: "Ruby", color: "#ef4444", icon: "https://mocomo.net/support/tiers/ruby.png" },
  DIAMOND: { label: "Diamond", color: "#a855f7", icon: "https://mocomo.net/support/tiers/diamond.png" },
  MYTHRIL: { label: "Mythril", color: "#6366f1", icon: "https://mocomo.net/support/tiers/mythril.png" },
  ORICHALCUM: { label: "Orichalcum", color: "#f97316", icon: "https://mocomo.net/support/tiers/orichalcum.png" },
  LUNA: { label: "Luna", color: "#cbd5e1", icon: "https://mocomo.net/support/tiers/luna.png" },
  TERRA: { label: "Terra", color: "#65a30d", icon: "https://mocomo.net/support/tiers/terra.png" },
  JUPITER: { label: "Jupiter", color: "#ea580c", icon: "https://mocomo.net/support/tiers/jupiter.png" },
  ASTRAL: { label: "Astral", color: "#8b5cf6", icon: "https://mocomo.net/support/tiers/astral.png" },
  COSMIC: { label: "Cosmic", color: "#06b6d4", icon: "https://mocomo.net/support/tiers/cosmic.png" },
};

export function SupportTierBadge({
  tier = "SEED",
  compact = false,
}: {
  tier?: string;
  compact?: boolean;
}) {
  const info = TIER_META[tier] ?? TIER_META.SEED;
  return (
    <View
      style={[
        styles.badge,
        { borderColor: `${info.color}55`, backgroundColor: `${info.color}18` },
      ]}
    >
      <Image source={{ uri: info.icon }} style={styles.icon} contentFit="contain" />
      {!compact ? <Text style={[styles.label, { color: info.color }]}>{info.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  icon: { width: 14, height: 14 },
  label: { fontSize: 10, fontWeight: "800" },
});
