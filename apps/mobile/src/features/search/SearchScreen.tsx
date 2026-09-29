import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { searchAll } from "@/api/social";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { SearchField } from "@/ui/SearchField";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

export function SearchScreen() {
  const { u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const query = useQuery({
    queryKey: ["mobile-search", submitted],
    queryFn: () => searchAll(submitted),
    enabled: submitted.length > 0,
  });

  const sections = useMemo(() => {
    if (!query.data) return [];
    const rows: {
      key: string;
      kind: string;
      title: string;
      subtitle?: string;
      onPressIn?: () => void;
      onPress: () => void;
    }[] = [];
    for (const user of query.data.users) {
      const seed = { username: user.username, name: user.name, image: user.image };
      rows.push({
        key: `u-${user.id}`,
        kind: u("사람", "People"),
        title: user.name || user.username,
        subtitle: `@${user.username}`,
        onPressIn: () => prefetchUserProfile(seed),
        onPress: () => openUserProfile(seed),
      });
    }
    for (const p of query.data.posts) {
      rows.push({
        key: `p-${p.id}`,
        kind: u("게시물", "Posts"),
        title: p.title || p.content.slice(0, 80) || u("게시물", "Post"),
        onPress: () => navigation.navigate("PostDetail", { id: p.id }),
      });
    }
    for (const a of query.data.animes) {
      rows.push({
        key: `a-${a.slug}`,
        kind: u("컬처위키", "Culture wiki"),
        title: a.title,
        subtitle: a.titleEn ?? undefined,
        onPress: () => navigation.navigate("AnimeDetail", { slug: a.slug }),
      });
    }
    for (const live of query.data.liveStreams) {
      rows.push({
        key: `l-${live.id}`,
        kind: u("라이브", "Live"),
        title: live.name,
        subtitle: live.category,
        onPress: () => navigation.navigate("LiveDetail", { id: live.id }),
      });
    }
    return rows;
  }, [navigation, openUserProfile, prefetchUserProfile, query.data, u]);

  return (
    <Screen>
      <AppHeader title={u("검색", "Search")} leftLabel={u("뒤로", "Back")} onLeftPress={() => navigation.goBack()} />
      <View style={styles.searchRow}>
        <SearchField
          value={q}
          onChangeText={setQ}
          onClear={() => {
            setQ("");
            setSubmitted("");
          }}
          onSubmitEditing={() => setSubmitted(q.trim())}
          placeholder={u("사람, 애니, 게시물 검색", "Search people, anime, posts")}
        />
      </View>

      {!submitted ? (
        <Text style={styles.hint}>{u("웹과 같은 통합 검색입니다.", "Same unified search as the website.")}</Text>
      ) : query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.terracotta} />
      ) : query.isError ? (
        <Text style={styles.error}>{u("검색에 실패했습니다.", "Search failed.")}</Text>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40, gap: 8 }}
          ListEmptyComponent={<Text style={styles.hint}>{u("결과가 없습니다.", "No results.")}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPressIn={item.onPressIn} onPress={item.onPress}>
              <Text style={styles.kind}>{item.kind}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  searchRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  hint: {
    color: colors.textMuted,
    padding: spacing.lg,
    fontWeight: "600",
  },
  error: { color: colors.danger, padding: spacing.lg, fontWeight: "600" },
  row: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    padding: spacing.md,
    ...shadows.folkSm,
  },
  kind: { fontSize: 11, fontWeight: "800", color: colors.terracotta, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  sub: { marginTop: 2, color: colors.textMuted, fontWeight: "600" },
});
}
