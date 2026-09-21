import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchAnimeDetail } from "@/api/discovery";
import { buildWikiBookPages, type WikiBookPage } from "@/features/anime/wiki-book-pages";
import { WikiContent } from "@/features/anime/WikiContent";
import { genreLabel } from "@/features/anime/anime-genres";
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
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AnimeDetail">>();
  const pagerRef = useRef<FlatList<WikiBookPage>>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [coverFailed, setCoverFailed] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-anime-detail", route.params.slug],
    queryFn: () => fetchAnimeDetail(route.params.slug),
  });
  const item = query.data?.item;

  const pages = useMemo(
    () =>
      item
        ? buildWikiBookPages({
            title: item.title,
            synopsis: item.synopsis,
            worldInfo: item.worldInfo,
            characters: item.characters,
          })
        : [],
    [item]
  );

  const goToPage = useCallback(
    (next: number) => {
      if (!pages.length) return;
      const clamped = Math.max(0, Math.min(pages.length - 1, next));
      if (clamped === pageIndex) return;
      pagerRef.current?.scrollToIndex({ index: clamped, animated: true });
      setPageIndex(clamped);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [pageIndex, pages.length]
  );

  const toggleChrome = useCallback(() => {
    setChromeVisible((v) => !v);
    void Haptics.selectionAsync();
  }, []);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
      if (idx !== pageIndex && idx >= 0 && idx < pages.length) {
        setPageIndex(idx);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [pageIndex, pages.length, width]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const idx = viewableItems[0]?.index;
    if (typeof idx === "number") setPageIndex(idx);
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const renderPage = useCallback(
    ({ item: page }: { item: WikiBookPage }) => (
      <View style={[styles.page, { width }]}>
        <FolkCard style={styles.pageCard} padded={false}>
          <ScrollView
            style={styles.pageScroll}
            contentContainerStyle={styles.pageScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Pressable onPress={toggleChrome} hitSlop={4}>
              <Text style={styles.pageLabel}>{page.label}</Text>
            </Pressable>

            {page.kind === "overview" && item ? (
              <View style={styles.overviewMeta}>
                <Text style={styles.title}>{item.title}</Text>
                {item.titleEn ? <Text style={styles.en}>{item.titleEn}</Text> : null}
                <Text style={styles.meta}>
                  {[genreLabel(item.genre), item.studio].filter(Boolean).join(" · ")}
                </Text>
                {item.tags?.length ? (
                  <Text style={styles.tags}>{item.tags.slice(0, 8).join(" · ")}</Text>
                ) : null}
              </View>
            ) : null}

            {page.source ? <WikiContent source={page.source} /> : null}

            {page.kind === "cast" && page.characters?.length ? (
              <View style={styles.castWrap}>
                {!page.source ? <Text style={styles.castHeading}>주요 등장인물</Text> : null}
                <View style={styles.castChips}>
                  {page.characters.map((name) => (
                    <View key={name} style={styles.castChip}>
                      <Text style={styles.castChipText}>{name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {page.kind === "overview" && !page.source && !item?.tags?.length ? (
              <Text style={styles.emptyHint}>등록된 개요 본문이 없습니다.</Text>
            ) : null}
          </ScrollView>
        </FolkCard>

        {/* Ebook edge taps — 좌 30% 이전 / 우 30% 다음 (중앙은 스크롤·접기 유지) */}
        <Pressable
          style={styles.tapLeft}
          onPress={() => goToPage(pageIndex - 1)}
          accessibilityLabel="이전 페이지"
        />
        <Pressable
          style={styles.tapRight}
          onPress={() => goToPage(pageIndex + 1)}
          accessibilityLabel="다음 페이지"
        />
      </View>
    ),
    [goToPage, item, pageIndex, styles, toggleChrome, width]
  );

  return (
    <Screen>
      {chromeVisible ? (
        <AppHeader title="작품" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      ) : (
        <Pressable style={styles.chromePeek} onPress={toggleChrome} hitSlop={12}>
          <Text style={styles.chromePeekText}>메뉴</Text>
        </Pressable>
      )}

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError || !item ? (
        <View style={styles.center}>
          <Text style={styles.error}>작품을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <View style={styles.body}>
          {chromeVisible ? (
            <View style={styles.coverWrap}>
              {item.coverUrl && !coverFailed ? (
                <Image
                  source={{ uri: item.coverUrl }}
                  style={styles.cover}
                  cachePolicy={IMAGE_CACHE_POLICY}
                  contentFit="cover"
                  onError={() => setCoverFailed(true)}
                />
              ) : (
                <View style={[styles.cover, styles.coverFallback]}>
                  <Text style={styles.coverEmoji}>📺</Text>
                </View>
              )}
            </View>
          ) : null}

          <FlatList
            ref={pagerRef}
            style={styles.pager}
            data={pages}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            bounces={false}
            overScrollMode="never"
            onMomentumScrollEnd={onMomentumEnd}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={renderPage}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                pagerRef.current?.scrollToIndex({ index: info.index, animated: true });
              }, 80);
            }}
          />

          {chromeVisible ? (
            <View style={styles.indicatorRow}>
              <Text style={styles.pageCount}>
                {pageIndex + 1} / {pages.length}
              </Text>
              <View style={styles.dots}>
                {pages.map((p, i) => (
                  <Pressable
                    key={p.id}
                    onPress={() => goToPage(i)}
                    hitSlop={8}
                    style={[styles.dot, i === pageIndex && styles.dotActive]}
                    accessibilityLabel={`${p.label} 페이지`}
                  />
                ))}
              </View>
              <Text style={styles.pageName} numberOfLines={1}>
                {pages[pageIndex]?.label ?? ""}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { flex: 1 },
    chromeSpacer: { height: 8 },
    chromePeek: {
      alignSelf: "center",
      marginTop: 4,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: colors.muted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    chromePeekText: { color: colors.textMuted, fontWeight: "700", fontSize: 11 },
    coverWrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    cover: {
      width: "100%",
      height: 168,
      borderRadius: radii.lg,
      backgroundColor: colors.muted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    coverFallback: { alignItems: "center", justifyContent: "center" },
    coverEmoji: { fontSize: 36 },
    pager: { flex: 1 },
    page: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    pageCard: { flex: 1, padding: 0, overflow: "hidden" },
    pageScroll: { flex: 1 },
    pageScrollContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    pageLabel: {
      alignSelf: "flex-start",
      color: colors.terracotta,
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    overviewMeta: { gap: 4, marginBottom: spacing.sm },
    title: { fontSize: 22, fontWeight: "800", color: colors.cobalt },
    en: { color: colors.textMuted, fontWeight: "600" },
    meta: { marginTop: 2, color: colors.textMuted, fontWeight: "700", fontSize: 13 },
    tags: { marginTop: 6, color: colors.terracotta, fontWeight: "700", fontSize: 13 },
    castWrap: { marginTop: spacing.sm, gap: spacing.sm },
    castHeading: { color: colors.cobalt, fontWeight: "800", fontSize: 16 },
    castChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    castChip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    castChipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
    emptyHint: { color: colors.textMuted, fontWeight: "600", marginTop: spacing.md },
    tapLeft: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: "28%",
    },
    tapRight: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: "28%",
    },
    indicatorRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: 4,
      gap: spacing.sm,
    },
    pageCount: {
      width: 48,
      color: colors.textMuted,
      fontWeight: "700",
      fontSize: 12,
    },
    pageName: {
      width: 48,
      textAlign: "right",
      color: colors.textMuted,
      fontWeight: "700",
      fontSize: 12,
    },
    dots: { flexDirection: "row", alignItems: "center", gap: 7 },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    dotActive: {
      width: 18,
      backgroundColor: colors.terracotta,
    },
    center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
    error: { color: colors.danger, fontWeight: "700" },
  });
}
