import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
  useWindowDimensions,
} from "react-native";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchFeedPage, type FeedPost } from "@/api/feed";
import { fetchReelsAds } from "@/api/ads";
import { createPostComment } from "@/api/social";
import {
  parsePostComments,
  postCommentsQueryKey,
  postCommentsQueryOptions,
  prefetchPostComments,
  type PostCommentsResponse,
} from "@/api/post-comments-query";
import {
  buildFeedVideoGroups,
  findGroupOpenPosition,
  stabilizeVideoGroups,
  type FeedVideoGroup,
} from "@/features/feed/feed-video-groups";
import { FeedVideoPostSlide } from "@/features/feed/FeedVideoPostSlide";
import { ReelSponsoredSlide } from "@/features/reels/ReelSponsoredSlide";
import { ReelsWideNavRail } from "@/features/reels/ReelsWideNavRail";
import { computeReelsChromeLayout } from "@/features/reels/reels-wide-layout";
import {
  isPageAligned,
  pageIndexFromOffset,
  pageOffsetForIndex,
  REELS_PAGE_ALIGN_EPSILON,
  shouldWaitForMomentum,
} from "@/features/reels/reels-pager";
import {
  buildReelsSlots,
  findReelSlotIndex,
  findSlotIndexByIdentity,
  reelsSlotIdentity,
  type ReelsSlot,
} from "@/features/reels/reels-slots";
import { PerformanceBudgets } from "@/perf/budgets";
import { TranslatableText } from "@/ui/TranslatableText";
import { useI18n } from "@/i18n/I18nProvider";
import { reelsUi } from "@/features/reels/reels-ui";
import type { RootStackParamList } from "@/navigation/types";

