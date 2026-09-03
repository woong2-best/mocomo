import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchLiveHub, type LiveListItem } from "@/api/live";
import {
  liveCategoryLabel,
  coerceViewerCount,
  MOBILE_LIVE_CATEGORIES,
  type MobileLiveCategoryId,
} from "@/features/live/live-categories";
import {
  LiveCardOverflowMenu,
  type LiveCardMenuTarget,
} from "@/features/live/LiveCardOverflowMenu";
import { LiveEmptyTestPattern } from "@/features/live/LiveEmptyTestPattern";
import { sanitizeLiveListItems } from "@/features/live/live-hub-sanitize";
import { LiveStreamCard } from "@/features/live/LiveStreamCard";
import { LiveStreamListRow } from "@/features/live/LiveStreamListRow";
import { LiveTopHeroCard } from "@/features/live/LiveTopHeroCard";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { ScreenErrorBoundary } from "@/ui/ScreenErrorBoundary";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type Styles = ReturnType<typeof createStyles>;

export function LiveListScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [category, setCategory] = useState<MobileLiveCategoryId>("ALL");
  const [followExpanded, setFollowExpanded] = useState(false);
  const [menuTarget, setMenuTarget] = useState<LiveCardMenuTarget | null>(null);

  const pad = spacing.md;
  const contentW = width - pad * 2;
  /** ~1.8 cards per screen so the next followed card peeks in (Chzzk rail). */
  const railCardW = Math.round(contentW * 0.56);
  const rowThumbW = Math.min(180, Math.round(contentW * 0.42));

  const query = useInfiniteQuery({
    queryKey: ["mobile-live-hub", category],
    queryFn: ({ pageParam }) =>
      fetchLiveHub({
        category: category === "ALL" ? undefined : category,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.nextOffset : undefined),
    staleTime: 25_000,
    retry: 2,
  });

  // Drawer warmup used prefetchQuery (wrong shape) — purge so infinite query can load.
  useEffect(() => {
    const key = ["mobile-live-hub", category] as const;
    const cached = queryClient.getQueryData(key);
    if (cached != null && typeof cached === "object" && !("pages" in cached)) {
      queryClient.removeQueries({ queryKey: key });
    }
  }, [category, queryClient]);

  useEffect(() => {
    setFollowExpanded(false);
  }, [category]);

  const firstPage = query.data?.pages[0];
  const items = useMemo(
    () => sanitizeLiveListItems(query.data?.pages.flatMap((p) => p.items)),
    [query.data?.pages]
  );
  const followed = useMemo(
    () => sanitizeLiveListItems(firstPage?.followed),
    [firstPage?.followed]
  );
  const total = firstPage?.total ?? items.length;

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => coerceViewerCount(b.viewerCount) - coerceViewerCount(a.viewerCount)
      ),
    [items]
  );

  /** #1 by viewers gets the spotlight; the ranked list starts at #2. */
  const heroItem = sortedItems[0] ?? null;
  const rankedItems = useMemo(() => sortedItems.slice(1), [sortedItems]);

  const openLive = useCallback(
    (id: string) => navigation.navigate("LiveDetail", { id }),
    [navigation]
  );

  const openOverflow = useCallback((item: LiveListItem) => {
    setMenuTarget({
      channelId: item.id,
      title: item.title,
      hostUsername: item.host?.username ?? "",
    });
  }, []);

  const openChannel = useCallback(
    (username: string) => {
      if (username) navigation.navigate("UserProfile", { username });
    },
    [navigation]
  );

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  const listHeader = useMemo(
    () => (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          {MOBILE_LIVE_CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.pill,
                  active
                    ? { backgroundColor: colors.terracotta, borderColor: colors.terracotta }
                    : { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.pillText, { color: active ? "#fff" : colors.text }]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {heroItem ? (
          <LiveTopHeroCard item={heroItem} width={width} onPress={openLive} />
        ) : (
          <LiveEmptyTestPattern
            width={width}
            message={
              category === "ALL"
                ? "방송중인 방송이 없습니다"
                : `${liveCategoryLabel(category)} 카테고리에 방송중인 방송이 없습니다`
            }
          />
        )}

        <View style={styles.section}>
          <SectionHead
            styles={styles}
            title="실시간 팔로우 목록"
            actionLabel={followed.length > 2 ? (followExpanded ? "접기" : "전체보기") : undefined}
            onAction={followed.length > 2 ? () => setFollowExpanded((prev) => !prev) : undefined}
          />
          {followed.length === 0 ? (
            <Text style={styles.sectionEmpty}>
              팔로우한 채널 중 방송 중인 채널이 없습니다
            </Text>
          ) : followExpanded ? (
            <View style={{ paddingHorizontal: pad }}>
              {followed.map((item) => (
                <LiveStreamListRow
                  key={`fx-${item.id}`}
                  item={item}
                  thumbWidth={rowThumbW}
                  onPress={() => openLive(item.id)}
                  onOverflow={() => openOverflow(item)}
                />
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={railCardW + 10}
              decelerationRate="fast"
              contentContainerStyle={styles.rail}
            >
              {followed.map((item) => (
                <LiveStreamCard
                  key={`f-${item.id}`}
                  item={item}
                  cardWidth={railCardW}
                  onPress={() => openLive(item.id)}
                  onOverflow={() => openOverflow(item)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.rankedHead}>
          <SectionHead
            styles={styles}
            title={category === "ALL" ? "조회수 순" : `${liveCategoryLabel(category)} · 조회수 순`}
            badge={total}
          />
          {rankedItems.length === 0 ? (
            <Text style={styles.sectionEmpty}>표시할 방송이 없습니다</Text>
          ) : null}
        </View>
      </View>
    ),
    [
      category,
      colors.border,
      colors.muted,
      colors.terracotta,
      colors.text,
      followExpanded,
      followed,
      heroItem,
      openLive,
      openOverflow,
      pad,
      railCardW,
      rankedItems.length,
      rowThumbW,
      styles,
      total,
      width,
    ]
  );

  const listFooter = useMemo(
    () =>
      query.isFetchingNextPage ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color={colors.terracotta} />
      ) : null,
    [colors.terracotta, query.isFetchingNextPage]
  );

  const hasHubPages = (query.data?.pages?.length ?? 0) > 0;

  return (
    <ScreenErrorBoundary label="라이브" onRetry={onRefresh}>
      <Screen>
        <AppHeader
          title="라이브"
          leftLabel="뒤로"
          onLeftPress={() => navigation.goBack()}
          rightSlot={
            <Pressable onPress={() => navigation.navigate("LiveGoLive")} hitSlop={8}>
              <Text style={styles.cta}>방송 시작</Text>
            </Pressable>
          }
        />

        {query.isPending && !hasHubPages ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
        ) : query.isError && !hasHubPages ? (
          <View style={styles.center}>
            <Text style={styles.error}>라이브 허브를 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
          </View>
        ) : (
          <FlatList
            data={rankedItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: pad }}>
                <LiveStreamListRow
                  item={item}
                  thumbWidth={rowThumbW}
                  onPress={() => openLive(item.id)}
                  onOverflow={() => openOverflow(item)}
                />
              </View>
            )}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={query.isFetching && !query.isLoading}
                onRefresh={onRefresh}
              />
            }
            contentContainerStyle={{ paddingBottom: 48 }}
          />
        )}

        <LiveCardOverflowMenu
          target={menuTarget}
          onClose={() => setMenuTarget(null)}
          onOpenChannel={openChannel}
        />
      </Screen>
    </ScreenErrorBoundary>
  );
}

function SectionHead({
  styles,
  title,
  actionLabel,
  onAction,
  badge,
}: {
  styles: Styles;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: number;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.viewAll}>{actionLabel}</Text>
        </Pressable>
      ) : badge != null ? (
        <Text style={styles.countBadge}>{badge}</Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cta: { fontWeight: "800", color: colors.terracotta, fontSize: 14 },
    center: { padding: spacing.lg, alignItems: "center" },
    error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
    pills: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    pill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    pillText: { fontSize: 12, fontWeight: "700" },
    section: { marginTop: spacing.lg },
    rankedHead: { marginTop: spacing.lg },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginBottom: 10,
      gap: 12,
    },
    sectionTitle: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
    },
    countBadge: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
    },
    viewAll: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    rail: { paddingHorizontal: spacing.md, gap: 10 },
    sectionEmpty: {
      paddingHorizontal: spacing.md,
      paddingVertical: 18,
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
  });
}
