import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchWallet, fetchWalletEarnings } from "@/api/discovery";
import { saveWalletBootstrap } from "@/api/wallet-bootstrap-cache";
import { fetchStripeConnectStatus } from "@/api/stripe-connect";
import { WalletCardStack } from "@/features/wallet/WalletCardStack";
import { GemBalancePanel } from "@/features/wallet/GemBalancePanel";
import { WalletMembershipStrip } from "@/features/wallet/WalletMembershipStrip";
import { SupportTiersPanel } from "@/features/support/SupportTiersPanel";
import { WalletEarningsExport } from "@/features/wallet/WalletEarningsExport";
import { StripeConnectPanel } from "@/features/wallet/StripeConnectPanel";
import { RevenuePayoutPanel } from "@/features/wallet/RevenuePayoutPanel";
import { buildRevenueCards } from "@/features/wallet/wallet-card-builders";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatUsd } from "@/lib/money";

type Tab = "wallet" | "earnings" | "tier";

const TAB_ITEMS: { id: Tab; label: string }[] = [
  { id: "wallet", label: "지갑" },
  { id: "earnings", label: "수익" },
  { id: "tier", label: "등급" },
];

const LEDGER_LABELS: Record<string, string> = {
  SELLER_EARNING: "수익 적립",
  PAYOUT_REQUEST: "출금",
  PAYOUT_REJECTED: "출금 반려 환급",
};

function fmtUsd(n: number) {
  return formatUsd(n);
}

