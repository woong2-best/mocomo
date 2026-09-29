import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  clearAllStarBookmarks,
  fetchStarHub,
  fetchStarMarket,
  fetchStarWiki,
  type StarHubCreator,
  type StarMarketItem,
  type StarWikiItem,
} from "@/api/discovery";
import { formatUsedPrice } from "@/features/marketplace/used-catalog";
import {
  commitClearStarHub,
  starCoverUrl,
  starHubQueryOptions,
} from "@/api/star-hub-cache";
import type { FeedPost } from "@/api/feed";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { cachedImageSource, IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const GRID_GAP = 2;
const GRID_COLS = 3;

type StarTab = "all" | "posts" | "qna" | "market" | "wiki";

const STAR_TABS: { id: StarTab; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "posts", label: "게시물" },
  { id: "qna", label: "QnA" },
  { id: "market", label: "마켓" },
  { id: "wiki", label: "컬처위키" },
];

type GridRow =
  | { key: string; kind: "post"; post: FeedPost }
  | { key: string; kind: "market"; item: StarMarketItem }
  | { key: string; kind: "wiki"; item: StarWikiItem };

function isQnaPost(post: FeedPost): boolean {
  return Boolean(post.community?.slug || post.communityId);
}

function mergeCreators(groups: StarHubCreator[][]): StarHubCreator[] {
  const map = new Map<string, StarHubCreator>();
  for (const group of groups) {
    for (const creator of group) {
      const prev = map.get(creator.id);
      if (prev) prev.count += creator.count;
      else map.set(creator.id, { ...creator });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function formatDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickCover(post: FeedPost) {
  const media = post.media?.[0];
  const url = starCoverUrl(post);
  if (!url) return null;
  return {
    url,
    type: media?.type,
    duration: media?.duration,
  };
}

export function StarListScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const { width: screenW } = useWindowDimensions();
  const cellSize = Math.floor((screenW - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StarTab>("all");
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const query = useQuery({
    ...starHubQueryOptions(queryClient, creatorId),
    enabled: tab === "posts" || tab === "all",
  });
  const qnaQuery = useQuery({
    queryKey: ["mobile-star-qna", creatorId],
    queryFn: () => fetchStarHub(creatorId, "qna"),
    enabled: tab === "qna" || tab === "all",
  });
  const marketQuery = useQuery({
    queryKey: ["mobile-star-market"],
    queryFn: fetchStarMarket,
    enabled: tab === "market" || tab === "all",
  });
  const wikiQuery = useQuery({
    queryKey: ["mobile-star-wiki"],
    queryFn: fetchStarWiki,
    enabled: tab === "wiki" || tab === "all",
  });

  const activeTotal =
    tab === "all"
      ? (query.data?.total ?? 0) +
        (qnaQuery.data?.total ?? 0) +
        (marketQuery.data?.total ?? 0) +
        (wikiQuery.data?.total ?? 0)
      : tab === "posts"
        ? (query.data?.total ?? 0)
        : tab === "qna"
          ? (qnaQuery.data?.total ?? 0)
          : tab === "wiki"
            ? (wikiQuery.data?.total ?? 0)
            : (marketQuery.data?.total ?? 0);
  const tabLabel = STAR_TABS.find((item) => item.id === tab)?.label ?? "게시물";

  const runClearAll = useCallback(() => {
    const prevCreator = creatorId;
    setClearConfirm(false);
    setClearing(true);
    if (tab === "posts" || tab === "all") {
      setCreatorId(null);
      const clears =
        tab === "all"
          ? [
              commitClearStarHub(queryClient),
              clearAllStarBookmarks("qna").then(() =>
                queryClient.invalidateQueries({ queryKey: ["mobile-star-qna"] })
              ),
              clearAllStarBookmarks("market").then(() =>
                queryClient.invalidateQueries({ queryKey: ["mobile-star-market"] })
              ),
              clearAllStarBookmarks("wiki").then(() =>
                queryClient.invalidateQueries({ queryKey: ["mobile-star-wiki"] })
              ),
            ]
          : [commitClearStarHub(queryClient)];
      void Promise.all(clears)
        .catch(() => setCreatorId(prevCreator))
        .finally(() => setClearing(false));
      return;
    }
    void clearAllStarBookmarks(tab)
      .then(() =>
        queryClient.invalidateQueries({
          queryKey:
            tab === "qna"
              ? ["mobile-star-qna"]
              : tab === "wiki"
                ? ["mobile-star-wiki"]
                : ["mobile-star-market"],
        })
      )
      .catch(() => setCreatorId(prevCreator))
      .finally(() => setClearing(false));
  }, [creatorId, queryClient, tab]);

  const onClearAll = useCallback(() => {
    if (activeTotal <= 0) return;
    setClearConfirm(true);
  }, [activeTotal]);

  const renderCreator = useCallback(
    (creator: StarHubCreator | "all") => {
      const active = creator === "all" ? creatorId === null : creatorId === creator.id;
      return (
        <Pressable
          key={creator === "all" ? "all" : creator.id}
          style={styles.creatorChip}
          onPress={() => setCreatorId(creator === "all" ? null : creator.id)}
        >
          {creator === "all" ? (
            <View style={[styles.creatorAvatarWrap, active && styles.creatorAllActive]}>
              <Ionicons
                name="star"
                size={22}
                color={active ? colors.textOnAccent : colors.brand}
              />
            </View>
          ) : (
            <View style={[styles.creatorAvatarRing, active && styles.creatorRingActive]}>
              <FolkAvatar uri={creator.image} name={creator.name || creator.username} size={52} framed={false} />
            </View>
          )}
          <Text style={[styles.creatorLabel, active && styles.creatorLabelActive]} numberOfLines={1}>
            {creator === "all" ? "전체" : creator.name || creator.username}
          </Text>
        </Pressable>
      );
    },
    [colors.brand, colors.textOnAccent, creatorId, styles]
  );

  const renderPostCell = useCallback(
    (item: FeedPost) => {
      const cover = pickCover(item);
      const isVideo = cover?.type === "VIDEO" || item.postType === "VIDEO";
      const duration = isVideo ? formatDuration(cover?.duration) : null;
      const qna = isQnaPost(item);
      const fallback = qna
        ? item.community?.name || item.title || item.content || "QnA"
        : item.title || item.content || "게시물";

      return (
        <Pressable
          style={{ width: cellSize, height: cellSize, marginBottom: GRID_GAP }}
          onPress={() => navigation.navigate("PostDetail", { id: item.id })}
        >
          {cover?.url ? (
            <Image
              source={cachedImageSource(cover.url)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
              recyclingKey={cover.url}
              transition={0}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cellFallback]}>
              <Text style={styles.cellFallbackText} numberOfLines={3}>
                {fallback}
              </Text>
            </View>
          )}
          <Text style={[styles.kindBadge, qna ? styles.kindBadgeQna : styles.kindBadgePost]}>
            {qna ? "QnA" : "게시물"}
          </Text>
          {isVideo ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          ) : null}
          {duration ? <Text style={styles.durationBadge}>{duration}</Text> : null}
        </Pressable>
      );
    },
    [cellSize, navigation, styles]
  );

  const creators = useMemo(() => {
    if (tab === "market" || tab === "wiki") return [];
    if (tab === "qna") return qnaQuery.data?.creators ?? [];
    if (tab === "posts") return query.data?.creators ?? [];
    return mergeCreators([query.data?.creators ?? [], qnaQuery.data?.creators ?? []]);
  }, [qnaQuery.data?.creators, query.data?.creators, tab]);

  const gridRows = useMemo(() => {
    const posts = (query.data?.items ?? [])
      .filter((post) => !isQnaPost(post))
      .map((post): GridRow => ({ key: `post:${post.id}`, kind: "post", post }));
    const leakedQna = (query.data?.items ?? []).filter((post) => isQnaPost(post));
    const qnaSeen = new Set<string>();
    const qna = [...(qnaQuery.data?.items ?? []), ...leakedQna]
      .filter((post) => {
        if (qnaSeen.has(post.id)) return false;
        qnaSeen.add(post.id);
        return true;
      })
      .map((post): GridRow => ({ key: `qna:${post.id}`, kind: "post", post }));
    const market = (marketQuery.data?.items ?? []).map(
      (item): GridRow => ({ key: `market:${item.id}`, kind: "market", item })
    );
    const wiki = (wikiQuery.data?.items ?? []).map(
      (item): GridRow => ({ key: `wiki:${item.id}`, kind: "wiki", item })
    );
    if (tab === "posts") return posts;
    if (tab === "qna") return qna;
    if (tab === "market") return market;
    if (tab === "wiki") return wiki;
    return creatorId ? [...posts, ...qna] : [...posts, ...qna, ...market, ...wiki];
  }, [
    creatorId,
    marketQuery.data?.items,
    qnaQuery.data?.items,
    query.data?.items,
    tab,
    wikiQuery.data?.items,
  ]);

  const listLoading =
    tab === "all"
      ? (query.isLoading && !query.data) ||
        (qnaQuery.isLoading && !qnaQuery.data) ||
        (marketQuery.isLoading && !marketQuery.data) ||
        (wikiQuery.isLoading && !wikiQuery.data)
      : tab === "market"
        ? marketQuery.isLoading && !marketQuery.data
        : tab === "wiki"
          ? wikiQuery.isLoading && !wikiQuery.data
          : tab === "qna"
            ? qnaQuery.isLoading && !qnaQuery.data
            : query.isLoading && !query.data;
  const listError =
    tab === "all"
      ? gridRows.length === 0 &&
        query.isError &&
        qnaQuery.isError &&
        marketQuery.isError &&
        wikiQuery.isError
      : tab === "market"
        ? marketQuery.isError && !marketQuery.data
        : tab === "wiki"
          ? wikiQuery.isError && !wikiQuery.data
          : tab === "qna"
            ? qnaQuery.isError && !qnaQuery.data
            : query.isError && !query.data;

  const renderMarketCell = useCallback(
    (item: StarMarketItem) => (
      <Pressable
        style={{ width: cellSize, height: cellSize, marginBottom: GRID_GAP }}
        onPress={() =>
          navigation.navigate("MarketplaceDetail", {
            id: item.id,
          })
        }
      >
        {item.thumbnailUrl ? (
          <Image
            source={cachedImageSource(item.thumbnailUrl)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={item.thumbnailUrl}
            transition={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cellFallback]}>
            <Text style={styles.cellFallbackText} numberOfLines={3}>
              {item.title || "상품"}
            </Text>
          </View>
        )}
        <Text style={styles.priceBadge} numberOfLines={1}>
          {formatUsedPrice(item.price, item.currency)}
        </Text>
      </Pressable>
    ),
    [cellSize, navigation, styles]
  );

  const renderWikiCell = useCallback(
    (item: StarWikiItem) => (
      <Pressable
        style={{ width: cellSize, height: cellSize, marginBottom: GRID_GAP }}
        onPress={() => navigation.navigate("AnimeDetail", { slug: item.slug })}
      >
        {item.coverUrl ? (
          <Image
            source={cachedImageSource(item.coverUrl)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={item.coverUrl}
            transition={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cellFallback]}>
            <Text style={styles.cellFallbackText} numberOfLines={3}>
              {item.title || "컬처위키"}
            </Text>
          </View>
        )}
        <Text style={[styles.kindBadge, styles.kindBadgeWiki]}>컬처위키</Text>
        <Text style={styles.priceBadge} numberOfLines={1}>
          {item.title}
        </Text>
      </Pressable>
    ),
    [cellSize, navigation, styles]
  );

  const renderGrid = useCallback(
    ({ item }: { item: GridRow }) =>
      item.kind === "market"
        ? renderMarketCell(item.item)
        : item.kind === "wiki"
          ? renderWikiCell(item.item)
          : renderPostCell(item.post),
    [renderMarketCell, renderPostCell, renderWikiCell]
  );

  const emptyLabel = creatorId
    ? "이 크리에이터의 STAR 저장 글이 없습니다."
    : tab === "all"
      ? "저장한 항목이 없습니다."
      : tab === "qna"
        ? "저장한 QnA가 없습니다."
        : tab === "market"
          ? "저장한 마켓 상품이 없습니다."
          : tab === "wiki"
            ? "저장한 컬처 위키가 없습니다."
            : "저장한 게시물이 없습니다.";

  return (
    <Screen>
      <Modal
        visible={clearConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setClearConfirm(false)}
      >
        <Pressable style={styles.confirmScrim} onPress={() => setClearConfirm(false)}>
          <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>전체 삭제</Text>
            <Text style={styles.confirmBody}>
              {tab === "all"
                ? "STAR에 저장한 게시물, QnA, 마켓, 컬처위키를 모두 삭제할까요? 북마크만 지워지며 글과 상품 자체는 삭제되지 않습니다."
                : `STAR에 저장한 ${tabLabel}을 모두 삭제할까요? 북마크만 지워지며 글 자체는 삭제되지 않습니다.`}
            </Text>
            <FolkButton label="전체 삭제" variant="secondary" onPress={runClearAll} />
            <FolkButton label="취소" variant="ghost" onPress={() => setClearConfirm(false)} />
          </Pressable>
        </Pressable>
      </Modal>
      <AppHeader
        title="STAR"
        border={false}
        style={styles.headerFlush}
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <Pressable
            onPress={onClearAll}
            disabled={clearing || activeTotal <= 0}
            hitSlop={8}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text
                style={[
                  styles.clearAll,
                  activeTotal <= 0 && styles.clearAllDisabled,
                ]}
              >
                전체 삭제하기
              </Text>
            )}
          </Pressable>
        }
      />

      <View style={styles.tabs}>
        {STAR_TABS.map((item, index) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                setTab(item.id);
                setCreatorId(null);
              }}
              style={[styles.tab, index > 0 && styles.tabSplit, active && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab !== "market" && tab !== "wiki" && creators.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.creatorRow}
        >
          {renderCreator("all")}
          {creators.map((c) => renderCreator(c))}
        </ScrollView>
      ) : null}

      {listLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : listError ? (
        <View style={styles.center}>
          <Text style={styles.error}>STAR 목록을 불러오지 못했습니다.</Text>
          <FolkButton
            label="다시 시도"
            onPress={() => {
              if (tab === "all") {
                void Promise.all([
                  query.refetch(),
                  qnaQuery.refetch(),
                  marketQuery.refetch(),
                  wikiQuery.refetch(),
                ]);
                return;
              }
              void (tab === "market"
                ? marketQuery.refetch()
                : tab === "wiki"
                  ? wikiQuery.refetch()
                  : tab === "qna"
                    ? qnaQuery.refetch()
                    : query.refetch());
            }}
          />
        </View>
      ) : (
        <FlatList
          data={gridRows}
          keyExtractor={(item) => item.key}
          numColumns={GRID_COLS}
          columnWrapperStyle={gridRows.length > 0 ? { gap: GRID_GAP } : undefined}
          renderItem={renderGrid}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={<Text style={styles.muted}>{emptyLabel}</Text>}
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  const ring = isDark ? colors.terracotta : colors.brand;
  return StyleSheet.create({
    clearAll: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.danger,
    },
    clearAllDisabled: { opacity: 0.35 },
    headerFlush: { paddingBottom: 0 },
    tabs: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceRaised,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
      borderRadius: 0,
    },
    tabSplit: {
      borderLeftWidth: 1,
      borderLeftColor: colors.borderStrong,
    },
    tabActive: {
      backgroundColor: ring,
    },
    tabText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
    },
    kindBadge: {
      position: "absolute",
      left: 6,
      top: 6,
      color: "#fff",
      fontSize: 10,
      fontWeight: "800",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.sm,
      overflow: "hidden",
    },
    kindBadgePost: {
      backgroundColor: "rgba(0,0,0,0.72)",
    },
    kindBadgeQna: {
      backgroundColor: colors.cobalt,
    },
    kindBadgeWiki: {
      backgroundColor: colors.terracotta,
    },
    tabTextActive: {
      color: colors.textOnAccent,
    },
    priceBadge: {
      position: "absolute",
      left: 6,
      bottom: 6,
      right: 6,
      color: "#fff",
      fontSize: 11,
      fontWeight: "800",
      backgroundColor: "rgba(0,0,0,0.72)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.sm,
      overflow: "hidden",
    },
    creatorRow: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      alignItems: "flex-start",
    },
    creatorChip: {
      width: 68,
      alignItems: "center",
      gap: 6,
    },
    creatorAvatarWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
      borderWidth: 2,
      borderColor: colors.border,
    },
    creatorAvatarRing: {
      borderRadius: 30,
      borderWidth: 2,
      borderColor: colors.border,
      padding: 1,
    },
    creatorAllActive: {
      borderColor: ring,
      backgroundColor: isDark ? colors.terracotta : colors.brand,
    },
    creatorRingActive: {
      borderColor: ring,
    },
    creatorLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      maxWidth: 68,
      textAlign: "center",
    },
    creatorLabelActive: {
      color: colors.text,
      fontWeight: "800",
    },
    grid: {
      paddingBottom: 40,
      gap: GRID_GAP,
    },
    cellFallback: {
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
    },
    cellFallbackText: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textAlign: "center",
    },
    videoBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.72)",
      alignItems: "center",
      justifyContent: "center",
    },
    durationBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      color: "#fff",
      fontSize: 10,
      fontWeight: "800",
      backgroundColor: "rgba(0,0,0,0.72)",
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: radii.sm,
      overflow: "hidden",
    },
    muted: {
      color: colors.textMuted,
      padding: spacing.lg,
      fontWeight: "600",
      textAlign: "center",
    },
    center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
    error: { color: colors.danger, fontWeight: "700" },
    confirmScrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    confirmCard: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    confirmTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    confirmBody: { fontSize: 13, fontWeight: "500", lineHeight: 19, color: colors.textMuted },
  });
}
