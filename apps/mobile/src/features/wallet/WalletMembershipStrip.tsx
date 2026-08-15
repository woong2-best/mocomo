import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/theme/tokens";

type Props = {
  title: string;
  subtitle?: string;
  right?: string;
  backgroundColor: string;
};

export const WalletMembershipStrip = memo(function WalletMembershipStrip({
  title,
  subtitle,
  right,
  backgroundColor,
}: Props) {
  return (
    <View style={[styles.strip, { backgroundColor }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stripTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.stripSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <Text style={styles.stripRight}>{right}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  strip: {
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stripTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  stripSub: { color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 2, fontWeight: "600" },
  stripRight: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
