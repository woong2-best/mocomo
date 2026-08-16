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
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { SearchField } from "@/ui/SearchField";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function SearchScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
      onPress: () => void;
    }[] = [];
    for (const u of query.data.users) {
      rows.push({
        key: `u-${u.id}`,
        kind: "사람",
        title: u.name || u.username,
        subtitle: `@${u.username}`,
        onPress: () => navigation.navigate("UserProfile", { username: u.username }),
      });
    }
    for (const p of query.data.posts) {
      rows.push({
        key: `p-${p.id}`,
        kind: "게시물",
        title: p.title || p.content.slice(0, 80) || "게시물",
        onPress: () => navigation.navigate("PostDetail", { id: p.id }),
      });
    }
    for (const a of query.data.animes) {
      rows.push({
        key: `a-${a.slug}`,
        kind: "컬처위키",
        title: a.title,
        subtitle: a.titleEn ?? undefined,
        onPress: () => navigation.navigate("AnimeDetail", { slug: a.slug }),
      });
    }
    for (const live of query.data.liveStreams) {
      rows.push({
        key: `l-${live.id}`,
        kind: "라이브",
        title: live.name,
        subtitle: live.category,
        onPress: () => navigation.navigate("LiveDetail", { id: live.id }),
      });
    }
    return rows;
  }, [navigation, query.data]);

  return (
    <Screen>
      <AppHeader title="검색" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={styles.searchRow}>
        <SearchField
          value={q}
          onChangeText={setQ}
          onClear={() => {
            setQ("");
            setSubmitted("");
          }}
          onSubmitEditing={() => setSubmitted(q.trim())}
          placeholder="사람, 애니, 게시물 검색"
        />
      </View>

      {!submitted ? (
        <Text style={styles.hint}>웹과 같은 통합 검색입니다.</Text>
      ) : query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.terracotta} />
      ) : query.isError ? (
        <Text style={styles.error}>검색에 실패했습니다.</Text>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40, gap: 8 }}
          ListEmptyComponent={<Text style={styles.hint}>결과가 없습니다.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={item.onPress}>
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

