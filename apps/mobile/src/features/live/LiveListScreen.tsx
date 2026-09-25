import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchLiveHub } from "@/api/live";
import {
  coerceViewerCount,
  type MobileLiveCategoryId,
} from "@/features/live/live-categories";
import { ensureR18LiveAccess } from "@/features/live/ensure-r18-access";
import { LiveCategorySlidePanel } from "@/features/live/LiveCategorySlidePanel";
import { LiveBeadFeed } from "@/features/live/LiveBeadFeed";
import { sanitizeLiveListItems } from "@/features/live/live-hub-sanitize";
import { FolkButton } from "@/ui/FolkButton";
import { ScreenErrorBoundary } from "@/ui/ScreenErrorBoundary";
import { SearchField } from "@/ui/SearchField";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function LiveListScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [category, setCategory] = useState<MobileLiveCategoryId>("ALL");
  const [searchQ, setSearchQ] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);

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

  // Prefetch extra pages so the bead has enough lives when available.
  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.data?.pages.length]);

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

  const openLive = useCallback(
    (id: string) => navigation.navigate("LiveDetail", { id }),
    [navigation]
  );

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const selectCategory = useCallback(
    (id: MobileLiveCategoryId) => {
      void (async () => {
        const next = id === category ? "ALL" : id;
        if (next !== "ALL") {
          const ok = await ensureR18LiveAccess(next);
          if (!ok) return;
        }
        setCategory(next);
        setFolderOpen(false);
      })();
    },
    [category]
  );

  const hasHubPages = (query.data?.pages?.length ?? 0) > 0;
  const chromeHeight = insets.top + 56;

  return (
    <ScreenErrorBoundary label="라이브" onRetry={onRefresh}>
      <View style={styles.root}>
        <View style={[styles.chrome, { paddingTop: insets.top + 6 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.iconHit}
            accessibilityLabel="뒤로"
          >
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.72)" />
          </Pressable>

          <SearchField
            variant="pill"
            value={searchQ}
            onChangeText={setSearchQ}
            onClear={() => setSearchQ("")}
            placeholder="닉네임 검색"
            containerStyle={styles.search}
            style={styles.searchInput}
          />

          <Pressable
            onPress={() => setFolderOpen(true)}
            hitSlop={12}
            style={styles.iconHit}
            accessibilityLabel="카테고리 메뉴"
          >
            <Ionicons name="menu-outline" size={24} color="rgba(255,255,255,0.72)" />
          </Pressable>
        </View>

        {query.isPending && !hasHubPages ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={colors.terracotta} />
        ) : query.isError && !hasHubPages ? (
          <View style={styles.center}>
            <Text style={styles.error}>라이브를 불러오지 못했습니다.</Text>
            <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
          </View>
        ) : (
          <LiveBeadFeed
            items={visibleItems}
            onOpenLive={openLive}
            topInset={chromeHeight}
          />
        )}

        <LiveCategorySlidePanel
          visible={folderOpen}
          activeCategory={category}
          onClose={() => setFolderOpen(false)}
          onSelectCategory={selectCategory}
        />
      </View>
    </ScreenErrorBoundary>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000" },
    chrome: {
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 8,
      gap: 6,
    },
    iconHit: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    search: {
      flex: 1,
      minHeight: 40,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderColor: "rgba(255,255,255,0.14)",
    },
    searchInput: {
      color: "#FFFFFF",
      fontSize: 14,
    },
    center: { padding: spacing.lg, alignItems: "center" },
    error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
  });
}
