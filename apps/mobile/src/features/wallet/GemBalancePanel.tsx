import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { fetchGemsWallet, type GemPurchaseRow, type GemsWalletResponse } from "@/api/gems";
import { saveWalletBootstrap } from "@/api/wallet-bootstrap-cache";
import { formatUsd } from "@/lib/money";
import { FolkCard } from "@/ui/FolkCard";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

const EMPTY_WALLET: GemsWalletResponse = {
  balance: 0,
  minTopupMoco: 1,
  termsCopy: "",
  purchases: [],
};

function formatMoco(moco: number) {
  return `${Math.max(0, moco).toLocaleString()} MOCO`;
}

function formatWhen(iso: string): { absolute: string; relative: string } {
  const d = new Date(iso);
  const absolute = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  const diff = Date.now() - d.getTime();
  const mins = Math.max(0, Math.floor(diff / 60_000));
  let relative = "방금";
  if (mins >= 1 && mins < 60) relative = `${mins}분 전`;
  else if (mins >= 60 && mins < 60 * 24) relative = `${Math.floor(mins / 60)}시간 전`;
  else if (mins >= 60 * 24 && mins < 60 * 24 * 7) relative = `${Math.floor(mins / (60 * 24))}일 전`;
  else if (mins >= 60 * 24 * 7) relative = absolute;

  return { absolute, relative };
}

function PurchaseRow({
  row,
  colors,
  styles,
}: {
  row: GemPurchaseRow;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const when = formatWhen(row.createdAt);
  const used = row.remainingGems < row.gems;
  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyIcon, { backgroundColor: `${colors.cobalt}18` }]}>
        <Ionicons name="diamond-outline" size={18} color={colors.cobalt} />
      </View>
      <View style={styles.historyMeta}>
        <Text style={styles.historyTitle}>
          {formatMoco(row.gems)}
          {row.refunded ? " · 환불" : used ? " · 일부 사용" : ""}
        </Text>
        <Text style={styles.historyWhen}>{when.absolute}</Text>
        {when.relative !== when.absolute ? (
          <Text style={styles.historyRel}>{when.relative}</Text>
        ) : null}
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyPaid}>{formatUsd(row.krwAmount)}</Text>
        <Text style={styles.historyRemain}>잔여 {formatMoco(row.remainingGems)}</Text>
      </View>
    </View>
  );
}

export function GemBalancePanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const query = useQuery({
    queryKey: ["mobile-gems-wallet"],
    queryFn: fetchGemsWallet,
    placeholderData: (prev) => prev ?? EMPTY_WALLET,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!query.data || query.data === EMPTY_WALLET) return;
    void saveWalletBootstrap({ gems: query.data });
  }, [query.data]);

  const data = query.data ?? EMPTY_WALLET;
  const purchases = data.purchases;

  return (
    <View style={styles.wrap}>
      <FolkCard style={styles.balanceCard} padded={false}>
        <View style={styles.balanceInner}>
          <Text style={styles.caption}>MOCO 잔액</Text>
          <Text style={styles.balance}>{formatMoco(data.balance)}</Text>
          <Text style={styles.webHint}>충전은 mocomo.net 웹사이트에서만 할 수 있습니다.</Text>
        </View>
      </FolkCard>

      <View style={styles.historyHead}>
        <Text style={styles.historyCaption}>충전 내역</Text>
        <Text style={styles.historyCount}>
          {purchases.length > 0 ? `${purchases.length}건` : ""}
        </Text>
      </View>

      {purchases.length === 0 ? (
        <FolkCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>아직 충전 내역이 없습니다</Text>
          <Text style={styles.emptyBody}>웹에서 MOCO를 충전하신 뒤 날짜·시각과 함께 여기에 표시됩니다.</Text>
        </FolkCard>
      ) : (
        <FolkCard padded={false} style={styles.historyCard}>
          {purchases.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <View style={styles.rowLine} /> : null}
              <PurchaseRow row={p} colors={colors} styles={styles} />
            </View>
          ))}
        </FolkCard>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    balanceCard: {
      overflow: "hidden",
    },
    balanceInner: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      gap: 6,
    },
    caption: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    balance: {
      fontSize: 32,
      fontWeight: "900",
      color: colors.cobalt,
      fontVariant: ["tabular-nums"],
    },
    webHint: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
      color: colors.textMuted,
    },
    historyHead: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      paddingHorizontal: 2,
    },
    historyCaption: {
      fontSize: 16,
      fontWeight: "900",
      color: colors.text,
    },
    historyCount: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
    },
    historyCard: {
      overflow: "hidden",
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    historyIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    historyMeta: { flex: 1, minWidth: 0, gap: 2 },
    historyTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
    },
    historyWhen: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 2,
    },
    historyRel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    historyRight: { alignItems: "flex-end", gap: 4 },
    historyPaid: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    historyRemain: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
    },
    rowLine: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.hairline,
      marginLeft: 64,
    },
    emptyCard: { gap: 6 },
    emptyTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    emptyBody: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: colors.textMuted },
  });
}
