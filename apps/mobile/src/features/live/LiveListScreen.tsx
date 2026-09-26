import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchLiveHub, type LiveListItem } from "@/api/live";
import { coerceViewerCount, type MobileLiveCategoryId } from "@/features/live/live-categories";
import { ensureR18LiveAccess } from "@/features/live/ensure-r18-access";
import { LiveBrowseHero, LiveBrowseRow } from "@/features/live/LiveBrowseRow";
import { LiveEmptyTestPattern } from "@/features/live/LiveEmptyTestPattern";
import { LiveGlassSearch } from "@/features/live/LiveGlassSearch";
import { LiveSlantTabs } from "@/features/live/LiveSlantTabs";
import { sanitizeLiveListItems } from "@/features/live/live-hub-sanitize";
import { FolkButton } from "@/ui/FolkButton";
import { ScreenErrorBoundary } from "@/ui/ScreenErrorBoundary";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function LiveListScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [category, setCategory] = useState<MobileLiveCategoryId>("ALL");
  const [searchQ, setSearchQ] = useState("");

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

  useEffect(() => {
    const key = ["mobile-live-hub", category] as const;
    const cached = queryClient.getQueryData(key);
    if (cached != null && typeof cached === "object" && !("pages" in cached)) {
      queryClient.removeQueries({ queryKey: key });
    }
  }, [category, queryClient]);

  const items = useMemo(
    () => sanitizeLiveListItems(query.data?.pages.flatMap((p) => p.items)),
    [query.data?.pages]
  );

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => coerceViewerCount(b.viewerCount) - coerceViewerCount(a.viewerCount)
      ),
    [items]
  );

  const searchNorm = searchQ.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!searchNorm) return sortedItems;
    return sortedItems.filter((item) => {
      const nick = item.host?.username?.toLowerCase() ?? "";
      const title = item.title.toLowerCase();
      return nick.includes(searchNorm) || title.includes(searchNorm);
    });
  }, [sortedItems, searchNorm]);

  const hasHubPages = (query.data?.pages?.length ?? 0) > 0;
  const hero = visibleItems[0] ?? null;
  const rows = hero ? visibleItems.slice(1) : visibleItems;
  const showPattern = !hero && !searchNorm && !(query.isPending && !hasHubPages);

  const openLive = useCallback(
    (id: string) => navigation.navigate("LiveDetail", { id }),
    [navigation]
  );

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const selectCategory = useCallback((id: MobileLiveCategoryId) => {
    void (async () => {
      if (id !== "ALL") {
        const ok = await ensureR18LiveAccess(id);
        if (!ok) return;
      }
      setCategory(id);
    })();
  }, []);

  const searchWidth = Math.max(160, width - insets.left - insets.right - 64);

  const renderItem = useCallback(
    ({ item }: { item: LiveListItem }) => (
      <LiveBrowseRow item={item} onPress={() => openLive(item.id)} />
    ),
    [openLive]
  );

  return (
    <ScreenErrorBoundary label="라이브" onRetry={onRefresh}>
      <View style={styles.root}>
        <View
          pointerEvents="box-none"
          style={[styles.chrome, { paddingTop: insets.top + 6 }]}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backHit}
            accessibilityLabel="뒤로"
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>
          <LiveGlassSearch value={searchQ} onChangeText={setSearchQ} expandedWidth={searchWidth} />
        </View>

        {query.isError && !hasHubPages ? (
          <View style={[styles.fill, { paddingTop: insets.top + 56 }]}>
            <LiveSlantTabs active={category} onSelect={selectCategory} />
            <View style={styles.center}>
              <Text style={styles.error}>라이브를 불러오지 못했습니다.</Text>
              <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
            </View>
          </View>
        ) : (
          <FlashList
            data={hasHubPages ? rows : []}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={
              <View>
                {hero ? (
                  <LiveBrowseHero item={hero} onPress={() => openLive(hero.id)} />
                ) : showPattern ? (
                  <LiveEmptyTestPattern width={width} message="방송중인 방송이 없습니다" />
                ) : null}
                <LiveSlantTabs active={category} onSelect={selectCategory} />
              </View>
            }
            contentContainerStyle={{
              paddingTop: hero || showPattern ? 0 : insets.top + 56,
              paddingBottom: insets.bottom + 28,
            }}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage && !searchNorm) {
                void query.fetchNextPage();
              }
            }}
            ListEmptyComponent={
              query.isPending && !hasHubPages ? (
                <ActivityIndicator style={{ marginTop: 48 }} color={colors.terracotta} />
              ) : hero || showPattern ? null : (
                <Text style={styles.empty}>검색 결과가 없습니다.</Text>
              )
            }
            ListFooterComponent={
              query.isFetchingNextPage ? (
                <ActivityIndicator style={{ marginVertical: 16 }} color="#FFFFFF" />
              ) : null
            }
          />
        )}
      </View>
    </ScreenErrorBoundary>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000" },
    fill: { flex: 1 },
    chrome: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 6,
      paddingBottom: 8,
    },
    backHit: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },
    center: { padding: spacing.lg, alignItems: "center" },
    error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
    empty: {
      color: "rgba(255,255,255,0.62)",
      textAlign: "center",
      marginTop: 36,
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
