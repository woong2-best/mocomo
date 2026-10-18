import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import {
  createPostComment,
  fetchPostDetail,
  toggleCommentLike,
  type CommentItem,
} from "@/api/social";
import { PostCommentOverflowMenu } from "@/features/feed/PostCommentOverflowMenu";
import { Ionicons } from "@expo/vector-icons";
import {
  mapCommentBuckets,
  parseCommentBuckets,
  postCommentsQueryKey,
  postCommentsQueryOptions,
  withOptimisticComment,
  type PostCommentsResponse,
} from "@/api/post-comments-query";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { useUserProfileNav, type UserProfileSeed } from "@/features/profile/user-profile-nav";
import { useKeyboardLift } from "@/lib/use-keyboard-inset";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { TranslatableText } from "@/ui/TranslatableText";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

export function PostDetailScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { keyboardLift } = useKeyboardLift();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile } = useUserProfileNav();
  const route = useRoute<RouteProp<RootStackParamList, "PostDetail">>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [menuComment, setMenuComment] = useState<CommentItem | null>(null);
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
  const postId = route.params.id;

  const onPressVideo = useCallback(
    (id: string, mediaId?: string, mediaIndex?: number) => {
      navigation.navigate("Reels", { postId: id, mediaId, mediaIndex });
    },
    [navigation]
  );

  const postQuery = useQuery({
    queryKey: ["mobile-post", postId],
    queryFn: () => fetchPostDetail(postId),
  });

  const post = postQuery.data?.post;
  const isQnaPost = Boolean(post?.community?.slug);

  const commentsQuery = useQuery({
    ...postCommentsQueryOptions(postId, isQnaPost),
    enabled: !!post,
  });

  const buckets = useMemo(
    () => parseCommentBuckets(commentsQuery.data),
    [commentsQuery.data]
  );

  type CommentRow =
    | { kind: "header"; id: string; title: string }
    | { kind: "comment"; id: string; comment: CommentItem };

  const commentRows = useMemo<CommentRow[]>(() => {
    if (isQnaPost) {
      return buckets.recent.map((comment) => ({
        kind: "comment" as const,
        id: comment.id,
        comment,
      }));
    }
    const rows: CommentRow[] = [];
    if (buckets.pinned.length) {
      rows.push({ kind: "header", id: "h-pinned", title: t("m.feed.pinned_comments") });
      for (const comment of buckets.pinned) {
        rows.push({ kind: "comment", id: comment.id, comment });
      }
    }
    if (buckets.top.length) {
      rows.push({ kind: "header", id: "h-top", title: t("m.feed.top_comments") });
      for (const comment of buckets.top) {
        rows.push({ kind: "comment", id: comment.id, comment });
      }
    }
    if (buckets.recent.length) {
      rows.push({ kind: "header", id: "h-recent", title: t("m.feed.latest_comments") });
      for (const comment of buckets.recent) {
        rows.push({ kind: "comment", id: comment.id, comment });
      }
    }
    return rows;
  }, [buckets, isQnaPost, t]);

  const commentsEmpty = buckets.pinned.length + buckets.top.length + buckets.recent.length === 0;
  const canPinComments = !isQnaPost && !!user?.id && user.id === post?.author?.id;

  const commentMut = useMutation({
    mutationFn: (content: string) => createPostComment(postId, content),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: postCommentsQueryKey(postId) });
      const previous = queryClient.getQueryData<PostCommentsResponse>(
        postCommentsQueryKey(postId)
      );
      const optimistic: CommentItem = {
        id: `temp-${Date.now()}`,
        content,
        createdAt: new Date().toISOString(),
        author: {
          id: user?.id ?? "me",
          username: user?.username ?? "me",
          name: user?.name ?? user?.username ?? t("m.feed.me"),
          image: user?.image ?? null,
        },
      };
      queryClient.setQueryData<PostCommentsResponse>(
        postCommentsQueryKey(postId),
        withOptimisticComment(previous, optimistic, isQnaPost ? "append" : "prepend")
      );
      setDraft("");
      return { previous, tempId: optimistic.id };
    },
    onError: (err, _content, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(postCommentsQueryKey(postId), ctx.previous);
      }
      showIslandError(t("m.common.error"), err instanceof Error ? err.message : t("m.feed.could_not_post_comment"));
    },
    onSuccess: (res, _content, ctx) => {
      queryClient.setQueryData<PostCommentsResponse>(postCommentsQueryKey(postId), (old) => {
        const cleaned = mapCommentBuckets(old, (c) => c);
        const recent = (cleaned.comments ?? []).filter(
          (c) => c.id !== ctx?.tempId && c.id !== res.comment.id
        );
        return {
          ...cleaned,
          comments: isQnaPost ? [...recent, res.comment] : [res.comment, ...recent],
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-post", postId] });
    },
  });
  const headerTitle = isQnaPost ? "QnA" : t("m.common.post");
  const composerBottomPad =
    keyboardLift > 0 ? spacing.sm : Math.max(spacing.md, insets.bottom);
  const androidKeyboardLift = Platform.OS === "android" ? keyboardLift : 0;

  function submitComment() {
    const content = draft.trim();
    if (!content) return;
    if (!user) {
      showIslandError(t("m.common.sign_in_required"), t("m.feed.sign_in_to_comment"));
      return;
    }
    commentMut.mutate(content);
  }

  async function toggleLike(item: CommentItem) {
    if (!user || likeBusyId) return;
    const liked = Boolean(item.liked);
    const prevCount = item.likeCount ?? 0;
    const nextLiked = !liked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
    setLikeBusyId(item.id);
    const patch = (likedVal: boolean, count: number) =>
      queryClient.setQueryData<PostCommentsResponse>(postCommentsQueryKey(postId), (old) =>
        mapCommentBuckets(old, (c) =>
          c.id === item.id ? { ...c, liked: likedVal, likeCount: count } : c
        )
      );
    patch(nextLiked, nextCount);
    try {
      const res = await toggleCommentLike(item.id, liked);
      patch(res.liked, res.likeCount);
    } catch (err) {
      patch(liked, prevCount);
      showIslandError(t("m.common.error"), err instanceof Error ? err.message : t("m.feed.could_not_like_comment"));
    } finally {
      setLikeBusyId(null);
    }
  }

  return (
    <Screen>
      <AppHeader title={headerTitle} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      {postQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : postQuery.isError || !post ? (
        <Text style={styles.error}>{t("m.feed.could_not_load_post")}</Text>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={commentRows}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={
              <View>
                <FeedPostCard
                  post={post}
                  expandBody
                  previewActive
                  viewTrackActive
                  paymentsEnabled={post.paymentsEnabled}
                  onPurchaseSuccess={() => {
                    void queryClient.invalidateQueries({
                      queryKey: ["mobile-post", postId],
                    });
                    void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
                    void postQuery.refetch();
                  }}
                  onPressAuthor={(author: UserProfileSeed) => openUserProfile(author)}
                  onPressVideo={onPressVideo}
                />
                <Text style={styles.section}>{isQnaPost ? "A" : t("m.feed.comments")}</Text>
              </View>
            }
            ListEmptyComponent={
              commentsQuery.isLoading ? (
                <ActivityIndicator
                  color={colors.terracotta}
                  style={{ marginVertical: spacing.md }}
                />
              ) : commentsEmpty ? (
                <Text style={styles.muted}>{t("m.common.no_comments_yet")}</Text>
              ) : null
            }
            renderItem={({ item: row }) => {
              if (row.kind === "header") {
                return <Text style={styles.section}>{row.title}</Text>;
              }
              const item = row.comment;
              const authorSeed: UserProfileSeed = {
                username: item.author.username,
                name: item.author.name,
                image: item.author.image,
              };
              const displayName = item.author.name || item.author.username;
              const likeCount = item.likeCount ?? 0;
              const liked = Boolean(item.liked);
              const isOwn = user?.id === item.author.id;
              return (
                <View style={styles.comment}>
                  <View style={styles.commentTopRow}>
                    <Pressable
                      style={styles.commentHeader}
                      onPress={() => openUserProfile(authorSeed)}
                      accessibilityRole="button"
                      accessibilityLabel={t("m.feed.displayname_profile", { displayName: String(displayName) })}
                    >
                      <FolkAvatar
                        uri={item.author.image}
                        name={displayName}
                        size={36}
                      />
                      <View style={styles.commentHeaderText}>
                        <Text style={styles.commentAuthor} numberOfLines={1}>
                          {displayName}
                          <Text style={styles.commentHandle}> @{item.author.username}</Text>
                        </Text>
                        {item.isPinned ? (
                          <Text style={styles.commentHandle}>{t("m.feed.pinned_comments")}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                    <View style={styles.commentActions}>
                      {user && (!isOwn || canPinComments) ? (
                        <Pressable
                          style={styles.iconBtn}
                          onPress={() => setMenuComment(item)}
                          accessibilityLabel={t("m.feed.comment_menu")}
                        >
                          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={styles.likeBtn}
                        onPress={() => void toggleLike(item)}
                        disabled={!user || likeBusyId === item.id}
                        accessibilityLabel={liked ? t("m.feed.unlike") : t("m.feed.like")}
                      >
                        <Ionicons
                          name={liked ? "heart" : "heart-outline"}
                          size={18}
                          color={liked ? colors.terracotta : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.likeCount,
                            liked && { color: colors.terracotta },
                          ]}
                        >
                          {likeCount}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <TranslatableText text={item.content} style={styles.commentBody} />
                </View>
              );
            }}
          />
          <View
            style={[
              styles.composer,
              {
                paddingBottom: composerBottomPad,
                marginBottom: androidKeyboardLift,
              },
            ]}
          >
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={t("m.feed.write_a_comment")}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <FolkButton
              label={t("m.common.post")}
              disabled={!draft.trim()}
              onPress={submitComment}
              style={{ minWidth: 88 }}
            />
          </View>
        </KeyboardAvoidingView>
      )}
      {menuComment ? (
        <PostCommentOverflowMenu
          visible={!!menuComment}
          onClose={() => setMenuComment(null)}
          postId={postId}
          commentId={menuComment.id}
          authorId={menuComment.author.id}
          authorUsername={menuComment.author.username}
          isOwnComment={user?.id === menuComment.author.id}
          canPin={canPinComments}
          isPinned={!!menuComment.isPinned}
        />
      ) : null}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    error: { color: colors.danger, padding: spacing.lg, fontWeight: "600" },
    section: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      fontWeight: "800",
      color: colors.text,
      fontSize: 16,
    },
    comment: {
      marginHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    commentTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    commentHeader: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 6,
      minWidth: 0,
    },
    commentActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingTop: 4,
    },
    iconBtn: {
      minWidth: 36,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    likeBtn: {
      minWidth: 44,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    likeCount: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
    },
    commentHeaderText: { flex: 1, minWidth: 0 },
    commentAuthor: { fontWeight: "800", color: colors.text, fontSize: 14 },
    commentHandle: { fontWeight: "500", color: colors.textMuted },
    commentBody: { color: colors.text, lineHeight: 20, fontSize: 15 },
    muted: {
      color: colors.textMuted,
      fontWeight: "600",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    composer: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
      backgroundColor: colors.background,
      alignItems: "flex-end",
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
    },
  });
}