export function ReelsScreen() {
  const { t } = useI18n();
  const copy = useMemo(() => reelsUi(t), [t]);
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(windowHeight);
  const chrome = useMemo(() => computeReelsChromeLayout(width, height), [width, height]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Reels">>();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ReelsSlot>>(null);
  const activeSlotRef = useRef(0);
  const activeIdentityRef = useRef<string | null>(null);
  const ignoreViewabilityRef = useRef(false);
  const draggingRef = useRef(false);
  const didMeasureListRef = useRef(false);
  const pageHeightRef = useRef(windowHeight);
  const lastOffsetYRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupsStableRef = useRef<FeedVideoGroup[]>([]);
  pageHeightRef.current = height;

  const commitPageHeight = useCallback((next: number, source: "layout" | "window") => {
    const rounded = Math.round(next);
    if (rounded < 200) return;
    const prev = pageHeightRef.current;
    if (source === "layout") {
      if (!didMeasureListRef.current) {
        didMeasureListRef.current = true;
        if (rounded === prev) return;
        pageHeightRef.current = rounded;
        setHeight(rounded);
        return;
      }
      if (Math.abs(rounded - prev) < 80) return;
    } else if (Math.abs(rounded - prev) < 100) {
      return;
    }
    if (rounded === prev) return;
    pageHeightRef.current = rounded;
    setHeight(rounded);
  }, []);

  // First list onLayout is the page size. Window updates only cover rotate / fold.
  useEffect(() => {
    commitPageHeight(windowHeight, "window");
  }, [commitPageHeight, windowHeight]);

  const onListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      commitPageHeight(e.nativeEvent.layout.height, "layout");
    },
    [commitPageHeight]
  );

  const targetPostId = route.params?.postId;
  const targetMediaId = route.params?.mediaId;
  const targetMediaIndex = route.params?.mediaIndex;

  const [activeSlot, setActiveSlot] = useState(0);
  const [seedVideoByGroup, setSeedVideoByGroup] = useState<Record<string, number>>({});
  const [didSeed, setDidSeed] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [headerCommentCount, setHeaderCommentCount] = useState(0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);

  const commentsQuery = useQuery({
    ...postCommentsQueryOptions(commentsPostId ?? ""),
    enabled: !!commentsPostId,
    placeholderData: (previous) =>
      previous ??
      (commentsPostId
        ? queryClient.getQueryData<PostCommentsResponse>(postCommentsQueryKey(commentsPostId))
        : undefined),
  });

  const comments = useMemo(
    () => parsePostComments(commentsQuery.data),
    [commentsQuery.data]
  );

  const commentTotal =
    typeof commentsQuery.data?.total === "number"
      ? commentsQuery.data.total
      : comments.length > 0
        ? comments.length
        : headerCommentCount;

  const showCommentsSpinner =
    comments.length === 0 && headerCommentCount > 0 && commentsQuery.isFetching;

  const feedQuery = useInfiniteQuery({
    queryKey: ["mobile-feed"],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam ?? null, 10),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // Same cache as Home ??opening Reels must feel instant (Twitter/IG), not a refetch.
    staleTime: 90_000,
    refetchOnMount: false,
  });

  const adsQuery = useQuery({
    queryKey: ["mobile-reels-ads"],
    queryFn: fetchReelsAds,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const posts = useMemo(() => {
    const list: FeedPost[] = [];
    for (const page of feedQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (item.type === "post") list.push(item.data);
      }
    }
    // Also merge any feed cache pages already loaded on Home
    const cached = queryClient.getQueryData<{
      pages: { items: { type: string; data: FeedPost }[] }[];
    }>(["mobile-feed"]);
    if (cached?.pages && list.length === 0) {
      for (const page of cached.pages) {
        for (const item of page.items) {
          if (item.type === "post") list.push(item.data);
        }
      }
    }
    return list;
  }, [feedQuery.data, queryClient]);

  const paymentsEnabled = feedQuery.data?.pages[0]?.paymentsEnabled ?? false;
  const groups = useMemo(() => {
    const next = stabilizeVideoGroups(
      groupsStableRef.current,
      buildFeedVideoGroups(posts, paymentsEnabled)
    );
    groupsStableRef.current = next;
    return next;
  }, [posts, paymentsEnabled]);

  const slots = useMemo(
    () => buildReelsSlots(groups, adsQuery.data ?? []),
    [adsQuery.data, groups]
  );
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const snapOffsets = useMemo(
    () => (Platform.OS === "android" ? slots.map((_, i) => pageOffsetForIndex(i, height)) : undefined),
    [height, slots]
  );

  const commitSlot = useCallback((index: number) => {
    const slot = slotsRef.current[index];
    const identity = slot ? reelsSlotIdentity(slot) : null;
    if (activeSlotRef.current === index && activeIdentityRef.current === identity) return;
    activeSlotRef.current = index;
    activeIdentityRef.current = identity;
    setActiveSlot(index);
  }, []);

  const snapToSlot = useCallback(
    (index: number, animated: boolean) => {
      ignoreViewabilityRef.current = true;
      commitSlot(index);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: pageOffsetForIndex(index, pageHeightRef.current),
          animated,
        });
        setTimeout(() => {
          ignoreViewabilityRef.current = false;
        }, animated ? 320 : 80);
      });
    },
    [commitSlot]
  );

  useEffect(() => {
    if (didSeed || slots.length === 0) return;
    if (targetPostId) {
      const groupPos = findGroupOpenPosition(groups, {
        postId: targetPostId,
        mediaId: targetMediaId,
        mediaIndex: targetMediaIndex,
      });
      if (groupPos) {
        const slotIndex = findReelSlotIndex(slots, groups[groupPos.groupIndex]!.postId);
        const index = slotIndex >= 0 ? slotIndex : 0;
        setSeedVideoByGroup({ [groups[groupPos.groupIndex]!.postId]: groupPos.videoIndex });
        snapToSlot(index, false);
        setDidSeed(true);
        return;
      }
    }
    const first = slots[0];
    if (first) activeIdentityRef.current = reelsSlotIdentity(first);
    setDidSeed(true);
  }, [didSeed, groups, slots, snapToSlot, targetMediaId, targetMediaIndex, targetPostId]);

  // Ads / feed updates must not steal the viewport — remap to the same reel, no animation.
  useEffect(() => {
    if (!didSeed || slots.length === 0) return;
    const identity = activeIdentityRef.current;
    if (!identity) {
      const slot = slots[Math.min(activeSlotRef.current, slots.length - 1)];
      if (slot) activeIdentityRef.current = reelsSlotIdentity(slot);
      return;
    }
    const next = findSlotIndexByIdentity(slots, identity);
    if (next < 0) {
      commitSlot(Math.min(activeSlotRef.current, slots.length - 1));
      return;
    }
    if (next === activeSlotRef.current) return;
    snapToSlot(next, false);
  }, [commitSlot, didSeed, slots, snapToSlot]);

  /** Prefetch comments for visible reels so the sheet opens instantly (IG/X). */
  useEffect(() => {
    if (slots.length === 0) return;
    const warm = (idx: number) => {
      const s = slots[idx];
      if (!s || s.kind !== "reel") return;
      const count = s.group.videos[0]?.commentCount ?? 0;
      if (count > 0) prefetchPostComments(queryClient, s.group.postId);
    };
    warm(activeSlot);
    warm(activeSlot - 1);
    warm(activeSlot + 1);
    if (targetPostId) prefetchPostComments(queryClient, targetPostId);
  }, [activeSlot, slots, queryClient, targetPostId]);

  const clearSettleTimer = useCallback(() => {
    if (!settleTimerRef.current) return;
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
  }, []);

  const settlingRef = useRef(false);

  const settleToNearestSlot = useCallback(
    (offsetY: number, animated: boolean) => {
      const page = Math.max(pageHeightRef.current, 1);
      const count = slotsRef.current.length;
      if (count === 0) return;
      const idx = pageIndexFromOffset(offsetY, page, count);
      const target = pageOffsetForIndex(idx, page);
      commitSlot(idx);
      if (Math.abs(offsetY - target) <= REELS_PAGE_ALIGN_EPSILON) {
        settlingRef.current = false;
        ignoreViewabilityRef.current = false;
        return;
      }
      if (settlingRef.current) return;
      settlingRef.current = true;
      ignoreViewabilityRef.current = true;
      listRef.current?.scrollToOffset({ offset: target, animated });
      setTimeout(() => {
        settlingRef.current = false;
        ignoreViewabilityRef.current = false;
      }, animated ? 280 : 80);
    },
    [commitSlot]
  );

  const scheduleSettle = useCallback(
    (offsetY: number) => {
      lastOffsetYRef.current = offsetY;
      clearSettleTimer();
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        if (draggingRef.current || ignoreViewabilityRef.current) return;
        settleToNearestSlot(lastOffsetYRef.current, true);
      }, 140);
    },
    [clearSettleTimer, settleToNearestSlot]
  );

  useEffect(() => () => clearSettleTimer(), [clearSettleTimer]);

  const onPagerScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      lastOffsetYRef.current = e.nativeEvent.contentOffset.y;
      if (draggingRef.current || ignoreViewabilityRef.current) return;
      scheduleSettle(lastOffsetYRef.current);
    },
    [scheduleSettle]
  );

  const onPagerEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      draggingRef.current = false;
      const y = e.nativeEvent.contentOffset.y;
      lastOffsetYRef.current = y;
      if (shouldWaitForMomentum(e.nativeEvent.velocity?.y)) {
        ignoreViewabilityRef.current = true;
        scheduleSettle(y);
        return;
      }
      clearSettleTimer();
      settleToNearestSlot(y, true);
    },
    [clearSettleTimer, scheduleSettle, settleToNearestSlot]
  );

  const onPagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      draggingRef.current = false;
      clearSettleTimer();
      const y = e.nativeEvent.contentOffset.y;
      lastOffsetYRef.current = y;
      settleToNearestSlot(y, !isPageAligned(y, pageHeightRef.current, slotsRef.current.length));
    },
    [clearSettleTimer, settleToNearestSlot]
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (ignoreViewabilityRef.current || draggingRef.current) return;
      const first = viewableItems.find((v) => v.isViewable && typeof v.index === "number");
      if (first?.index != null) commitSlot(first.index);
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 120,
  }).current;

  const openComments = useCallback(
    (postId: string, commentCount: number) => {
      setCommentsPostId(postId);
      setHeaderCommentCount(commentCount);
      setCommentDraft("");
      void queryClient.ensureQueryData(postCommentsQueryOptions(postId));
    },
    [queryClient]
  );

  const prefetchComments = useCallback(
    (postId: string) => {
      prefetchPostComments(queryClient, postId);
    },
    [queryClient]
  );

  const submitComment = useCallback(async () => {
    if (!commentsPostId || !commentDraft.trim() || commentBusy) return;
    setCommentBusy(true);
    try {
      const res = await createPostComment(commentsPostId, commentDraft.trim());
      queryClient.setQueryData<PostCommentsResponse>(
        postCommentsQueryKey(commentsPostId),
        (old) => {
          const prev = parsePostComments(old);
          return {
            ...(old ?? {}),
            comments: [res.comment, ...prev],
            total: (old?.total ?? prev.length) + 1,
          };
        }
      );
      setCommentDraft("");
      setHeaderCommentCount((n) => n + 1);
    } catch {
      // keep draft
    } finally {
      setCommentBusy(false);
    }
  }, [commentBusy, commentDraft, commentsPostId, queryClient]);

  const goSlot = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(activeSlotRef.current + delta, 0), slots.length - 1);
      if (next === activeSlotRef.current) return;
      snapToSlot(next, true);
    },
    [slots.length, snapToSlot]
  );

  const onFastForwardChange = useCallback((hidden: boolean) => {
    setChromeHidden(hidden);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ReelsSlot; index: number }) => {
      if (item.kind === "ad") {
        return (
          <ReelSponsoredSlide
            ad={item.ad}
            width={width}
            height={height}
            stageWidth={chrome.stageWidth}
            stageLeft={chrome.stageLeft}
          />
        );
      }
      const near = Math.abs(index - activeSlot) <= PerformanceBudgets.reelsPrebufferNeighbors;
      return (
        <FeedVideoPostSlide
          group={item.group}
          width={width}
          height={height}
          stageWidth={chrome.stageWidth}
          stageLeft={chrome.stageLeft}
          active={index === activeSlot}
          loadPlayer={near}
          initialVideoIndex={seedVideoByGroup[item.group.postId] ?? 0}
          onOpenComments={openComments}
          onPrefetchComments={prefetchComments}
          onFastForwardChange={index === activeSlot ? onFastForwardChange : undefined}
        />
      );
    },
    [
      activeSlot,
      chrome.stageLeft,
      chrome.stageWidth,
      height,
      onFastForwardChange,
      openComments,
      prefetchComments,
      seedVideoByGroup,
      width,
    ]
  );

  const dimKeyRef = useRef(`${width}x${height}`);
  useEffect(() => {
    const key = `${width}x${height}`;
    if (dimKeyRef.current === key) return;
    dimKeyRef.current = key;
    const index = activeSlotRef.current;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: pageOffsetForIndex(index, height),
        animated: false,
      });
    });
  }, [height, width]);

  useEffect(() => {
    setChromeHidden(false);
  }, [activeSlot]);

  if (feedQuery.isLoading && groups.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!chromeHidden ? (
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {!chromeHidden && chrome.isWide ? (
        <ReelsWideNavRail
          width={chrome.leftRailWidth}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      ) : null}

      {/* Up / down affordances like web */}
      {!chromeHidden ? (
        <View style={[styles.navArrows, { top: insets.top + 56 }]} pointerEvents="box-none">
          <Pressable style={styles.arrowBtn} onPress={() => goSlot(-1)} disabled={activeSlot <= 0}>
            <Ionicons name="chevron-up" size={22} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.arrowBtn}
            onPress={() => goSlot(1)}
            disabled={activeSlot >= slots.length - 1}
          >
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        style={styles.pager}
        data={slots}
        extraData={`${activeSlot}:${chrome.stageWidth}:${chrome.stageLeft}:${height}`}
        keyExtractor={(s) => s.key}
        renderItem={renderItem}
        pagingEnabled={Platform.OS === "ios"}
        snapToInterval={Platform.OS === "android" ? height : undefined}
        snapToOffsets={snapOffsets}
        snapToAlignment={Platform.OS === "android" ? "start" : undefined}
        decelerationRate="fast"
        disableIntervalMomentum
        directionalLockEnabled
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        onLayout={onListLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        onScroll={onPagerScroll}
        onScrollBeginDrag={() => {
          draggingRef.current = true;
          ignoreViewabilityRef.current = true;
          settlingRef.current = false;
          clearSettleTimer();
        }}
        onScrollEndDrag={onPagerEndDrag}
        onMomentumScrollEnd={onPagerMomentumEnd}
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
              offset: pageOffsetForIndex(index, pageHeightRef.current),
              animated: false,
            });
          });
        }}
        getItemLayout={(_, index) => ({
          length: height,
          offset: pageOffsetForIndex(index, height),
          index,
        })}
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
            void feedQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.85}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={[styles.center, { height }]}>
            <Text style={styles.muted}>{copy.noVideos}</Text>
          </View>
        }
      />

      <Modal
        visible={!!commentsPostId}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsPostId(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetScrim} onPress={() => setCommentsPostId(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{copy.comments(commentTotal)}</Text>
              <Pressable onPress={() => setCommentsPostId(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.sheetSort}>{copy.sortNewest}</Text>
            {showCommentsSpinner ? (
              <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: height * 0.42 }}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Text style={styles.commentUser}>
                      {item.author.username}
                      <Text style={styles.commentMeta}> · </Text>
                    </Text>
                    <TranslatableText text={item.content} style={styles.commentBody} lightLinks />
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.muted}>{copy.noComments}</Text>
                }
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={copy.commentPh}
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={commentDraft}
                onChangeText={setCommentDraft}
                onSubmitEditing={() => void submitComment()}
                returnKeyType="send"
              />
              <Pressable onPress={() => void submitComment()} disabled={commentBusy}>
                <Text style={styles.commentSend}>{copy.postComment}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  pager: { flex: 1, overflow: "hidden" },
  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: "rgba(255,255,255,0.7)", textAlign: "center", padding: 24 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 44, height: 40, alignItems: "center", justifyContent: "center" },
  navArrows: {
    position: "absolute",
    right: 10,
    zIndex: 20,
    gap: 8,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheetScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "70%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sheetSort: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4, marginBottom: 8 },
  commentRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" },
  commentUser: { color: "#fff", fontWeight: "800", marginBottom: 4 },
  commentMeta: { color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  commentBody: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 10,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
  },
  commentSend: { color: "#6BA3E8", fontWeight: "800" },
});
