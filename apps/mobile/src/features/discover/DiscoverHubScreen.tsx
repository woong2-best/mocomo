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
import { useI18n } from "@/i18n/I18nProvider";

type HubTarget =
  | { kind: "stack"; route: keyof RootStackParamList }
  | { kind: "tab"; route: keyof RootTabParamList };

export function DiscoverHubScreen() {
  const { u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const sections = useMemo(
    (): {
      title: string;
      subtitle: string;
      target: HubTarget;
      icon: keyof typeof Ionicons.glyphMap;
    }[] => [
      {
        title: u("검색", "Search"),
        subtitle: u("사람 · 게시 · 애니", "People · posts · anime"),
        target: { kind: "stack", route: "Search" },
        icon: "search-outline",
      },
      {
        title: u("라이브", "Live"),
        subtitle: u("시청 · 방송 시작", "Watch · go live"),
        target: { kind: "stack", route: "LiveList" },
        icon: "radio-outline",
      },
      {
        title: u("메세지", "Messages"),
        subtitle: "DM",
        target: { kind: "tab", route: "Messages" },
        icon: "chatbubbles-outline",
      },
      {
        title: "STAR",
        subtitle: u("저장한 게시물", "Saved posts"),
        target: { kind: "stack", route: "StarList" },
        icon: "star-outline",
      },
      {
        title: u("컬쳐 위키", "Culture wiki"),
        subtitle: u("작품 탐색", "Browse titles"),
        target: { kind: "stack", route: "AnimeList" },
        icon: "book-outline",
      },
      {
        title: "MCM",
        subtitle: "More Commerce Moment",
        target: { kind: "stack", route: "Market" },
        icon: "storefront-outline",
      },
      {
        title: "QnA",
        subtitle: u("질문·답변 피드", "Q&A feed"),
        target: { kind: "stack", route: "CommunityList" },
        icon: "people-outline",
      },
      {
        title: u("이벤트", "Events"),
        subtitle: u("참여·대회", "Join · contests"),
        target: { kind: "stack", route: "EventsList" },
        icon: "calendar-outline",
      },
      {
        title: u("지갑", "Wallet"),
        subtitle: u("잔액·정산", "Balance · payouts"),
        target: { kind: "stack", route: "Wallet" },
        icon: "wallet-outline",
      },
      {
        title: u("설정", "Settings"),
        subtitle: u("프로필·언어", "Profile · language"),
        target: { kind: "stack", route: "Settings" },
        icon: "settings-outline",
      },
    ],
    [u]
  );

  return (
    <Screen>
      <AppHeader title={u("탐색", "Discover")} leftLabel={u("뒤로", "Back")} onLeftPress={() => navigation.goBack()} />
      <View style={styles.grid}>
        {sections.map((s) => (
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
