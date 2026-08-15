import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/theme/tokens";
import type { WalletCardModel } from "@/features/wallet/wallet-card-layout";

type Props = {
  card: WalletCardModel;
  expanded: boolean;
};

export const WalletCardFace = memo(function WalletCardFace({ card, expanded }: Props) {
  return (
    <View style={styles.inner}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{card.eyebrow}</Text>
          {card.amount ? <Text style={styles.amount}>{card.amount}</Text> : null}
        </View>
        {card.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{card.badge}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.subtitle} numberOfLines={expanded ? 3 : 2}>
        {card.subtitle}
      </Text>

      {expanded && card.expandedLines.length > 0 ? (
        <View style={styles.expandedBlock}>
          {card.expandedLines.map((line) => (
            <Text key={line} style={styles.expandedLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "700",
    fontSize: 12,
  },
  amount: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  expandedBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.22)",
    gap: 4,
  },
  expandedLine: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "600",
  },
});
