import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import type { MarketListingFilterId } from "@/lib/market-brand";

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

const SLIDES: Slide[] = [
  {
    id: "custom",
    eyebrow: "주문제작 OPEN",
    title: "코스프레·소품\n맞춤 제작",
    subtitle: "제작 일수·견적을 확인하고 크리에이터에게 바로 주문하세요.",
    cta: "주문제작 둘러보기",
    filter: "CUSTOM_ORDER",
    panelBg: "#F3E8D8",
  },
  {
    id: "preorder",
    eyebrow: "예약판매",
    title: "한정 굿즈\n미리 확보",
    subtitle: "예약 오픈 상품을 먼저 잡고, 발송 일정을 추적하세요.",
    cta: "예약판매 보기",
    filter: "PREORDER",
    panelBg: "#EDE6DA",
  },
  {
    id: "physical",
    eyebrow: "일반 판매",
    title: "굿즈·피규어\n실물 상품",
    subtitle: "재고 기반 실물 상품을 등록하고 전 세계에 판매하세요.",
    cta: "일반 상품 보기",
    filter: "PHYSICAL",
    panelBg: "#E8EEF8",
  },
  {
    id: "seller",
    eyebrow: "판매자 온보딩",
    title: `글로벌 ${MARKET_BRAND_NAME}\n판매 시작`,
    subtitle: "계좌·사업자·Stripe 경로로 판매자 등록을 완료하세요.",
    cta: "판매자 등록",
    action: "sell",
    panelBg: "#E8EFE6",
  },
];

type Props = {
  onFilter: (filter: MarketListingFilterId) => void;
  onSellRegister?: () => void;
};

export function MarketHeroShowcase({ onFilter, onSellRegister }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [active, setActive] = useState(0);
  const slide = SLIDES[active] ?? SLIDES[0];

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
        {SLIDES.map((s, i) => {
          const selected = i === active;
          return (
            <Pressable
              key={s.id}
              onPress={() => setActive(i)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>
                {s.id === "custom"
                  ? "주문제작"
                  : s.id === "preorder"
                    ? "예약판매"
                    : s.id === "physical"
                      ? "일반 판매"
                      : "판매 시작"}
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