export function WalletScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Wallet">>();
  const [tab, setTab] = useState<Tab>(route.params?.initialTab ?? "wallet");
  const [year, setYear] = useState(new Date().getFullYear());
  const returnScreen = route.params?.returnScreen;
  const handleStripeConnected = useCallback(() => {
    if (!returnScreen) return;
    navigation.replace(returnScreen);
  }, [navigation, returnScreen]);

  useEffect(() => {
    if (route.params?.initialTab) setTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  const walletQuery = useQuery({
    queryKey: ["mobile-wallet"],
    queryFn: () => fetchWallet(),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const earningsQuery = useQuery({
    queryKey: ["mobile-wallet-earnings", year],
    queryFn: () => fetchWalletEarnings(year),
    enabled: tab === "earnings",
    retry: 1,
  });
  const stripeConnectQuery = useQuery({
    queryKey: ["mobile-stripe-connect"],
    queryFn: fetchStripeConnectStatus,
    enabled: tab === "earnings",
  });

  useEffect(() => {
    if (walletQuery.data) {
      void saveWalletBootstrap({ wallet: walletQuery.data });
    }
  }, [walletQuery.data]);

  const data = walletQuery.data;
  const earnings = earningsQuery.data;
  const withdrawable = data ? Math.max(0, data.availableBalance - data.pendingPayout) : 0;
  const bankLabel = stripeConnectQuery.data?.stripeOnboardingCompleted ? "Stripe Connect" : null;

  const revenueCards = useMemo(
    () =>
      data
        ? buildRevenueCards({
            withdrawable,
            totalEarned: data.totalEarned,
            totalWithdrawn: data.totalWithdrawn,
            pendingPayout: data.pendingPayout,
            bankLabel,
            colors,
          })
        : [],
    [bankLabel, colors, data, withdrawable]
  );

  const earningsLoading = tab === "earnings" && earningsQuery.isLoading && !earningsQuery.data;

  return (
    <Screen>
      <View style={[styles.headerBar, { backgroundColor: colors.surfaceRaised, borderBottomColor: colors.hairline }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backHit}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Ionicons name="chevron-back" size={26} color={colors.brand} />
        </Pressable>
        <View style={styles.tabs}>
          {TAB_ITEMS.map((t) => (
            <Pressable key={t.id} onPress={() => setTab(t.id)}>
              <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.root}>
        {walletQuery.isError && !data && tab !== "tier" ? (
          <View style={styles.center}>
            <Text style={styles.error}>지갑을 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void walletQuery.refetch()} />
          </View>
        ) : tab === "wallet" ? (
            <ScrollView contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
              <GemBalancePanel />
            </ScrollView>
        ) : tab === "tier" ? (
          <SupportTiersPanel />
        ) : earningsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
        ) : earningsQuery.isError || !earnings || !data ? (
          <View style={styles.center}>
            <Text style={styles.error}>수익 데이터를 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void earningsQuery.refetch()} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
            {returnScreen && !stripeConnectQuery.data?.stripeOnboardingCompleted ? (
              <View
                style={[
                  styles.returnBanner,
                  { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised },
                ]}
              >
                <Text style={[styles.returnBannerTitle, { color: colors.text }]}>
                  수익 정산 계좌 연동
                </Text>
                <Text style={[styles.returnBannerBody, { color: colors.textMuted }]}>
                  판매·중고·크리에이터 수익을 받으려면 아래에서 Stripe Connect로 정산 계좌를
                  연동해 주세요.
                </Text>
              </View>
            ) : null}
            <WalletCardStack cards={revenueCards} colors={colors} />

            <View style={styles.section}>
              {data.recent.slice(0, 8).map((item) => (
                <WalletMembershipStrip
                  key={item.id}
                  title={LEDGER_LABELS[item.type] ?? item.type}
                  subtitle={item.memo ?? undefined}
                  right={`${item.type === "PAYOUT_REQUEST" ? "-" : "+"}${fmtUsd(item.amount)}`}
                  backgroundColor={
                    item.type === "SELLER_EARNING"
                      ? colors.cobalt
                      : item.type === "PAYOUT_REQUEST"
                        ? colors.terracotta
                        : "#4b5563"
                  }
                />
              ))}
              {data.recent.length === 0 ? (
                <WalletMembershipStrip
                  title="아직 정산 내역이 없습니다"
                  subtitle="후원·판매 수익이 여기에 표시됩니다"
                  backgroundColor="#4b5563"
                />
              ) : null}
            </View>

            <StripeConnectPanel onConnected={handleStripeConnected} />
            <RevenuePayoutPanel
              withdrawable={withdrawable}
              bankReady={!!stripeConnectQuery.data?.stripeOnboardingCompleted}
            />

            <View style={styles.section}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
                {(earnings.years ?? [year]).map((y) => (
                  <Pressable
                    key={y}
                    onPress={() => setYear(y)}
                    style={[
                      styles.yearChip,
                      {
                        borderColor: colors.hairline,
                        backgroundColor: year === y ? colors.cobalt : colors.surfaceRaised,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        { color: year === y ? colors.textOnAccent : colors.textMuted },
                      ]}
                    >
                      {y}년
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.statRow}>
                <StatCard label="수익" value={earnings.yearEarned ?? 0} tone="up" colors={colors} />
                <StatCard label="지출" value={earnings.yearWithdrawn ?? 0} tone="down" colors={colors} />
                <StatCard
                  label="순수익"
                  value={earnings.yearNet ?? 0}
                  tone={(earnings.yearNet ?? 0) >= 0 ? "up" : "down"}
                  colors={colors}
                />
              </View>

              <WalletEarningsExport
                months={earnings.months ?? []}
                transactions={earnings.transactions ?? []}
                year={earnings.year}
                yearNet={earnings.yearNet ?? 0}
                colors={colors}
              />

              {(earnings.bySource ?? []).map((s) => (
                <WalletMembershipStrip
                  key={s.key}
                  title={s.label}
                  right={fmtUsd(s.amount)}
                  backgroundColor={colors.forest}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  tone,
  colors,
}: {
  label: string;
  value: number;
  tone: "up" | "down";
  colors: ThemeColors;
}) {
  return (
    <View style={[statStyles.card, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[statStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[statStyles.value, { color: tone === "up" ? colors.success : colors.danger }]}>
        {tone === "down" && value > 0 ? "-" : ""}
        {formatUsd(Math.abs(value))}
      </Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
  },
  label: { fontSize: 11, fontWeight: "700" },
  value: { fontSize: 13, fontWeight: "900", marginTop: 4 },
});

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    listBody: { paddingBottom: 40 },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 2,
      gap: spacing.xs,
    },
    backHit: { marginLeft: -6, padding: 2 },
    tabs: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
      gap: spacing.md,
    },
    tabLabel: {
      fontSize: 26,
      fontWeight: "900",
      color: colors.textMuted,
      opacity: 0.45,
    },
    tabLabelActive: {
      color: colors.text,
      opacity: 1,
    },
    section: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "900",
      marginBottom: spacing.sm,
    },
    returnBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
      gap: 6,
    },
    returnBannerTitle: { fontWeight: "800", fontSize: 15 },
    returnBannerBody: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
    statRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    yearRow: {
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    yearChip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    yearChipText: { fontWeight: "800", fontSize: 13 },
    webLink: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    webLinkText: { fontWeight: "800" },
    walletHelp: {
      textAlign: "center",
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.sm,
    },
    center: { flex: 1, padding: spacing.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm },
    error: { color: colors.danger, fontWeight: "700", textAlign: "center" },
  });
}
