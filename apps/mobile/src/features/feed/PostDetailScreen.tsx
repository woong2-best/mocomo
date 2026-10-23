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
  acceptQnaAnswer,
  createPostComment,
  fetchPostDetail,
  toggleCommentLike,
  type CommentItem,
} from "@/api/social";
import { PostCommentOverflowMenu } from "@/features/feed/PostCommentOverflowMenu";
import { CommentMediaBlock } from "@/features/feed/CommentMediaBlock";
import { TenorGifSheet } from "@/features/feed/TenorGifSheet";
import { uploadLocalFile } from "@/api/upload-file";
import * as ImagePicker from "expo-image-picker";
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
  const [attach, setAttach] = useState<{ mediaType: "PHOTO" | "GIF"; mediaUrl: string } | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [menuComment, setMenuComment] = useState<CommentItem | null>(null);
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
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
      const acceptedId = post?.acceptedCommentId;
      const sorted = [...buckets.recent].sort((a, b) => {
        const aSel = a.id === acceptedId || Boolean(a.acceptedAt) ? 0 : 1;
        const bSel = b.id === acceptedId || Boolean(b.acceptedAt) ? 0 : 1;
        return aSel - bSel;
      });
      return sorted.map((comment) => ({
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
  }, [buckets, isQnaPost, post?.acceptedCommentId, t]);

  const commentsEmpty = buckets.pinned.length + buckets.top.length + buckets.recent.length === 0;
  const canPinComments = !isQnaPost && !!user?.id && user.id === post?.author?.id;

  const commentMut = useMutation({
    mutationFn: (input: { content: string; media?: { mediaType: "PHOTO" | "GIF"; mediaUrl: string } | null }) =>
      createPostComment(postId, input.content, input.media),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: postCommentsQueryKey(postId) });
      const previous = queryClient.getQueryData<PostCommentsResponse>(
        postCommentsQueryKey(postId)
      );
      const optimistic: CommentItem = {
        id: `temp-${Date.now()}`,
        content: input.content,
        createdAt: new Date().toISOString(),
        mediaType: input.media?.mediaType ?? "NONE",
        mediaUrl: input.media?.mediaUrl ?? null,
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
      setAttach(null);
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

  async function pickPhoto() {
    if (attach || uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setUploading(true);
    try {
      const url = await uploadLocalFile({
        uri: asset.uri,
        filename: asset.fileName ?? `comment-${Date.now()}.jpg`,
        contentType: asset.mimeType ?? "image/jpeg",
        category: "image",
      });
      setAttach({ mediaType: "PHOTO", mediaUrl: url });
    } catch (err) {
      showIslandError(t("m.common.error"), err instanceof Error ? err.message : t("m.feed.photo_failed"));
    } finally {
      setUploading(false);
    }
  }

  function submitComment() {
    const content = draft.trim();
    if (!content && !attach) return;
    if (!user) {
      showIslandError(t("m.common.sign_in_required"), t("m.feed.sign_in_to_comment"));
      return;
    }
    commentMut.mutate({ content, media: attach });
  }

  async function acceptAnswer(item: CommentItem) {
    if (!user || acceptingId || !isQnaPost) return;
    setAcceptingId(item.id);
    try {
      await acceptQnaAnswer(postId, item.id);
      void queryClient.invalidateQueries({ queryKey: postCommentsQueryKey(postId) });
      void queryClient.invalidateQueries({ queryKey: ["mobile-post", postId] });
    } catch (err) {
      showIslandError(
        t("m.common.error"),
        err instanceof Error ? err.message : t("qna.accept_failed")
      );
    } finally {
      setAcceptingId(null);
    }
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
                <Text style={styles.section}>
                  {isQnaPost
                    ? t("qna.answers", { count: String(buckets.recent.length) })
                    : t("m.feed.comments")}
                </Text>
              </View>
            }
            ListEmptyComponent={
              commentsQuery.isLoading ? (
                <ActivityIndicator
                  color={colors.terracotta}
                  style={{ marginVertical: spacing.md }}
                />
              ) : commentsEmpty ? (
                <Text style={styles.muted}>
                  {isQnaPost ? t("qna.first_answer") : t("m.common.no_comments_yet")}
                </Text>
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
              const selected =
                item.id === post.acceptedCommentId || Boolean(item.acceptedAt);
              const canAccept =
                isQnaPost &&
                !!user?.id &&
                user.id === post.author.id &&
                !post.acceptedCommentId &&
                !isOwn;
              return (
                <View style={styles.comment}>
                  {selected ? (
                    <Text style={styles.selectedBanner}>{t("qna.selected_banner")}</Text>
                  ) : null}
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
                      {canAccept ? (
                        <Pressable
                          style={styles.acceptBtn}
                          onPress={() => void acceptAnswer(item)}
                          disabled={!!acceptingId}
                        >
                          <Text style={styles.acceptBtnText}>{t("qna.accept")}</Text>
                        </Pressable>
                      ) : null}
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
                  {item.content ? (
                    <TranslatableText text={item.content} style={styles.commentBody} />
                  ) : null}
                  <CommentMediaBlock mediaType={item.mediaType} mediaUrl={item.mediaUrl} />
                </View>
              );
            }}
          />
          <View
            style={[
              styles.composerCol,
              {
                paddingBottom: composerBottomPad,
                marginBottom: androidKeyboardLift,
              },
            ]}
          >
            {attach ? (
              <View style={styles.previewRow}>
                <CommentMediaBlock mediaType={attach.mediaType} mediaUrl={attach.mediaUrl} />
                <Pressable onPress={() => setAttach(null)} style={styles.clearAttach}>
                  <Ionicons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.composer}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => void pickPhoto()}
                disabled={!!attach || uploading}
                accessibilityLabel={t("m.feed.attach_photo")}
              >
                <Ionicons
                  name={uploading ? "hourglass-outline" : "image-outline"}
                  size={22}
                  color={attach ? colors.textMuted : colors.cobalt}
                />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => setGifOpen(true)}
                disabled={!!attach || uploading}
                accessibilityLabel={t("m.feed.attach_gif")}
              >
                <Ionicons name="happy-outline" size={22} color={attach ? colors.textMuted : colors.cobalt} />
              </Pressable>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={isQnaPost ? t("qna.write_answer") : t("m.feed.write_a_comment")}
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <FolkButton
                label={isQnaPost ? t("qna.answer_button") : t("m.common.post")}
                disabled={(!draft.trim() && !attach) || uploading}
                onPress={submitComment}
                style={{ minWidth: 88 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
      <TenorGifSheet
        visible={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={(url) => setAttach({ mediaType: "GIF", mediaUrl: url })}
      />
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
    selectedBanner: {
      color: colors.cobalt,
      fontWeight: "700",
      fontSize: 13,
      marginBottom: 8,
    },
    acceptBtn: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.cobalt,
      alignItems: "center",
      justifyContent: "center",
    },
    acceptBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    muted: {
      color: colors.textMuted,
      fontWeight: "600",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    composerCol: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    previewRow: { flexDirection: "row", alignItems: "flex-start" },
    clearAttach: {
      marginLeft: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceRaised,
    },
    composer: {
      flexDirection: "row",
      gap: spacing.sm,
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
