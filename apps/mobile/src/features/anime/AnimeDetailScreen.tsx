import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchAnimeDetail } from "@/api/discovery";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function AnimeDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AnimeDetail">>();
  const query = useQuery({
    queryKey: ["mobile-anime-detail", route.params.slug],
    queryFn: () => fetchAnimeDetail(route.params.slug),
  });
  const item = query.data?.item;

  return (
    <Screen>
      <AppHeader title="작품" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError || !item ? (
        <View style={styles.center}>
          <Text style={styles.error}>작품을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {item.coverUrl ? (
            <Image
              source={{ uri: item.coverUrl }}
              style={styles.cover}
              cachePolicy={IMAGE_CACHE_POLICY}
            />
          ) : null}
          <FolkCard>
            <Text style={styles.title}>{item.title}</Text>
            {item.titleEn ? <Text style={styles.en}>{item.titleEn}</Text> : null}
            <Text style={styles.meta}>
              {[item.genre, item.studio].filter(Boolean).join(" · ")}
            </Text>
            {item.synopsis ? <Text style={styles.synopsis}>{item.synopsis}</Text> : null}
            {item.tags?.length ? (
              <Text style={styles.tags}>{item.tags.slice(0, 8).join(" · ")}</Text>
            ) : null}
          </FolkCard>
        </ScrollView>
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: 48 },
  cover: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    backgroundColor: colors.muted,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.cobalt },
  en: { marginTop: 4, color: colors.textMuted, fontWeight: "600" },
  meta: { marginTop: spacing.sm, color: colors.textMuted, fontWeight: "700" },
  synopsis: { marginTop: spacing.md, color: colors.text, lineHeight: 22 },
  tags: { marginTop: spacing.sm, color: colors.terracotta, fontWeight: "700", fontSize: 13 },
  center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  error: { color: colors.danger, fontWeight: "700" },
});
}

