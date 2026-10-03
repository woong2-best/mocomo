import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { fetchGemsWallet, type GemPurchaseRow, type GemsWalletResponse } from "@/api/gems";
import { saveWalletBootstrap } from "@/api/wallet-bootstrap-cache";
import { formatUsd } from "@/lib/money";
import { FolkCard } from "@/ui/FolkCard";
import { formatUsedTimeAgo, type UsedUiText } from "@/features/marketplace/used-catalog";
import { useI18n } from "@/i18n/I18nProvider";
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

function formatWhen(iso: string, locale: string, t: UsedUiText): { absolute: string; relative: string } {
  const d = new Date(iso);
  const absolute = new Intl.DateTimeFormat(locale.startsWith("en") ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  const relative = formatUsedTimeAgo(iso, t);
  return { absolute, relative: relative === absolute ? absolute : relative };
}

function PurchaseRow({
  row,
  colors,
  styles,
  locale,
  t,
}: {
  row: GemPurchaseRow;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  locale: string;
  t: UsedUiText;
}) {
  const when = formatWhen(row.createdAt, locale, t);
  const used = row.remainingGems < row.gems;
  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyIcon, { backgroundColor: `${colors.cobalt}18` }]}>
        <Ionicons name="diamond-outline" size={18} color={colors.cobalt} />
      </View>
      <View style={styles.historyMeta}>
        <Text style={styles.historyTitle}>
          {formatMoco(row.gems)}
          {row.refunded ? t("m.wallet.refunded") : used ? t("m.wallet.partially_used") : ""}
        </Text>
        <Text style={styles.historyWhen}>{when.absolute}</Text>
        {when.relative !== when.absolute ? (
          <Text style={styles.historyRel}>{when.relative}</Text>
        ) : null}
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyPaid}>{formatUsd(row.krwAmount)}</Text>
        <Text style={styles.historyRemain}>{t("m.wallet.left")} {formatMoco(row.remainingGems)}</Text>
      </View>
    </View>
  );
}

export function GemBalancePanel() {
  const { t, locale } = useI18n();
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
          <Text style={styles.caption}>{t("m.wallet.moco_balance")}</Text>
          <Text style={styles.balance}>{formatMoco(data.balance)}</Text>
          <Text style={styles.webHint}>{t("m.wallet.top_up_moco_on_mocomo_net")}</Text>
        </View>
      </FolkCard>

      <View style={styles.historyHead}>
        <Text style={styles.historyCaption}>{t("m.wallet.top_up_history")}</Text>
        <Text style={styles.historyCount}>
          {purchases.length > 0 ? t("m.wallet.length_items", { length: String(purchases.length) }) : ""}
        </Text>
      </View>

      {purchases.length === 0 ? (
        <FolkCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("m.wallet.no_top_ups_yet")}</Text>
          <Text style={styles.emptyBody}>{t("m.wallet.after_topping_up_on_the_web")}</Text>
        </FolkCard>
      ) : (
        <FolkCard padded={false} style={styles.historyCard}>
          {purchases.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <View style={styles.rowLine} /> : null}
              <PurchaseRow row={p} colors={colors} styles={styles} locale={locale} t={t} />
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
