import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchFeedPage, type FeedPost } from "@/api/feed";
import { fetchPostDetail } from "@/api/social";
import { fetchReelsAds } from "@/api/ads";
import { createPostComment } from "@/api/social";
import type { CommentGifMeta } from "@/lib/giphy-meta";
import type { CommentReplyTarget } from "@/features/feed/CommentThreadExtras";
import {
  parseCommentBuckets,
  postCommentsQueryKey,
  postCommentsQueryOptions,
  prefetchPostComments,
  withOptimisticComment,
  withOptimisticReply,
  type PostCommentsResponse,
} from "@/api/post-comments-query";
import { ReelsCommentBackdrop } from "@/features/reels/ReelsCommentBackdrop";
import { ReelsCommentsSheet } from "@/features/reels/ReelsCommentsSheet";
import {
  REELS_COMMENT_DURATION_MS,
  reelsCommentSheetHeight,
  reelsCommentVideoAtProgress,
} from "@/features/reels/reels-comment-layout";
import { useAuth } from "@/auth/AuthContext";
import {
  buildFeedVideoGroups,
  findGroupOpenPosition,
  stabilizeVideoGroups,
  type FeedVideoGroup,
} from "@/features/feed/feed-video-groups";
import { FeedVideoPostSlide } from "@/features/feed/FeedVideoPostSlide";
import { ReelSponsoredSlide } from "@/features/reels/ReelSponsoredSlide";
import { ReelSlotBoundary } from "@/features/reels/ReelSlotBoundary";
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
import { useI18n } from "@/i18n/I18nProvider";
import { reelsUi } from "@/features/reels/reels-ui";
import type { RootStackParamList } from "@/navigation/types";

