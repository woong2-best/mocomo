import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ServiceItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: "terracotta" | "cobalt" | "forest" | "gold";
  onPress: (nav: Nav) => void;
};

const SERVICES: ServiceItem[] = [
  {
    key: "all",
    label: `전체\n${MARKET_BRAND_NAME.split(" ").slice(-1)[0]}`,
    icon: "storefront-outline",
    colorKey: "terracotta",
    onPress: () => {},
  },
  {
    key: "physical",
    label: "일반상품",
    icon: "cube-outline",
    colorKey: "cobalt",
    onPress: () => {},
  },
  {
    key: "custom",
    label: "주문제작",
    icon: "color-palette-outline",
    colorKey: "forest",
    onPress: () => {},
  },
  {
    key: "preorder",
    label: "예약판매",
    icon: "car-outline",
    colorKey: "gold",
    onPress: () => {},
  },
  {
    key: "sell",
    label: "판매 시작",
    icon: "add-circle-outline",
    colorKey: "terracotta",
    onPress: (nav) => nav.navigate("SellerRegister"),
  },
  {
    key: "used",
    label: "중고·경매",
    icon: "pricetag-outline",
    colorKey: "gold",
    onPress: (nav) => nav.navigate("Main", { screen: "Used" }),
  },
  {
    key: "orders",
    label: "내 주문",
    icon: "clipboard-outline",
    colorKey: "cobalt",
    onPress: (nav) => nav.navigate("MarketMy"),
  },
  {
    key: "seller",
    label: "판매자",
    icon: "briefcase-outline",
    colorKey: "terracotta",
    onPress: (nav) => nav.navigate("SellerListings"),
  },
];

type Props = {
  navigation: Nav;
  onFilter: (type: "ALL" | "PHYSICAL" | "CUSTOM_ORDER" | "PREORDER") => void;
};

export function MarketServiceStrip({ navigation, onFilter }: Props) {
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
              else s.onPress(navigation);
            }}
          >
            <View style={styles.iconBox}>
              <Ionicons name={s.icon} size={22} color={tone} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {s.label.replace(`\n${MARKET_BRAND_NAME.split(" ").slice(-1)[0]}`, "")}
              {s.key === "all" ? `\nMoment` : ""}
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
