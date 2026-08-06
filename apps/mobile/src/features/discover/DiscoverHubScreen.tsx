import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList, RootTabParamList } from "@/navigation/types";

type HubTarget =
  | { kind: "stack"; route: keyof RootStackParamList }
  | { kind: "tab"; route: keyof RootTabParamList };

const SECTIONS: {
  title: string;
  subtitle: string;
  target: HubTarget;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { title: "검색", subtitle: "사람 · 게시 · 애니", target: { kind: "stack", route: "Search" }, icon: "search-outline" },
  { title: "라이브", subtitle: "시청 · 방송 시작", target: { kind: "stack", route: "LiveList" }, icon: "radio-outline" },
  { title: "메세지", subtitle: "DM", target: { kind: "tab", route: "Messages" }, icon: "chatbubbles-outline" },
  { title: "STAR", subtitle: "저장한 게시물", target: { kind: "stack", route: "StarList" }, icon: "star-outline" },
  { title: "애니·위키", subtitle: "작품 탐색", target: { kind: "stack", route: "AnimeList" }, icon: "book-outline" },
  { title: "STAR 마켓", subtitle: "크리에이터 상품", target: { kind: "tab", route: "Market" }, icon: "storefront-outline" },
  { title: "커뮤니티", subtitle: "관심사 모임", target: { kind: "stack", route: "CommunityList" }, icon: "people-outline" },
  { title: "이벤트", subtitle: "참여·대회", target: { kind: "stack", route: "EventsList" }, icon: "calendar-outline" },
  { title: "게임", subtitle: "미니게임 허브", target: { kind: "stack", route: "GamesHub" }, icon: "game-controller-outline" },
  { title: "지갑", subtitle: "잔액·정산", target: { kind: "stack", route: "Wallet" }, icon: "wallet-outline" },
  { title: "설정", subtitle: "프로필·언어", target: { kind: "stack", route: "Settings" }, icon: "settings-outline" },
];

export function DiscoverHubScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <AppHeader title="탐색" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={styles.grid}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s.title}
            style={styles.card}
            onPress={() => {
              if (s.target.kind === "tab") {
                navigation.navigate("Main", { screen: s.target.route });
              } else {
                navigation.navigate(s.target.route as never);
              }
            }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={s.icon} size={22} color={colors.cobalt} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardSub}>{s.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  grid: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.folkSm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.15)",
  },
  copy: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.cobalt },
  cardSub: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 2 },
});
}

