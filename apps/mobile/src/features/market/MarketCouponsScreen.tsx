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
  const { u, t } = useI18n();
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
      <AppHeader title={u("쿠폰", "Coupons")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      <Text style={styles.sub}>{u("정산·수수료 혜택 쿠폰과 프로모션", "Fee and settlement benefit coupons & promos")}</Text>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.kind}-${r.id}`}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>{u("보유 쿠폰이 없습니다.", "No coupons yet.")}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.badge}>{item.kind === "promotion" ? u("프로모션", "Promo") : u("쿠폰", "Coupon")}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.benefit}>{item.benefitLabel}</Text>
              <Text style={styles.meta}>
                {u("상태", "Status")} {item.status}
                {item.remainingBenefitKrw != null
                  ? u(` · 잔여 ${formatUsd(item.remainingBenefitKrw)}`, ` · left ${formatUsd(item.remainingBenefitKrw)}`)
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
