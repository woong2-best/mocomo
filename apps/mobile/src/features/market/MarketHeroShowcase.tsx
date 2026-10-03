import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { MarketListingFilterId } from "@/lib/market-brand";
import { useI18n } from "@/i18n/I18nProvider";
import type { TFn } from "@/i18n/types";

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  filter?: MarketListingFilterId;
  action?: "sell";
  panelBg: string;
};

function buildSlides(t: TFn): Slide[] {
  return [
    {
      id: "custom",
      eyebrow: t("m.market.custom_orders_open"),
      title: t("m.market.cosplay_props_custom_made"),
      subtitle: t("m.market.check_lead_time_and_quotes_then"),
      cta: t("m.market.browse_custom_orders"),
      filter: "CUSTOM_ORDER",
      panelBg: "#F3E8D8",
    },
    {
      id: "preorder",
      eyebrow: t("m.market.pre_order"),
      title: t("m.market.limited_goods_reserve_early"),
      subtitle: t("m.market.grab_pre_order_drops_first_and"),
      cta: t("m.market.view_pre_orders"),
      filter: "PREORDER",
      panelBg: "#EDE6DA",
    },
    {
      id: "physical",
      eyebrow: t("m.market.in_stock"),
      title: t("m.market.goods_figures_physical_items"),
      subtitle: t("m.market.list_in_stock_items_and_sell"),
      cta: t("m.market.browse_physical_items"),
      filter: "PHYSICAL",
      panelBg: "#E8EEF8",
    },
    {
      id: "seller",
      eyebrow: t("m.market.seller_onboarding"),
      title: t("m.market.go_global_with_market_brand_name", { MARKET_BRAND_NAME: String(MARKET_BRAND_NAME) }),
      subtitle: t("m.market.finish_seller_signup_with_bank_business"),
      cta: t("m.market.register_as_seller"),
      action: "sell",
      panelBg: "#E8EFE6",
    },
  ];
}

function tabLabelFor(id: string, t: TFn): string {
  switch (id) {
    case "custom":
      return t("m.common.custom");
    case "preorder":
      return t("m.market.pre_order");
    case "physical":
      return t("m.market.in_stock");
    default:
      return t("m.market.start_selling");
  }
}

type Props = {
  onFilter: (filter: MarketListingFilterId) => void;
  onSellRegister?: () => void;
};

export function MarketHeroShowcase({ onFilter, onSellRegister }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const slides = useMemo(() => buildSlides(t), [t]);
  const [active, setActive] = useState(0);
  const slide = slides[active] ?? slides[0];

  function onCta() {
    if (slide.action === "sell") {
      onSellRegister?.();
    } else if (slide.filter) {
      onFilter(slide.filter);
    }
  }

  return (
    <View style={styles.shell}>
      <Pressable style={[styles.main, { backgroundColor: slide.panelBg }]} onPress={onCta}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={12} color={colors.terracotta} />
          <Text style={styles.badgeText}>{slide.eyebrow}</Text>
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{slide.cta}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsInner}
      >
        {slides.map((s, i) => {
          const selected = i === active;
          return (
            <Pressable
              key={s.id}
              onPress={() => setActive(i)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>
                {tabLabelFor(s.id, t)}
              </Text>
              <Text style={styles.tabSub} numberOfLines={1}>
                {s.eyebrow}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      overflow: "hidden",
      backgroundColor: colors.surfaceRaised,
    },
    main: { padding: spacing.lg, minHeight: 200, gap: 8 },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: "rgba(255,255,255,0.85)",
      borderWidth: 1,
      borderColor: "rgba(27, 74, 140, 0.15)",
    },
    badgeText: { fontSize: 11, fontWeight: "800", color: colors.cobalt },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      lineHeight: 28,
      marginTop: 4,
    },
    subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 19, maxWidth: 280 },
    cta: {
      marginTop: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: colors.terracotta,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.lg,
    },
    ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    tabs: { borderTopWidth: 2, borderTopColor: "rgba(27, 74, 140, 0.12)" },
    tabsInner: { flexDirection: "row" },
    tab: {
      minWidth: 96,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRightWidth: 1,
      borderRightColor: "rgba(27, 74, 140, 0.1)",
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
    },
    tabActive: {
      backgroundColor: colors.muted,
      borderLeftColor: colors.terracotta,
    },
    tabLabel: { fontSize: 12, fontWeight: "800", color: colors.text },
    tabLabelActive: { color: colors.terracotta },
    tabSub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  });
}
