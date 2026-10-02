import { useMemo } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { fetchGames } from "@/api/discovery";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

const WEB_BASE = "https://mocomo.net";

export function GamesHubScreen() {
  const { u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation();
  const query = useQuery({
    queryKey: ["mobile-games"],
    queryFn: () => fetchGames(),
  });

  return (
    <Screen>
      <AppHeader title={u("게임", "Games")} leftLabel={u("뒤로", "Back")} onLeftPress={() => navigation.goBack()} />
      <Text style={styles.hint}>
        {u("앱에서는 목록을 보고, 플레이는 웹에서 이어집니다.", "Browse games in the app; play continues on the web.")}
      </Text>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{u("게임 목록을 불러오지 못했습니다.", "Could not load games.")}</Text>
          <FolkButton label={u("다시 시도", "Try again")} onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: spacing.sm }}
          ListEmptyComponent={<Text style={styles.muted}>{u("공개 게임이 없습니다.", "No public games yet.")}</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                if (item.href) void Linking.openURL(`${WEB_BASE}${item.href}`);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.sub} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.badge}>
                  {item.category} · {item.status}
                </Text>
              </View>
              <Text style={styles.open}>{u("웹에서", "On web")}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  hint: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    backgroundColor: colors.surfaceRaised,
    ...shadows.folkSm,
  },
  title: { fontWeight: "800", color: colors.cobalt, fontSize: 16 },
  sub: { marginTop: 4, color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  badge: { marginTop: 6, color: colors.terracotta, fontWeight: "700", fontSize: 12 },
  open: { fontWeight: "800", color: colors.cobalt, marginLeft: spacing.sm },
  muted: { color: colors.textMuted, padding: spacing.lg, fontWeight: "600" },
  center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  error: { color: colors.danger, fontWeight: "700" },
});
}

