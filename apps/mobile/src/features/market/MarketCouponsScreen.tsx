import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMyCoupons } from "@/api/commerce-market";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { formatUsd } from "@/lib/money";
import { useI18n } from "@/i18n/I18nProvider";

export function MarketCouponsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const query = useQuery({ queryKey: ["mobile-coupons-mine"], queryFn: fetchMyCoupons });

  const rows = [
    ...(query.data?.promotions ?? []).map((p) => ({ kind: "promotion" as const, ...p })),
    ...(query.data?.coupons ?? []).map((c) => ({ kind: "coupon" as const, ...c })),
  ];

  return (
    <Screen>
      <AppHeader title={t("m.market.coupons")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      <Text style={styles.sub}>{t("m.market.fee_and_settlement_benefit_coupons_promo")}</Text>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.kind}-${r.id}`}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>{t("m.market.no_coupons_yet")}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.badge}>{item.kind === "promotion" ? t("m.market.promo") : t("m.market.coupon")}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.benefit}>{item.benefitLabel}</Text>
              <Text style={styles.meta}>
                {t("m.common.status")} {item.status}
                {item.remainingBenefitKrw != null
                  ? t("m.market.left_formatusd", { formatUsd: String(formatUsd(item.remainingBenefitKrw)) })
                  : ""}
              </Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sub: {
      paddingHorizontal: spacing.md,
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: spacing.sm,
    },
    card: {
      padding: 14,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.18)",
      backgroundColor: colors.surfaceRaised,
      gap: 4,
    },
    badge: {
      alignSelf: "flex-start",
      fontSize: 10,
      fontWeight: "800",
      color: colors.terracotta,
      backgroundColor: "rgba(197, 82, 42, 0.12)",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
      overflow: "hidden",
    },
    name: { fontSize: 16, fontWeight: "800", color: colors.text },
    benefit: { fontSize: 14, color: colors.cobalt, fontWeight: "700" },
    meta: { fontSize: 12, color: colors.textMuted },
    empty: { textAlign: "center", color: colors.textMuted, padding: spacing.xl, fontWeight: "600" },
  });
}
