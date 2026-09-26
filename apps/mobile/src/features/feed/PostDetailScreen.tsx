import { useMemo, useState } from "react";
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
  type CommentItem,
} from "@/api/social";
import {
  parsePostComments,
  postCommentsQueryKey,
  postCommentsQueryOptions,
  type PostCommentsResponse,
} from "@/api/post-comments-query";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { useUserProfileNav, type UserProfileSeed } from "@/features/profile/user-profile-nav";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { TranslatableText } from "@/ui/TranslatableText";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function PostDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile } = useUserProfileNav();
  const route = useRoute<RouteProp<RootStackParamList, "PostDetail">>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const postId = route.params.id;

  const postQuery = useQuery({
    queryKey: ["mobile-post", postId],
    queryFn: () => fetchPostDetail(postId),
  });

  const commentsQuery = useQuery({
    ...postCommentsQueryOptions(postId),
  });

  const comments = useMemo(() => parsePostComments(commentsQuery.data), [commentsQuery.data]);

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
          name: user?.name ?? user?.username ?? "나",
          image: user?.image ?? null,
        },
      };
      const prevList = parsePostComments(previous);
      queryClient.setQueryData<PostCommentsResponse>(postCommentsQueryKey(postId), {
        ...(previous ?? {}),
        comments: [optimistic, ...prevList],
        items: [optimistic, ...prevList],
      });
      setDraft("");
      return { previous, tempId: optimistic.id };
    },
    onError: (err, _content, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(postCommentsQueryKey(postId), ctx.previous);
      }
      showIslandError("오류", err instanceof Error ? err.message : "댓글 등록에 실패했습니다.");
    },
    onSuccess: (res, _content, ctx) => {
      queryClient.setQueryData<PostCommentsResponse>(postCommentsQueryKey(postId), (old) => {
        const list = parsePostComments(old).filter(
          (c) => c.id !== ctx?.tempId && c.id !== res.comment.id
        );
        const next = [res.comment, ...list];
        return {
          ...(old ?? {}),
          comments: next,
          items: next,
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-post", postId] });
    },
  });

  const post = postQuery.data?.post;
  const isQnaPost = Boolean(post?.community?.slug);
  const headerTitle = isQnaPost ? "QnA" : "게시물";
  const composerBottomPad =
    keyboardInset > 0 ? spacing.sm : Math.max(spacing.md, insets.bottom);
  const androidKeyboardLift = Platform.OS === "android" ? keyboardInset : 0;

  function submitComment() {
    const content = draft.trim();
    if (!content) return;
    if (!user) {
      showIslandError("로그인 필요", "댓글을 작성하려면 로그인해 주세요.");
      return;
    }
    commentMut.mutate(content);
  }

  return (
    <Screen>
      <AppHeader title={headerTitle} leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {postQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : postQuery.isError || !post ? (
        <Text style={styles.error}>게시물을 불러오지 못했습니다.</Text>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={
              <View>
                <FeedPostCard
                  post={post}
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
                />
                <Text style={styles.section}>{isQnaPost ? "A" : "댓글"}</Text>
              </View>
            }
            ListEmptyComponent={
              commentsQuery.isLoading ? (
                <ActivityIndicator
                  color={colors.terracotta}
                  style={{ marginVertical: spacing.md }}
                />
              ) : (
                <Text style={styles.muted}>아직 댓글이 없습니다.</Text>
              )
            }
            renderItem={({ item }) => {
              const authorSeed: UserProfileSeed = {
                username: item.author.username,
                name: item.author.name,
                image: item.author.image,
              };
              const displayName = item.author.name || item.author.username;
              return (
                <View style={styles.comment}>
                  <Pressable
                    style={styles.commentHeader}
                    onPress={() => openUserProfile(authorSeed)}
                    accessibilityRole="button"
                    accessibilityLabel={`${displayName} 프로필`}
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
                    </View>
                  </Pressable>
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
              placeholder="댓글 작성…"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <FolkButton
              label="등록"
              disabled={!draft.trim()}
              onPress={submitComment}
              style={{ minWidth: 88 }}
            />
          </View>
        </KeyboardAvoidingView>
      )}
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
    commentHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 6,
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
