import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
  MOBILE_LIVE_CATEGORIES,
  type MobileLiveCategoryId,
} from "@/features/live/live-categories";
import { ensureR18LiveAccess } from "@/features/live/ensure-r18-access";
import { LiveCategoryFolderChip } from "@/features/live/LiveCategoryFolderChip";
import { LiveBeadFeed } from "@/features/live/LiveBeadFeed";
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [category, setCategory] = useState<MobileLiveCategoryId>("ALL");

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

  const openLive = useCallback(
    (id: string) => navigation.navigate("LiveDetail", { id }),
    [navigation]
  );

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const selectCategory = useCallback((id: MobileLiveCategoryId) => {
    void (async () => {
      const ok = await ensureR18LiveAccess(id);
      if (!ok) return;
      setCategory(id);
    })();
  }, []);

  const hasHubPages = (query.data?.pages?.length ?? 0) > 0;
  const chromeHeight = insets.top + 68;

  return (
    <ScreenErrorBoundary label="라이브" onRetry={onRefresh}>
      <View style={styles.root}>
        <View style={[styles.chrome, { paddingTop: insets.top + 4 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.iconHit}
            accessibilityLabel="뒤로"
          >
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.72)" />
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cats}
            style={styles.catsScroll}
          >
            {MOBILE_LIVE_CATEGORIES.map((c) => {
              const on = category === c.id;
              if (c.id === "ALL") {
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => selectCategory(c.id)}
                    style={styles.allHit}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.allText, on && styles.allTextOn]}>{c.label}</Text>
                    {on ? <View style={styles.catDot} /> : <View style={styles.catDotSpacer} />}
                  </Pressable>
                );
              }
              return (
                <LiveCategoryFolderChip
                  key={c.id}
                  id={c.id}
                  label={c.label}
                  active={on}
                  onPress={() => selectCategory(c.id)}
                />
              );
            })}
          </ScrollView>

          <Pressable
            onPress={onRefresh}
            hitSlop={12}
            style={styles.iconHit}
            accessibilityLabel="새로고침"
          >
            <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.45)" />
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
            items={sortedItems}
            onOpenLive={openLive}
            topInset={chromeHeight}
          />
        )}
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
      paddingHorizontal: 6,
      paddingBottom: 8,
      gap: 2,
    },
    iconHit: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    catsScroll: { flex: 1 },
    cats: {
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 2,
      minHeight: 56,
      paddingVertical: 2,
    },
    allHit: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      paddingVertical: 8,
      minWidth: 36,
      marginRight: 2,
    },
    allText: {
      fontSize: 14,
      fontWeight: "700",
      color: "rgba(255,255,255,0.42)",
      letterSpacing: -0.2,
    },
    allTextOn: {
      color: "#FFFFFF",
    },
    catDot: {
      marginTop: 5,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.terracotta,
    },
    catDotSpacer: {
      marginTop: 5,
      width: 4,
      height: 4,
    },
    center: { padding: spacing.lg, alignItems: "center" },
    error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
  });
}
