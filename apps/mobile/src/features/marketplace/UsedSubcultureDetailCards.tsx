import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "@/config/env";
import { formatUsedPrice, productTypeLabel } from "@/features/marketplace/used-catalog";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type SaleRecord = {
  id: string;
  soldPrice: number;
  currency: string;
  soldAt: string;
  characterName: string | null;
};

export function UsedSaleStatsCard({
  workTitle,
  animeSlug,
  productType,
  characterName,
}: {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
}) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const dateLocale = locale.startsWith("en") ? "en-US" : "ko-KR";
  const [median, setMedian] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workTitle && !animeSlug && !productType) {
      setLoaded(true);
      return;
    }
    const params = new URLSearchParams();
    if (animeSlug) params.set("anime", animeSlug);
    else if (workTitle) params.set("work", workTitle);
    if (productType) params.set("product", productType);
    if (characterName) params.set("character", characterName);

    let alive = true;
    void fetch(`${API_BASE_URL}/api/subculture/sales?${params}`)
      .then((r) => r.json())
      .then((d: { records?: SaleRecord[]; median?: number | null }) => {
        if (!alive) return;
        setRecords(d.records ?? []);
        setMedian(d.median ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [workTitle, animeSlug, productType, characterName]);

  if (!loaded || records.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("m.marketplace.recent_sale_prices")}</Text>
        {median != null && records[0] ? (
          <Text style={styles.median}>
            {t("m.marketplace.median")} {formatUsedPrice(median, records[0].currency, t)}
          </Text>
        ) : null}
      </View>
      {records.slice(0, 5).map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={styles.rowLeft} numberOfLines={1}>
            {new Date(r.soldAt).toLocaleDateString(dateLocale)}
            {r.characterName ? ` · ${r.characterName}` : ""}
          </Text>
          <Text style={styles.rowRight}>{formatUsedPrice(r.soldPrice, r.currency, t)}</Text>
        </View>
      ))}
    </View>
  );
}

export function SubcultureMetaChips({
  workTitle,
  productType,
  characterName,
  conditionGrade,
  tradeMode,
}: {
  workTitle?: string | null;
  productType?: string | null;
  characterName?: string | null;
  conditionGrade?: string | null;
  tradeMode?: string | null;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const chips = [
    workTitle,
    productType ? productTypeLabel(productType, t) : null,
    characterName,
    conditionGrade,
    tradeMode === "TRADE"
      ? t("m.marketplace.trade")
      : tradeMode === "SELL_OR_TRADE"
        ? t("m.marketplace.sell_or_trade")
        : null,
  ].filter(Boolean) as string[];

  if (chips.length === 0) return null;

  return (
    <View style={styles.chips}>
      {chips.map((c) => (
        <View key={c} style={styles.chip}>
          <Text style={styles.chipText}>{c}</Text>
        </View>
      ))}
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginTop: spacing.md,
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.15)",
      backgroundColor: colors.muted,
      gap: 6,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    title: { fontWeight: "800", color: colors.cobalt, fontSize: 14 },
    median: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    rowLeft: { flex: 1, fontSize: 11, color: colors.textMuted },
    rowRight: { fontSize: 11, fontWeight: "800", color: colors.text },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.sm,
      backgroundColor: "rgba(27, 74, 140, 0.1)",
    },
    chipText: { fontSize: 11, fontWeight: "700", color: colors.cobalt },
  });
}
