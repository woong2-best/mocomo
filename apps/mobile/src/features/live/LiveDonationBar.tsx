import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatUsd } from "@/lib/money";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

export function LiveDonationBar({
  goalKrw,
  totalKrw,
}: {
  goalKrw?: number | null;
  totalKrw?: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const total = totalKrw ?? 0;
  const goal = goalKrw ?? 0;
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;

  if (goal <= 0 && total <= 0) return null;

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text style={styles.label}>후원</Text>
        <Text style={styles.amount}>
          {formatUsd(total)}
          {goal > 0 ? ` / ${formatUsd(goal)}` : ""}
        </Text>
      </View>
      {goal > 0 ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      padding: 10,
      gap: 6,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    label: { fontWeight: "800", fontSize: 12, color: colors.text },
    amount: { fontWeight: "700", fontSize: 12, color: colors.cobalt },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.muted,
      overflow: "hidden",
    },
    fill: { height: "100%", backgroundColor: colors.terracotta },
  });
}
