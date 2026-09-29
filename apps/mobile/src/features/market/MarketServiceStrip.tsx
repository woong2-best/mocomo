import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ServiceItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: "terracotta" | "cobalt" | "forest" | "gold";
  action?: "sell" | "navigate";
  route?: "Main" | ParamlessRoute;
};

/** Destinations reachable from the strip without navigation params. */
type ParamlessRoute = "MarketMy" | "SellerListings";

function serviceLabel(key: string, u: (ko: string, en: string) => string): string {
  const brandTail = MARKET_BRAND_NAME.split(" ").slice(-1)[0];
  switch (key) {
    case "all":
      return u(`전체\n${brandTail}`, `All\n${brandTail}`);
    case "physical":
      return u("일반상품", "Physical");
    case "custom":
      return u("주문제작", "Custom order");
    case "preorder":
      return u("예약판매", "Pre-order");
    case "sell":
      return u("판매 시작", "Start selling");
    case "used":
      return u("중고거래", "Used market");
    case "orders":
      return u("내 주문", "My orders");
    case "seller":
      return u("판매자", "Seller");
    default:
      return key;
  }
}

const SERVICES: ServiceItem[] = [
  {
    key: "all",
    label: "",
    icon: "storefront-outline",
    colorKey: "terracotta",
  },
  {
    key: "physical",
    label: "",
    icon: "cube-outline",
    colorKey: "cobalt",
  },
  {
    key: "custom",
    label: "",
    icon: "color-palette-outline",
    colorKey: "forest",
  },
  {
    key: "preorder",
    label: "",
    icon: "car-outline",
    colorKey: "gold",
  },
  {
    key: "sell",
    label: "",
    icon: "add-circle-outline",
    colorKey: "terracotta",
    action: "sell",
  },
  {
    key: "used",
    label: "",
    icon: "pricetag-outline",
    colorKey: "gold",
    action: "navigate",
    route: "Main",
  },
  {
    key: "orders",
    label: "",
    icon: "clipboard-outline",
    colorKey: "cobalt",
    action: "navigate",
    route: "MarketMy",
  },
  {
    key: "seller",
    label: "",
    icon: "briefcase-outline",
    colorKey: "terracotta",
    action: "navigate",
    route: "SellerListings",
  },
];

type Props = {
  navigation: Nav;
  onFilter: (type: "ALL" | "PHYSICAL" | "CUSTOM_ORDER" | "PREORDER") => void;
  onSellRegister?: () => void;
};

export function MarketServiceStrip({ navigation, onFilter, onSellRegister }: Props) {
  const { u, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
    >
      {SERVICES.map((s) => {
        const tone = colors[s.colorKey];
        return (
          <Pressable
            key={s.key}
            style={styles.item}
            onPress={() => {
              if (s.key === "all") onFilter("ALL");
              else if (s.key === "physical") onFilter("PHYSICAL");
              else if (s.key === "custom") onFilter("CUSTOM_ORDER");
              else if (s.key === "preorder") onFilter("PREORDER");
              else if (s.action === "sell") onSellRegister?.();
              else if (s.action === "navigate" && s.route === "Main") {
                navigation.navigate("Main", { screen: "Used" });
              } else if (s.action === "navigate" && s.route && s.route !== "Main") {
                navigation.navigate(s.route);
              }
            }}
          >
            <View style={styles.iconBox}>
              <Ionicons name={s.icon} size={22} color={tone} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {serviceLabel(s.key, u)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { maxHeight: 96, marginTop: spacing.sm },
    row: { paddingHorizontal: spacing.md, gap: 6 },
    item: { width: 72, alignItems: "center", gap: 6, paddingVertical: 4 },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: 10,
      fontWeight: "700",
      textAlign: "center",
      color: colors.text,
      lineHeight: 13,
    },
  });
}
