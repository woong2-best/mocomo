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
import { fetchSettlementStatus } from "@/api/settlement";
import { WalletTransferPanel } from "@/features/wallet/WalletTransferPanel";
import { GemBalancePanel } from "@/features/wallet/GemBalancePanel";
import { WalletMembershipStrip } from "@/features/wallet/WalletMembershipStrip";
import { SupportTiersPanel } from "@/features/support/SupportTiersPanel";
import { WalletEarningsExport } from "@/features/wallet/WalletEarningsExport";
import { StripeConnectPanel } from "@/features/wallet/StripeConnectPanel";
import { RevenuePayoutPanel } from "@/features/wallet/RevenuePayoutPanel";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import {
  formatMocoDisplay,
  formatMocoSignedFromCents,
  ledgerCentsToMoco,
} from "@/lib/wallet-moco-display";
import { ReceivedTipsPanel } from "@/features/wallet/ReceivedTipsPanel";

type Tab = "wallet" | "earnings" | "transfer" | "tier";

const TAB_ITEMS: { id: Tab; label: string }[] = [
  { id: "wallet", label: "지갑" },
  { id: "earnings", label: "수익" },
  { id: "transfer", label: "전달" },
  { id: "tier", label: "등급" },
];

const LEDGER_LABELS: Record<string, string> = {
  SELLER_EARNING: "수익 적립",
  PAYOUT_REQUEST: "출금",
  PAYOUT_REJECTED: "출금 반려 환급",
};

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
  const settlementQuery = useQuery({
    queryKey: ["mobile-settlement-status"],
    queryFn: fetchSettlementStatus,
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
        ) : tab === "transfer" ? (
            <ScrollView contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
              <WalletTransferPanel />
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
                  Star Market·크리에이터 Reward 등 수익 정산을 받으려면 아래에서 Stripe Connect로
                  정산 계좌를 연동해 주세요. (중고 직거래·경매 보증금과는 별개입니다.)
                </Text>
              </View>
            ) : null}
            <SettlementProgressCard
              settlementMoco={settlementQuery.data?.settlementMocoPoints ?? 0}
              purchasedMoco={settlementQuery.data?.purchasedMocoPoints ?? 0}
              progress={settlementQuery.data?.rewardProgress}
              colors={colors}
            />

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
                <StatCard label="수익" cents={earnings.yearEarned ?? 0} tone="up" colors={colors} />
                <StatCard label="지출" cents={earnings.yearWithdrawn ?? 0} tone="down" colors={colors} />
                <StatCard
                  label="순수익"
                  cents={earnings.yearNet ?? 0}
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
                  right={formatMocoDisplay(ledgerCentsToMoco(s.amount))}
                  backgroundColor={colors.forest}
                />
              ))}

              {data.recent.slice(0, 8).map((item) => (
                <WalletMembershipStrip
                  key={item.id}
                  title={LEDGER_LABELS[item.type] ?? item.type}
                  subtitle={item.memo ?? undefined}
                  right={formatMocoSignedFromCents(item.amount, item.type !== "PAYOUT_REQUEST")}
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
                  title="아직 활동 보상 내역이 없습니다"
                  subtitle="후원·판매·구독 수익이 정산 MOCO로 적립됩니다"
                  backgroundColor="#4b5563"
                />
              ) : null}
            </View>

            <ReceivedTipsPanel />
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function SettlementProgressCard({
  settlementMoco,
  purchasedMoco,
  progress,
  colors,
}: {
  settlementMoco: number;
  purchasedMoco: number;
  progress?: {
    currentLabel: string;
    currentRewardUsd: number;
    nextLabel: string | null;
    nextRequiredMoco: number | null;
    mocoRemaining: number;
    nextRewardUsd: number | null;
    atMaxTier: boolean;
  };
  colors: ThemeColors;
}) {
  const nextRequired = progress?.nextRequiredMoco ?? 0;
  const ratio = !progress
    ? 0
    : progress.atMaxTier || nextRequired <= 0
      ? 1
      : Math.min(1, Math.max(0, settlementMoco / nextRequired));
  return (
    <View style={[stylesCard.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[stylesCard.kicker, { color: colors.textMuted }]}>정산 MOCO · 다른 사용자에게 받은 수량</Text>
      <Text style={[stylesCard.amount, { color: colors.text }]}>{settlementMoco.toLocaleString()} MOCO</Text>
      <Text style={[stylesCard.line, { color: colors.text }]}>
        정산 등급 {progress?.currentLabel ?? "Novice"}
      </Text>
      <View style={[stylesCard.track, { backgroundColor: colors.hairline }]}>
        <View style={[stylesCard.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: colors.cobalt }]} />
      </View>
      <Text style={[stylesCard.note, { color: colors.textMuted }]}>
        {progress?.atMaxTier
          ? "최고 정산 등급입니다."
          : progress?.nextLabel
            ? `${progress.nextLabel}까지 정산 MOCO ${progress.mocoRemaining.toLocaleString()}를 더 받아야 합니다.`
            : "정산 등급을 불러오는 중…"}
      </Text>
      <Text style={[stylesCard.note, { color: colors.textMuted }]}>
        보유 MOCO {purchasedMoco.toLocaleString()}는 결제로 충전한 수량이라 정산 등급에 포함되지 않습니다.
      </Text>
    </View>
  );
}

const stylesCard = StyleSheet.create({
  box: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: 6,
  },
  kicker: { fontSize: 13, fontWeight: "700" },
  amount: { fontSize: 28, fontWeight: "900" },
  line: { fontSize: 15, fontWeight: "800" },
  track: { height: 8, borderRadius: 99, overflow: "hidden", marginVertical: 4 },
  fill: { height: 8, borderRadius: 99 },
  note: { fontSize: 12, lineHeight: 17 },
});

function StatCard({
  label,
  cents,
  tone,
  colors,
}: {
  label: string;
  cents: number;
  tone: "up" | "down";
  colors: ThemeColors;
}) {
  const moco = ledgerCentsToMoco(cents);
  return (
    <View style={[statStyles.card, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[statStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[statStyles.value, { color: tone === "up" ? colors.success : colors.danger }]}>
        {tone === "down" && moco > 0 ? "-" : tone === "up" && moco > 0 ? "+" : ""}
        {formatMocoDisplay(moco)}
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
      flexWrap: "nowrap",
      alignItems: "flex-end",
      gap: spacing.sm,
    },
    tabLabel: {
      fontSize: 20,
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
