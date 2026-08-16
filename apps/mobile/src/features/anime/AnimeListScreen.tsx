import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchAnimeList, type AnimeListItem } from "@/api/discovery";
import {
  MOBILE_ANIME_GENRES,
  genreToApiParam,
  type MobileAnimeGenreId,
} from "@/features/anime/anime-genres";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function AnimeListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [genre, setGenre] = useState<MobileAnimeGenreId | null>(null);
  const colGap = 10;
  const pad = spacing.md;
  const cardW = (width - pad * 2 - colGap) / 2;
  const decode = feedMediaDecodeWidth(cardW);

  const query = useQuery({
    queryKey: ["mobile-anime", submitted, genre],
    queryFn: () =>
      fetchAnimeList({
        q: submitted || undefined,
        genre: genre ? genreToApiParam(genre) : undefined,
      }),
    staleTime: 60_000,
  });

  const items = query.data?.items ?? [];

  const renderItem = useCallback(
    ({ item }: { item: AnimeListItem }) => (
      <Pressable
        style={[styles.item, { width: cardW }]}
        onPress={() => navigation.navigate("AnimeDetail", { slug: item.slug })}
      >
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl, width: decode, height: Math.round(decode * (4 / 3)) }}
            style={styles.cover}
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={item.coverUrl}
            transition={0}
          />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverEmoji}>📺</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.titleEn ? (
          <Text style={styles.sub} numberOfLines={1}>
            {item.titleEn}
          </Text>
        ) : null}
      </Pressable>
    ),
    [cardW, decode, navigation, styles]
  );

  const header = (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="작품 검색"
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setSubmitted(q.trim())}
          returnKeyType="search"
        />
        <FolkButton label="검색" onPress={() => setSubmitted(q.trim())} style={styles.searchBtn} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
      >
        <GenrePill
          label="전체"
          active={genre === null}
          onPress={() => setGenre(null)}
          colors={colors}
        />
        {MOBILE_ANIME_GENRES.map((g) => (
          <GenrePill
            key={g.id}
            label={g.label}
            active={genre === g.id}
            onPress={() => setGenre(g.id)}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen>
      <AppHeader title="애니·위키" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading && !query.data ? (
        <>
          {header}
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
        </>
      ) : query.isError && !query.data ? (
        <>
          {header}
          <View style={styles.center}>
            <Text style={styles.error}>목록을 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
          </View>
        </>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.slug}
          numColumns={2}
          columnWrapperStyle={{ gap: colGap, paddingHorizontal: pad }}
          contentContainerStyle={{ gap: colGap, paddingBottom: 40 }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>아직 등록된 작품이 없습니다.</Text>
              <Text style={styles.emptyHint}>다른 장르를 고르거나 검색해 보세요.</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

function GenrePill({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        pillStyles.pill,
        active
          ? { backgroundColor: "#DC2626", borderColor: "#DC2626" }
          : {
              backgroundColor: colors.muted,
              borderColor: colors.border,
            },
      ]}
    >
      <Text style={[pillStyles.label, { color: active ? "#fff" : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: { fontSize: 12, fontWeight: "700" },
});

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    searchRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
    },
    searchBtn: { paddingHorizontal: 14 },
    pills: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    item: {
      overflow: "hidden",
    },
    cover: {
      width: "100%",
      aspectRatio: 3 / 4,
      backgroundColor: colors.muted,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    coverFallback: { alignItems: "center", justifyContent: "center" },
    coverEmoji: { fontSize: 28 },
    title: {
      marginTop: 6,
      fontWeight: "800",
      color: colors.text,
      fontSize: 13,
      lineHeight: 17,
    },
    sub: {
      marginTop: 2,
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
    },
    emptyBox: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      paddingVertical: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      backgroundColor: colors.muted,
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },
    emptyHint: { color: colors.textMuted, fontWeight: "600", fontSize: 12 },
    center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
    error: { color: colors.danger, fontWeight: "700" },
  });
}
