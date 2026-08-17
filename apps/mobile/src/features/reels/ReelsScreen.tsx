import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
  useWindowDimensions,
} from "react-native";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchFeedPage, type FeedPost } from "@/api/feed";
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
  type FeedVideoGroup,
} from "@/features/feed/feed-video-groups";
import { FeedVideoPostSlide } from "@/features/feed/FeedVideoPostSlide";
import { LinkifiedText } from "@/ui/LinkifiedText";
import type { RootStackParamList } from "@/navigation/types";

export function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Reels">>();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<FeedVideoGroup>>(null);

  const targetPostId = route.params?.postId;
  const targetMediaId = route.params?.mediaId;
  const targetMediaIndex = route.params?.mediaIndex;

  const [activeGroup, setActiveGroup] = useState(0);
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
    // Same cache as Home — opening Reels must feel instant (Twitter/IG), not a refetch.
    staleTime: 90_000,
    refetchOnMount: false,
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
  const groups = useMemo(
    () => buildFeedVideoGroups(posts, paymentsEnabled),
    [posts, paymentsEnabled]
  );

  useEffect(() => {
    if (didSeed || groups.length === 0) return;
    if (targetPostId) {
      const pos = findGroupOpenPosition(groups, {
        postId: targetPostId,
        mediaId: targetMediaId,
        mediaIndex: targetMediaIndex,
      });
      if (pos) {
        setActiveGroup(pos.groupIndex);
        setSeedVideoByGroup({ [groups[pos.groupIndex]!.postId]: pos.videoIndex });
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index: pos.groupIndex, animated: false });
        });
        setDidSeed(true);
        return;
      }
    }
    setDidSeed(true);
  }, [didSeed, groups, targetMediaId, targetMediaIndex, targetPostId]);

  /** Prefetch comments for visible reels so the sheet opens instantly (IG/X). */
  useEffect(() => {
    if (groups.length === 0) return;
    const warm = (idx: number) => {
      const g = groups[idx];
      if (!g) return;
      const count = g.videos[0]?.commentCount ?? 0;
      if (count > 0) prefetchPostComments(queryClient, g.postId);
    };
    warm(activeGroup);
    warm(activeGroup - 1);
    warm(activeGroup + 1);
    if (targetPostId) prefetchPostComments(queryClient, targetPostId);
  }, [activeGroup, groups, queryClient, targetPostId]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable && typeof v.index === "number");
      if (first?.index != null) setActiveGroup(first.index);
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 60,
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
      await queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
    } catch {
      // keep draft
    } finally {
      setCommentBusy(false);
    }
  }, [commentBusy, commentDraft, commentsPostId, queryClient]);

  const goGroup = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(activeGroup + delta, 0), groups.length - 1);
      if (next === activeGroup) return;
      setActiveGroup(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [activeGroup, groups.length]
  );

  const onFastForwardChange = useCallback((hidden: boolean) => {
    setChromeHidden(hidden);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideoGroup; index: number }) => (
      <FeedVideoPostSlide
        group={item}
        width={width}
        height={height}
        active={index === activeGroup}
        initialVideoIndex={seedVideoByGroup[item.postId] ?? 0}
        onOpenComments={openComments}
        onPrefetchComments={prefetchComments}
        onFastForwardChange={index === activeGroup ? onFastForwardChange : undefined}
      />
    ),
    [
      activeGroup,
      height,
      onFastForwardChange,
      openComments,
      prefetchComments,
      seedVideoByGroup,
      width,
    ]
  );

  useEffect(() => {
    setChromeHidden(false);
  }, [activeGroup]);

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
          <Text style={styles.title}>영상</Text>
          <View style={styles.backBtn} />
        </View>
      ) : null}

      {/* Up / down affordances like web */}
      {!chromeHidden ? (
        <View style={[styles.navArrows, { top: insets.top + 56 }]} pointerEvents="box-none">
          <Pressable style={styles.arrowBtn} onPress={() => goGroup(-1)} disabled={activeGroup <= 0}>
            <Ionicons name="chevron-up" size={22} color="#fff" />
          </Pressable>
          <Pressable
            style={styles.arrowBtn}
            onPress={() => goGroup(1)}
            disabled={activeGroup >= groups.length - 1}
          >
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={groups}
        keyExtractor={(g) => g.postId}
        renderItem={renderItem}
        pagingEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
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
        removeClippedSubviews
        ListEmptyComponent={
          <View style={[styles.center, { height }]}>
            <Text style={styles.muted}>재생할 영상이 없습니다.</Text>
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
              <Text style={styles.sheetTitle}>댓글 {commentTotal}</Text>
              <Pressable onPress={() => setCommentsPostId(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.sheetSort}>최신순</Text>
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
                    <LinkifiedText text={item.content} style={styles.commentBody} lightLinks />
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.muted}>아직 댓글이 없습니다.</Text>
                }
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="댓글 추가..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={commentDraft}
                onChangeText={setCommentDraft}
                onSubmitEditing={() => void submitComment()}
                returnKeyType="send"
              />
              <Pressable onPress={() => void submitComment()} disabled={commentBusy}>
                <Text style={styles.commentSend}>게시</Text>
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
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
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
