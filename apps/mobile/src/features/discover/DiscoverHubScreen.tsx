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
  const { t } = useI18n();
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
        title: t("m.common.search"),
        subtitle: t("m.discover.people_posts_anime"),
        target: { kind: "stack", route: "Search" },
        icon: "search-outline",
      },
      {
        title: t("m.common.live"),
        subtitle: t("m.discover.watch_go_live"),
        target: { kind: "stack", route: "LiveList" },
        icon: "radio-outline",
      },
      {
        title: t("m.discover.messages"),
        subtitle: "DM",
        target: { kind: "tab", route: "Messages" },
        icon: "chatbubbles-outline",
      },
      {
        title: "STAR",
        subtitle: t("m.discover.saved_posts"),
        target: { kind: "stack", route: "StarList" },
        icon: "star-outline",
      },
      {
        title: t("m.common.culture_wiki_2"),
        subtitle: t("m.discover.browse_titles"),
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
        subtitle: t("m.discover.q_a_feed"),
        target: { kind: "stack", route: "CommunityList" },
        icon: "people-outline",
      },
      {
        title: t("m.common.events"),
        subtitle: t("m.discover.join_contests"),
        target: { kind: "stack", route: "EventsList" },
        icon: "calendar-outline",
      },
      {
        title: t("m.discover.wallet"),
        subtitle: t("m.discover.balance_payouts"),
        target: { kind: "stack", route: "Wallet" },
        icon: "wallet-outline",
      },
      {
        title: t("m.discover.settings"),
        subtitle: t("m.discover.profile_language"),
        target: { kind: "stack", route: "Settings" },
        icon: "settings-outline",
      },
    ],
    [t]
  );

  return (
    <Screen>
      <AppHeader title={t("m.discover.discover")} leftLabel={t("m.common.back")} onLeftPress={() => navigation.goBack()} />
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