export function ReelsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
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
  const didSeedRef = useRef(false);

  const [activeSlot, setActiveSlot] = useState(0);
  const [seedVideoByGroup, setSeedVideoByGroup] = useState<Record<string, number>>({});
  const [didSeed, setDidSeed] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsUiOpen, setCommentsUiOpen] = useState(false);
  const isCommentOpen = commentsUiOpen;
  const [headerCommentCount, setHeaderCommentCount] = useState(0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [pinchZooming, setPinchZooming] = useState(false);
  const commentProgress = useSharedValue(0);
  const commentLayerSv = useSharedValue(0);
  const liveSheetHeight = useMemo(
    () => reelsCommentSheetHeight(height, insets.bottom),
    [height, insets.bottom]
  );
  const [sheetHeight, setSheetHeight] = useState(liveSheetHeight);
  const [commentLayerHeight, setCommentLayerHeight] = useState(height);
  const screenHSv = useSharedValue(height);
  const sheetHSv = useSharedValue(sheetHeight);
  const commentFrameHSv = useSharedValue(sheetHeight);
  const commentLiftSv = useSharedValue(0);
  screenHSv.value = height;
  sheetHSv.value = sheetHeight;

  const commentsQuery = useQuery({
    ...postCommentsQueryOptions(commentsPostId ?? ""),
    enabled: !!commentsPostId,
    placeholderData: (previous) =>
      previous ??
      (commentsPostId
        ? queryClient.getQueryData<PostCommentsResponse>(postCommentsQueryKey(commentsPostId))
        : undefined),
  });

  const commentBuckets = useMemo(
    () => parseCommentBuckets(commentsQuery.data),
    [commentsQuery.data]
  );
  const comments = useMemo(
    () => [...commentBuckets.pinned, ...commentBuckets.top, ...commentBuckets.recent],
    [commentBuckets]
  );
  const canPinReels =
    !!user?.id &&
    !!commentsQuery.data?.postAuthorId &&
    user.id === commentsQuery.data.postAuthorId;

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

  const targetPostQuery = useQuery({
    queryKey: ["mobile-post", targetPostId],
    queryFn: () => fetchPostDetail(targetPostId!),
    enabled: !!targetPostId,
    staleTime: 30_000,
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
    const pinned = targetPostQuery.data?.post;
    if (
      pinned &&
      !pinned.communityId &&
      !pinned.community?.slug &&
      !list.some((post) => post.id === pinned.id)
    ) {
      list.unshift(pinned);
    }
    return list;
  }, [feedQuery.data, queryClient, targetPostQuery.data]);

  const paymentsEnabled = feedQuery.data?.pages[0]?.paymentsEnabled ?? false;
  const groups = useMemo(() => {
    const prev = groupsStableRef.current;
    let next = stabilizeVideoGroups(prev, buildFeedVideoGroups(posts, paymentsEnabled));
    if (targetPostId && !didSeedRef.current) {
      const idx = next.findIndex((group) => group.postId === targetPostId);
      const wasInPrev = prev.some((group) => group.postId === targetPostId);
      if (idx > 0 && !wasInPrev) {
        const copy = [...next];
        const [hit] = copy.splice(idx, 1);
        if (hit) copy.unshift(hit);
        next = copy;
      }
    }
    groupsStableRef.current = next;
    return next;
  }, [paymentsEnabled, posts, targetPostId]);

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
    const pinned = targetPostQuery.data?.post;
    if (
      pinned &&
      targetPostId &&
      pinned.id === targetPostId &&
      (pinned.communityId || pinned.community?.slug)
    ) {
      navigation.replace("PostDetail", { id: pinned.id });
    }
  }, [navigation, targetPostId, targetPostQuery.data]);

  useEffect(() => {
    if (didSeed || slots.length === 0) return;
    if (targetPostId) {
      const pinned = targetPostQuery.data?.post;
      if (pinned && (pinned.communityId || pinned.community?.slug)) return;
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
        didSeedRef.current = true;
        setDidSeed(true);
        return;
      }
      if (!targetPostQuery.isFetched) return;
    }
    const first = slots[0];
    if (first) activeIdentityRef.current = reelsSlotIdentity(first);
    didSeedRef.current = true;
    setDidSeed(true);
  }, [
    didSeed,
    groups,
    slots,
    snapToSlot,
    targetMediaId,
    targetMediaIndex,
    targetPostId,
    targetPostQuery.data,
    targetPostQuery.isFetched,
  ]);

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

  const closeComments = useCallback(() => {
    commentLayerSv.value = 0;
    commentProgress.value = 0;
    setCommentsPostId(null);
    setCommentsUiOpen(false);
    setCommentDraft("");
  }, [commentLayerSv, commentProgress]);

  const requestCloseComments = useCallback(() => {
    commentProgress.value = withTiming(
      0,
      { duration: REELS_COMMENT_DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(closeComments)();
      }
    );
  }, [closeComments, commentProgress]);

  const openComments = useCallback(
    (postId: string, commentCount: number) => {
      setCommentsPostId(postId);
      setCommentsUiOpen(true);
      setHeaderCommentCount(commentCount);
      setCommentDraft("");
      commentLayerSv.value = 1;
      commentProgress.value = withTiming(1, {
        duration: REELS_COMMENT_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      void queryClient.ensureQueryData(postCommentsQueryOptions(postId));
    },
    [commentLayerSv, commentProgress, queryClient]
  );

  const pagerAnimStyle = useAnimatedStyle(() => {
    if (commentLayerSv.value < 0.5) {
      return {
        transform: [{ translateY: 0 }, { scale: 1 }],
        borderRadius: 0,
        overflow: "hidden",
      };
    }
    const v = reelsCommentVideoAtProgress(
      commentProgress.value,
      screenHSv.value,
      sheetHSv.value
    );
    return {
      transform: [{ translateY: v.translateY }, { scale: v.scale }],
      borderRadius: v.borderRadius,
      overflow: "hidden",
    };
  });

  const prefetchComments = useCallback(
    (postId: string) => {
      prefetchPostComments(queryClient, postId);
    },
    [queryClient]
  );

  const submitComment = useCallback(async (
    media?: { mediaType: "PHOTO" | "GIF"; mediaUrl: string; mediaMeta?: CommentGifMeta | null } | null,
    reply?: CommentReplyTarget | null
  ) => {
    if (!commentsPostId || commentBusy) return;
    if (!commentDraft.trim() && !media) return;
    setCommentBusy(true);
    try {
      const res = await createPostComment(
        commentsPostId,
        commentDraft.trim(),
        media,
        reply ? { parentId: reply.rootId, replyToUserId: reply.userId } : null
      );
      queryClient.setQueryData<PostCommentsResponse>(
        postCommentsQueryKey(commentsPostId),
        (old) =>
          reply
            ? withOptimisticReply(old, reply.rootId, res.comment)
            : withOptimisticComment(old, res.comment, "prepend")
      );
      setCommentDraft("");
      setHeaderCommentCount((n) => n + 1);
    } catch {
      // keep draft
    } finally {
      setCommentBusy(false);
    }
  }, [commentBusy, commentDraft, commentsPostId, queryClient]);

  const onFastForwardChange = useCallback((hidden: boolean) => {
    setChromeHidden(hidden);
  }, []);

  const onPinchZoomChange = useCallback((zooming: boolean) => {
    setPinchZooming(zooming);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ReelsSlot; index: number }) => {
      if (item.kind === "ad") {
        return (
          <ReelSlotBoundary width={width} height={height}>
            <ReelSponsoredSlide
              ad={item.ad}
              width={width}
              height={height}
              stageWidth={chrome.stageWidth}
              stageLeft={chrome.stageLeft}
            />
          </ReelSlotBoundary>
        );
      }
      const near = Math.abs(index - activeSlot) <= PerformanceBudgets.reelsPrebufferNeighbors;
      return (
        <ReelSlotBoundary width={width} height={height}>
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
            onPinchZoomChange={index === activeSlot ? onPinchZoomChange : undefined}
            commentsOpen={index === activeSlot && isCommentOpen}
          />
        </ReelSlotBoundary>
      );
    },
    [
      activeSlot,
      chrome.stageLeft,
      chrome.stageWidth,
      isCommentOpen,
      height,
      onFastForwardChange,
      onPinchZoomChange,
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
    setPinchZooming(false);
  }, [activeSlot]);

  useEffect(() => {
    setSheetHeight(liveSheetHeight);
  }, [liveSheetHeight]);

  useEffect(() => {
    if (!isCommentOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      requestCloseComments();
      return true;
    });
    return () => sub.remove();
  }, [isCommentOpen, requestCloseComments]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        commentLayerSv.value = 0;
        commentProgress.value = 0;
        setCommentsPostId(null);
        setCommentsUiOpen(false);
        setCommentDraft("");
      };
    }, [commentLayerSv, commentProgress])
  );

  const hideChrome = chromeHidden || pinchZooming || isCommentOpen;
  const activeIsAd = slots[activeSlot]?.kind === "ad";

  if (feedQuery.isLoading && groups.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!hideChrome && !activeIsAd ? (
        <View style={[styles.header, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {!hideChrome && chrome.isWide ? (
        <ReelsWideNavRail
          width={chrome.leftRailWidth}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      ) : null}

      <Animated.View
        collapsable={false}
        pointerEvents={isCommentOpen ? "none" : "auto"}
        style={[styles.pager, pagerAnimStyle]}
      >
      <FlatList
        ref={listRef}
        style={styles.pagerFill}
        data={slots}
        extraData={`${activeSlot}:${chrome.stageWidth}:${chrome.stageLeft}:${height}:${isCommentOpen ? 1 : 0}`}
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
        nestedScrollEnabled
        scrollEnabled={!pinchZooming && !chromeHidden && !isCommentOpen}
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
      </Animated.View>

      {isCommentOpen ? (
        <View
          style={styles.commentLayer}
          pointerEvents="box-none"
          onLayout={(e: LayoutChangeEvent) => {
            const next = Math.round(e.nativeEvent.layout.height);
            if (next > 200) {
              setCommentLayerHeight((prev) => (prev === next ? prev : next));
            }
          }}
        >
          <ReelsCommentBackdrop
            progress={commentProgress}
            screenHeight={screenHSv}
            sheetHeight={sheetHSv}
            frameHeight={commentFrameHSv}
            frameLift={commentLiftSv}
            onDismiss={requestCloseComments}
            accessibilityLabel={t("m.common.close")}
          />
          <ReelsCommentsSheet
            progress={commentProgress}
            sheetHeight={sheetHeight}
            layerHeight={commentLayerHeight}
            frameHeightSv={commentFrameHSv}
            frameLiftSv={commentLiftSv}
            commentsPostId={commentsPostId}
            comments={comments}
            commentTotal={commentTotal}
            showSpinner={showCommentsSpinner}
            draft={commentDraft}
            busy={commentBusy}
            canPin={canPinReels}
            copy={copy}
            onDraftChange={setCommentDraft}
            onSubmit={(media, reply) => void submitComment(media, reply)}
            onClosed={closeComments}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  pager: { flex: 1, overflow: "hidden" },
  pagerFill: { flex: 1 },
  commentLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    elevation: 40,
  },
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
});
