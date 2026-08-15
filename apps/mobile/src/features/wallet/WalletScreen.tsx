import { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { fetchWallet, fetchWalletEarnings } from "@/api/discovery";
import { fetchPaymentMethods, openPaymentMethodSetup, setDefaultPaymentMethod } from "@/payments/stripe-setup";
import { WalletCardStack } from "@/features/wallet/WalletCardStack";
import { WalletMembershipStrip } from "@/features/wallet/WalletMembershipStrip";
import { WalletEarningsChart } from "@/features/wallet/WalletEarningsChart";
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
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("wallet");
  const [year, setYear] = useState(new Date().getFullYear());
  const [addingCard, setAddingCard] = useState(false);

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

  const loading =
    walletQuery.isLoading ||
    (tab === "wallet" && paymentMethodsQuery.isLoading) ||
    (tab === "earnings" && earningsQuery.isLoading);

  return (
    <Screen>
      <AppHeader title="" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : walletQuery.isError || !data ? (
        <View style={styles.center}>
          <Text style={styles.error}>지갑을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void walletQuery.refetch()} />
        </View>
      ) : (
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

          {tab === "wallet" ? (
            <>
              <WalletCardStack
                cards={paymentCards}
                colors={colors}
                onFrontCardPress={onPaymentCardPress}
                hint="탭하여 등록 · 좌우로 카드 전환"
              />
              {addingCard ? (
                <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.terracotta} />
              ) : null}
              <Text style={styles.walletHelp}>
                결제할 때 이 카드 목록에서 선택합니다. 맨 앞 카드를 눌러 추가하세요.
              </Text>
            </>
          ) : earningsQuery.isError || !earnings ? (
            <View style={styles.center}>
              <Text style={styles.error}>수익 데이터를 불러오지 못했습니다.</Text>
              <FolkButton label="다시 시도" onPress={() => void earningsQuery.refetch()} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
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

              <Pressable
                style={[styles.webLink, { borderColor: colors.brand }]}
                onPress={() => void Linking.openURL("https://mocomo.net/wallet")}
              >
                <Text style={[styles.webLinkText, { color: colors.brand }]}>
                  웹에서 수익 계좌 1원 인증 · 출금 신청
                </Text>
              </Pressable>

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
      )}
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
