import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchWallet, fetchWalletEarnings } from "@/api/discovery";
import { fetchBankStatus } from "@/api/checkout-payment";
import { fetchPaymentMethods, openPaymentMethodSetup, setDefaultPaymentMethod } from "@/payments/stripe-setup";
import { WalletCardStack } from "@/features/wallet/WalletCardStack";
import { WalletMembershipStrip } from "@/features/wallet/WalletMembershipStrip";
import { WalletEarningsChart } from "@/features/wallet/WalletEarningsChart";
import { BankVerifyPanel } from "@/features/wallet/BankVerifyPanel";
import { RevenuePayoutPanel } from "@/features/wallet/RevenuePayoutPanel";
import { buildPaymentMethodCards, buildRevenueCards } from "@/features/wallet/wallet-card-builders";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Tab = "wallet" | "earnings";

const LEDGER_LABELS: Record<string, string> = {
  SELLER_EARNING: "수익 적립",
  PAYOUT_REQUEST: "출금",
  PAYOUT_REJECTED: "출금 반려 환급",
};

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function WalletScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Wallet">>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(route.params?.initialTab ?? "wallet");
  const [year, setYear] = useState(new Date().getFullYear());
  const [addingCard, setAddingCard] = useState(false);
  const returnScreen = route.params?.returnScreen;
  const handleBankVerified = useCallback(() => {
    if (!returnScreen) return;
    navigation.replace(returnScreen);
  }, [navigation, returnScreen]);

  useEffect(() => {
    if (route.params?.initialTab) setTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  const walletQuery = useQuery({
    queryKey: ["mobile-wallet"],
    queryFn: () => fetchWallet(),
  });
  const paymentMethodsQuery = useQuery({
    queryKey: ["mobile-payment-methods"],
    queryFn: () => fetchPaymentMethods(),
    enabled: tab === "wallet",
  });
  const earningsQuery = useQuery({
    queryKey: ["mobile-wallet-earnings", year],
    queryFn: () => fetchWalletEarnings(year),
    enabled: tab === "earnings",
    retry: 1,
  });
  const bankStatusQuery = useQuery({
    queryKey: ["mobile-bank-status"],
    queryFn: fetchBankStatus,
    enabled: tab === "earnings",
  });

  const data = walletQuery.data;
  const earnings = earningsQuery.data;
  const paymentMethods = paymentMethodsQuery.data?.methods ?? [];
  const withdrawable = data ? Math.max(0, data.availableBalance - data.pendingPayout) : 0;
  const bankLabel = data?.bank
    ? `${data.bank.bankName} ${data.bank.accountMasked ?? ""}`
    : null;

  const paymentCards = useMemo(
    () => buildPaymentMethodCards(paymentMethods, colors),
    [colors, paymentMethods]
  );

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

  const onPaymentCardPress = useCallback(
    (cardId: string) => {
      if (cardId === "add") {
        if (addingCard) return;
        setAddingCard(true);
        void openPaymentMethodSetup()
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ["mobile-payment-methods"] });
            Alert.alert("등록 완료", "결제 수단이 추가되었습니다.");
          })
          .catch((e: unknown) => {
            Alert.alert("등록 실패", e instanceof Error ? e.message : "카드 등록에 실패했습니다.");
          })
          .finally(() => setAddingCard(false));
        return;
      }
      void setDefaultPaymentMethod(cardId)
        .then((res) => {
          queryClient.setQueryData(["mobile-payment-methods"], { methods: res.methods });
        })
        .catch(() => {
          Alert.alert("오류", "기본 결제 수단을 변경하지 못했습니다.");
        });
    },
    [addingCard, queryClient]
  );

  const walletLoading = walletQuery.isLoading && !walletQuery.data;
  const paymentLoading =
    tab === "wallet" && paymentMethodsQuery.isLoading && !paymentMethodsQuery.data;
  const earningsLoading = tab === "earnings" && earningsQuery.isLoading && !earningsQuery.data;

  return (
    <Screen>
      <AppHeader title="" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={styles.root}>
        <View style={styles.tabs}>
          {(
            [
              { id: "wallet" as const, label: "지갑" },
              { id: "earnings" as const, label: "수익" },
            ] as const
          ).map((t) => (
            <Pressable key={t.id} onPress={() => setTab(t.id)}>
              <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {walletQuery.isError && !data ? (
          <View style={styles.center}>
            <Text style={styles.error}>지갑을 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void walletQuery.refetch()} />
          </View>
        ) : tab === "wallet" ? (
          walletLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
          ) : !data ? null : (
            <>
              <WalletCardStack
                cards={paymentCards}
                colors={colors}
                onFrontCardPress={onPaymentCardPress}
                hint="탭하여 등록 · 좌우로 카드 전환"
              />
              {paymentLoading || addingCard ? (
                <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.terracotta} />
              ) : null}
              <Text style={styles.walletHelp}>
                결제할 때 이 카드 목록에서 선택합니다. 맨 앞 카드를 눌러 추가하세요.
              </Text>
            </>
          )
        ) : earningsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
        ) : earningsQuery.isError || !earnings || !data ? (
          <View style={styles.center}>
            <Text style={styles.error}>수익 데이터를 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void earningsQuery.refetch()} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
            {returnScreen && !(bankStatusQuery.data?.bankVerified || data.bank) ? (
              <View
                style={[
                  styles.returnBanner,
                  { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised },
                ]}
              >
                <Text style={[styles.returnBannerTitle, { color: colors.text }]}>
                  수익 입금 계좌 등록
                </Text>
                <Text style={[styles.returnBannerBody, { color: colors.textMuted }]}>
                  판매·중고·크리에이터 수익을 받으려면 아래에서 본인 명의 계좌 1원 인증을 완료해 주세요.
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
                  right={`${item.type === "PAYOUT_REQUEST" ? "-" : "+"}${won(item.amount)}`}
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

            <BankVerifyPanel onVerified={handleBankVerified} />
            <RevenuePayoutPanel
              withdrawable={withdrawable}
              bankReady={!!bankStatusQuery.data?.bankVerified || !!data.bank}
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

              <WalletEarningsChart
                months={earnings.months ?? []}
                yearNet={earnings.yearNet ?? 0}
                colors={colors}
              />

              {(earnings.bySource ?? []).map((s) => (
                <WalletMembershipStrip
                  key={s.key}
                  title={s.label}
                  right={won(s.amount)}
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
        {Math.abs(value).toLocaleString("ko-KR")}원
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
    tabs: {
      flexDirection: "row",
      gap: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    tabLabel: {
      fontSize: 28,
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
