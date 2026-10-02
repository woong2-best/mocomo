import { useMemo, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchSettlementHistoryPage,
  type SettlementHistoryItem,
} from "@/api/settlement-on-demand";
import { WalletMembershipStrip } from "@/features/wallet/WalletMembershipStrip";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

function formatMinor(minor: number, currency: string): string {
  const c = currency.toLowerCase();
  if (c === "usd") return `$${(minor / 100).toFixed(2)}`;
  if (c === "krw") return `₩${minor.toLocaleString()}`;
  return `${minor} ${currency.toUpperCase()}`;
}

function formatNet(item: SettlementHistoryItem): string {
  if (item.kind === "monthly_cycle") {
    if (item.netAmountMinor == null || !item.currency) {
      return `${item.deductedMoco.toLocaleString()} MOCO`;
    }
    return formatMinor(item.netAmountMinor, item.currency);
  }
  return formatMinor(item.netAmountMinor, item.currency);
}

function titleFor(item: SettlementHistoryItem): string {
  if (item.kind === "on_demand_withdrawal") {
    return `Instant · ${item.withdrawMoco.toLocaleString()} MOCO`;
  }
  return `Monthly · ${item.periodYear}.${String(item.periodMonth).padStart(2, "0")}`;
}

function subtitleFor(item: SettlementHistoryItem): string {
  if (item.kind === "on_demand_withdrawal") {
    return `${item.status} · ${item.payoutTier}`;
  }
  return `${item.status} · ${item.lockedMoco.toLocaleString()} MOCO locked`;
}

type Props = {
  listFooter?: ReactNode;
};

export function UnifiedSettlementHistoryPanel({ listFooter }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const query = useInfiniteQuery({
    queryKey: ["settlement-history"],
    queryFn: ({ pageParam }) => fetchSettlementHistoryPage({ cursor: pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    staleTime: 30_000,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Reward payout history</Text>
      {query.isLoading ? <ActivityIndicator color={colors.cobalt} /> : null}
      {query.isError ? (
        <Text style={[styles.muted, { color: colors.danger }]}>Could not load payout history.</Text>
      ) : null}
      {!query.isLoading && items.length === 0 ? (
        <Text style={[styles.muted, { color: colors.textMuted }]}>No payout history yet.</Text>
      ) : null}
      {items.map((item) => (
        <View key={`${item.kind}-${item.id}`} style={styles.row}>
          <View style={styles.badgeRow}>
            <PayoutBadge kind={item.kind} colors={colors} />
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {new Date(item.at).toLocaleDateString()}
            </Text>
          </View>
          <WalletMembershipStrip
            title={titleFor(item)}
            subtitle={subtitleFor(item)}
            right={formatNet(item)}
            backgroundColor={
              item.status === "COMPLETED" || item.status === "PAID" ? colors.forest : "#4b5563"
            }
          />
        </View>
      ))}
      {query.hasNextPage ? (
        <Pressable
          onPress={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          style={[styles.loadMore, { borderColor: colors.hairline }]}
        >
          <Text style={[styles.loadMoreText, { color: colors.brand }]}>
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Text>
        </Pressable>
      ) : null}
      {listFooter}
    </View>
  );
}

function PayoutBadge({
  kind,
  colors,
}: {
  kind: SettlementHistoryItem["kind"];
  colors: ThemeColors;
}) {
  const instant = kind === "on_demand_withdrawal";
  return (
    <View
      style={[
        stylesBadge.chip,
        {
          backgroundColor: instant ? `${colors.cobalt}22` : `${colors.cobalt}12`,
          borderColor: instant ? colors.cobalt : colors.hairline,
        },
      ]}
    >
      <Text style={[stylesBadge.text, { color: instant ? colors.cobalt : colors.textMuted }]}>
        {instant ? "🟣 Instant" : "🔵 Monthly"}
      </Text>
    </View>
  );
}

const stylesBadge = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    heading: { fontSize: 16, fontWeight: "900" },
    muted: { fontSize: 12, fontWeight: "600" },
    row: { gap: 4 },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
    date: { fontSize: 10, fontWeight: "600" },
    loadMore: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    loadMoreText: { fontSize: 13, fontWeight: "800" },
  });
}
