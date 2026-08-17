import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchFeedPage, type FeedPost } from "@/api/feed";
import { saveFeedBootstrap } from "@/api/feed-bootstrap-cache";
import { fetchWeeklyHighlights, type HighlightItem } from "@/api/highlights";
import { searchAll, type SearchResult } from "@/api/social";
import { prefetchPostComments } from "@/api/post-comments-query";
import { useAuth } from "@/auth/AuthContext";
import { InlineComposeBox } from "@/features/compose/InlineComposeBox";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { SideDrawer, type DrawerRoute } from "@/navigation/SideDrawer";
import { warmDrawerBundles, warmTabBundles } from "@/navigation/tab-warmup";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { PerformanceBudgets } from "@/perf/budgets";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { prefetchImageUrls } from "@/perf/image";
import { perfMeasure } from "@/perf/mark";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { SearchField } from "@/ui/SearchField";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList, RootTabParamList } from "@/navigation/types";

function feedItemType(item: FeedPost): string {
  const media = item.media ?? [];
  if (media.some((m) => m.type === "VIDEO" && (m.url || m.locked))) return "video";
  if (media.some((m) => m.type === "IMAGE" && (m.url || m.locked))) return "image";
  return "text";
}

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [visiblePostIds, setVisiblePostIds] = useState<string[]>([]);
  const [previewArmed, setPreviewArmed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState("");
  const searchRef = useRef<TextInput>(null);
  const firstPaintMarked = useRef(false);
  const activePreviewIdRef = useRef<string | null>(null);
  activePreviewIdRef.current = activePreviewId;

  const highlightsQuery = useQuery({
    queryKey: ["mobile-highlights"],
    queryFn: fetchWeeklyHighlights,
    staleTime: 60_000,
    enabled: searchFocused && !searchSubmitted,
  });

  const searchQuery = useQuery({
    queryKey: ["mobile-search", searchSubmitted],
    queryFn: () => searchAll(searchSubmitted),
    enabled: searchSubmitted.length > 0,
  });
  const bottomPad = floatingTabClearance(insets.bottom);
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const query = useInfiniteQuery({
    queryKey: ["mobile-feed"],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam ?? null, 10),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 90_000,
    refetchOnMount: false,
  });

  const posts = useMemo(() => {
    const list: FeedPost[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        if (item.type === "post") list.push(item.data);
      }
    }
    return list;
  }, [query.data]);

  useEffect(() => {
    if (!query.data?.pages?.length) return;
    void saveFeedBootstrap(query.data);
  }, [query.data]);

  useEffect(() => {
    if (!firstPaintMarked.current && posts.length > 0) {
      firstPaintMarked.current = true;
      perfMeasure("cold_start_to_feed", "app_start");
      const task = InteractionManager.runAfterInteractions(() => {
        warmTabBundles();
        warmDrawerBundles();
        require("@/features/reels/ReelsScreen");
        setTimeout(() => {
          require("@/features/messages/MessageRoomScreen");
        }, 1800);
      });
      return () => task.cancel();
    }
  }, [posts.length]);

  useEffect(() => {
    const urls: string[] = [];
    for (const post of posts.slice(0, PerformanceBudgets.feedPrefetchCount + 4)) {
      for (const m of post.media ?? []) {
        if (m.type === "IMAGE" && m.url) urls.push(m.url);
        if (m.type === "VIDEO" && m.posterUrl) urls.push(m.posterUrl);
      }
      if (post.author.image) urls.push(post.author.image);
    }
    prefetchImageUrls(urls, PerformanceBudgets.feedPrefetchCount);
  }, [posts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
    setRefreshing(false);
  }, [queryClient]);

  const onDrawerNavigate = useCallback(
    (route: DrawerRoute) => {
      if (
        route === "Home" ||
        route === "Messages" ||
        route === "Market" ||
        route === "Used"
      ) {
        navigation.navigate("Main", { screen: route as keyof RootTabParamList });
        return;
      }
      navigation.navigate(route as Exclude<DrawerRoute, keyof RootTabParamList>);
    },
    [navigation]
  );

  useEffect(() => {
    if (!isFocused || !previewArmed || activePreviewId || posts.length === 0) return;
    const firstVideo = posts.find((p) =>
      (p.media ?? []).some((m) => m.type === "VIDEO" && m.url)
    );
    if (firstVideo) setActivePreviewId(firstVideo.id);
  }, [activePreviewId, isFocused, posts, previewArmed]);

  /** Leaving Home (e.g. Reels) must kill inline preview — freezeOnBlur won't pause native players. */
  useFocusEffect(
    useCallback(() => {
      // Let feed paint/scroll settle before starting expo-video decode.
      const task = InteractionManager.runAfterInteractions(() => {
        setPreviewArmed(true);
      });
      return () => {
        task.cancel();
        setPreviewArmed(false);
        setActivePreviewId(null);
      };
    }, [])
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item?: FeedPost; isViewable?: boolean }[] }) => {
      const visible = viewableItems.filter((v) => v.isViewable && v.item?.id);
      const firstVideo = visible.find((v) =>
        (v.item!.media ?? []).some((m) => m.type === "VIDEO" && (m.url || m.locked))
      );
      setActivePreviewId(firstVideo?.item?.id ?? null);
      setVisiblePostIds(visible.map((v) => v.item!.id));
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 35,
    minimumViewTime: 120,
  }).current;

  const onPressPost = useCallback(
    (id: string) => navigation.navigate("PostDetail", { id }),
    [navigation]
  );
  const onPressAuthor = useCallback(
    (username: string) => navigation.navigate("UserProfile", { username }),
    [navigation]
  );
  const onPressVideo = useCallback(
    (postId: string, mediaId?: string, mediaIndex?: number) => {
      setActivePreviewId(null);
      prefetchPostComments(queryClient, postId);
      navigation.navigate("Reels", { postId, mediaId, mediaIndex });
    },
    [navigation, queryClient]
  );

  const paymentsEnabled = query.data?.pages[0]?.paymentsEnabled ?? false;

  const onPurchaseSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
    void queryClient.invalidateQueries({ queryKey: ["mobile-post"] });
  }, [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <FeedPostCard
        post={item}
        previewActive={
          isFocused && previewArmed && activePreviewIdRef.current === item.id
        }
        viewTrackActive={isFocused && visiblePostIds.includes(item.id)}
        paymentsEnabled={paymentsEnabled}
        onPurchaseSuccess={onPurchaseSuccess}
        onPressPost={onPressPost}
        onPressAuthor={onPressAuthor}
        onPressVideo={onPressVideo}
      />
    ),
    [
      isFocused,
      onPressAuthor,
      onPressPost,
      onPressVideo,
      onPurchaseSuccess,
      paymentsEnabled,
      previewArmed,
      visiblePostIds,
    ]
  );

  const getItemType = useCallback((item: FeedPost) => feedItemType(item), []);

  return (
    <Screen safeTop={false}>
      {/* Header: menu · search · bell · profile */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => setDrawerOpen(true)}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="메뉴"
        >
          <Ionicons name="menu" size={24} color={styles.headerIcon.color} />
        </Pressable>

        <SearchField
          ref={searchRef}
          variant="pill"
          value={searchQ}
          onChangeText={(t) => {
            setSearchQ(t);
            if (!t.trim()) setSearchSubmitted("");
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => {
            setTimeout(() => setSearchFocused(false), 180);
          }}
          onClear={() => {
            setSearchQ("");
            setSearchSubmitted("");
            setSearchFocused(false);
            searchRef.current?.blur();
          }}
          onSubmitEditing={() => {
            const trimmed = searchQ.trim();
            if (trimmed) setSearchSubmitted(trimmed);
          }}
          placeholder="검색"
          containerStyle={{ flex: 1 }}
        />

        <Pressable
          onPress={() => navigation.navigate("Activity")}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="알림"
        >
          <Ionicons name="notifications-outline" size={22} color={styles.headerIcon.color} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Profile")}
          hitSlop={6}
          style={styles.profileHit}
          accessibilityRole="button"
          accessibilityLabel="내 프로필"
        >
          <FolkAvatar
            uri={user?.image}
            name={user?.name || user?.username}
            size={32}
            framed={false}
          />
        </Pressable>
      </View>

      {/* Search popup — overlay below header only (never steals taps when closed) */}
      {searchFocused ? (
        <View style={[styles.searchPopup, { top: insets.top + 52 }]}>
          <Pressable
            style={styles.searchBackdrop}
            onPress={() => {
              setSearchFocused(false);
              setSearchSubmitted("");
              setSearchQ("");
              searchRef.current?.blur();
            }}
          />
          <View style={[styles.searchPanel, { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline }]}>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {searchSubmitted && searchQuery.data ? (
                <SearchResultsPanel
                  data={searchQuery.data}
                  colors={colors}
                  onPressPost={(id) => {
                    setSearchFocused(false);
                    searchRef.current?.blur();
                    navigation.navigate("PostDetail", { id });
                  }}
                  onPressUser={(username) => {
                    setSearchFocused(false);
                    searchRef.current?.blur();
                    navigation.navigate("UserProfile", { username });
                  }}
                  onPressAnime={(slug) => {
                    setSearchFocused(false);
                    searchRef.current?.blur();
                    navigation.navigate("AnimeDetail", { slug });
                  }}
                />
              ) : searchSubmitted && searchQuery.isLoading ? (
                <ActivityIndicator style={{ marginVertical: 24 }} color={colors.terracotta} />
              ) : (
                <HighlightsPanel
                  topLiked={highlightsQuery.data?.topLiked ?? []}
                  topViewed={highlightsQuery.data?.topViewed ?? []}
                  colors={colors}
                  onPressPost={(id) => {
                    setSearchFocused(false);
                    searchRef.current?.blur();
                    navigation.navigate("PostDetail", { id });
                  }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      <InlineComposeBox
        avatarUrl={user?.image}
        avatarLetter={user?.name || user?.username || "?"}
      />

      {query.isLoading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.terracotta} />
        </View>
      ) : query.isError && posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>피드를 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          getItemType={getItemType}
          extraData={`${activePreviewId}:${isFocused ? 1 : 0}:${previewArmed ? 1 : 0}:${visiblePostIds.join(",")}`}
          drawDistance={PerformanceBudgets.feedDrawDistance}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.55}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.terracotta}
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.terracotta} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>아직 게시물이 없습니다.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: bottomPad }}
        />
      )}

      <SideDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={onDrawerNavigate}
      />
    </Screen>
  );
}

