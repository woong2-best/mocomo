import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { formatUsedTimeAgo } from "@/features/marketplace/used-catalog";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMocoDisplay } from "@/lib/wallet-moco-display";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type ReceivedTip = {
  id: string;
  moco: number;
  message: string | null;
  createdAt: string;
  sender: { username: string; name: string | null };
};

async function fetchReceivedTips() {
  return apiRequest<{ tips: ReceivedTip[] }>("/api/mobile/wallet/received-tips", { auth: true });
}

export function ReceivedTipsPanel() {
  const { u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const query = useQuery({
    queryKey: ["mobile-received-tips"],
    queryFn: fetchReceivedTips,
  });
  const tips = query.data?.tips ?? [];

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>{u("받은 후원", "Received tips")}</Text>
      {tips.length === 0 ? (
        <Text style={[styles.body, { color: colors.textMuted }]}>{u("받은 후원이 없습니다.", "No tips received yet.")}</Text>
      ) : (
        tips.map((tip) => (
          <View key={tip.id} style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.user, { color: colors.cobalt }]}>@{tip.sender.username}</Text>
              {tip.message ? (
                <Text style={[styles.body, { color: colors.textMuted }]} numberOfLines={2}>
                  {tip.message}
                </Text>
              ) : null}
              <Text style={[styles.when, { color: colors.textMuted }]}>{formatUsedTimeAgo(tip.createdAt, u)}</Text>
            </View>
            <Text style={[styles.amount, { color: colors.success }]}>
              +{formatMocoDisplay(tip.moco)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.md,
      gap: spacing.sm,
    },
    heading: { fontSize: 15, fontWeight: "800" },
    body: { fontSize: 13, lineHeight: 18 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    user: { fontSize: 14, fontWeight: "700" },
    when: { fontSize: 11, marginTop: 4 },
    amount: { fontSize: 14, fontWeight: "800" },
  });
}