/* ─── Highlights popup (default when search focused, no query) ─── */

function HighlightsPanel({
  topLiked,
  topViewed,
  colors,
  onPressPost,
}: {
  topLiked: HighlightItem[];
  topViewed: HighlightItem[];
  colors: ThemeColors;
  onPressPost: (id: string) => void;
}) {
  if (topLiked.length === 0 && topViewed.length === 0) {
    return <Text style={{ color: colors.textMuted, padding: 16, fontWeight: "600" }}>아직 하이라이트가 없습니다.</Text>;
  }
  return (
    <View style={{ padding: 12, gap: 16 }}>
      {topLiked.length > 0 && (
        <HighlightTable
          title="Top likes"
          statLabel="likes"
          items={topLiked}
          statKey="weeklyLikes"
          colors={colors}
          onPress={onPressPost}
        />
      )}
      {topViewed.length > 0 && (
        <HighlightTable
          title="Top views"
          statLabel="views"
          items={topViewed}
          statKey="viewCount"
          colors={colors}
          onPress={onPressPost}
        />
      )}
    </View>
  );
}

function HighlightTable({
  title,
  statLabel,
  items,
  statKey,
  colors,
  onPress,
}: {
  title: string;
  statLabel: string;
  items: HighlightItem[];
  statKey: "weeklyLikes" | "viewCount";
  colors: ThemeColors;
  onPress: (id: string) => void;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: colors.hairline, borderRadius: 6, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6 }}>
        <Text style={{ width: 28, color: colors.textMuted, fontSize: 11, fontWeight: "700", textAlign: "center" }}>#</Text>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: colors.text }}>{title}</Text>
        <Text style={{ width: 50, textAlign: "right", fontSize: 11, fontWeight: "700", color: colors.textMuted }}>{statLabel}</Text>
      </View>
      {items.map((item, i) => (
        <Pressable
          key={item.id}
          onPress={() => onPress(item.id)}
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.hairline }}
        >
          <Text style={{ width: 28, textAlign: "center", fontSize: 12, fontWeight: i === 0 ? "800" : "600", color: i === 0 ? "#d63a3a" : colors.textMuted }}>{i + 1}</Text>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: "#1a4db3", flexShrink: 1 }}>
              {item.title?.trim() || item.content.trim().slice(0, 40)}
            </Text>
            {item.hasMedia && <Ionicons name="image" size={12} color="#16a34a" />}
          </View>
          <Text style={{ width: 50, marginLeft: 4, textAlign: "right", fontSize: 12, fontWeight: "600", color: colors.text }}>{item.author.name || item.author.username}</Text>
          <Text style={{ width: 40, textAlign: "right", fontSize: 12, fontWeight: "700", color: colors.text }}>{item[statKey]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ─── Search results panel ─── */

function SearchResultsPanel({
  data,
  colors,
  onPressPost,
  onPressUser,
  onPressAnime,
}: {
  data: SearchResult;
  colors: ThemeColors;
  onPressPost: (id: string) => void;
  onPressUser: (username: string) => void;
  onPressAnime: (slug: string) => void;
}) {
  const total = data.users.length + data.posts.length + data.animes.length + data.liveStreams.length;
  if (total === 0) {
    return <Text style={{ color: colors.textMuted, padding: 16, fontWeight: "600" }}>결과가 없습니다.</Text>;
  }
  return (
    <View style={{ padding: 8, gap: 4 }}>
      {data.users.map((u) => (
        <Pressable key={`u-${u.id}`} onPress={() => onPressUser(u.username)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 8, gap: 8 }}>
          <FolkAvatar uri={u.image} name={u.name || u.username} size={28} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{u.name || u.username}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>@{u.username}</Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: "700", color: colors.terracotta }}>사람</Text>
        </Pressable>
      ))}
      {data.posts.map((p) => (
        <Pressable key={`p-${p.id}`} onPress={() => onPressPost(p.id)} style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.terracotta, marginBottom: 2 }}>게시물</Text>
          <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{p.title || p.content.slice(0, 80)}</Text>
        </Pressable>
      ))}
      {data.animes.map((a) => (
        <Pressable key={`a-${a.slug}`} onPress={() => onPressAnime(a.slug)} style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.terracotta, marginBottom: 2 }}>컬처위키</Text>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{a.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const headerIconColor = isDark ? "#F5F0E8" : colors.brand;
  return StyleSheet.create({
    headerIcon: { color: headerIconColor },
    topBar: {
      paddingHorizontal: 12,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      backgroundColor: colors.background,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    profileHit: {
      alignItems: "center",
      justifyContent: "center",
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      minHeight: 160,
    },
    error: { color: colors.danger, marginBottom: spacing.sm, fontWeight: "600" },
    muted: { color: colors.textMuted, fontWeight: "600" },
    searchPopup: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
    },
    searchBackdrop: {
      ...StyleSheet.absoluteFill,
    },
    searchPanel: {
      marginHorizontal: 10,
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      overflow: "hidden",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
  });
}
