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
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { togglePostLike } from "@/api/feed";
import {
  createPostComment,
  fetchPostDetail,
  togglePostStar,
} from "@/api/social";
import { parsePostComments, postCommentsQueryOptions } from "@/api/post-comments-query";
import { useAuth } from "@/auth/AuthContext";
import { FeedPostMediaCarousel } from "@/features/feed/FeedPostMediaCarousel";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { LinkifiedText } from "@/ui/LinkifiedText";
import { Screen } from "@/ui/Screen";
import { PerformanceBudgets } from "@/perf/budgets";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function PostDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PostDetail">>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const postQuery = useQuery({
    queryKey: ["mobile-post", route.params.id],
    queryFn: () => fetchPostDetail(route.params.id),
  });

  const commentsQuery = useQuery({
    ...postCommentsQueryOptions(route.params.id),
  });

  const comments = useMemo(() => parsePostComments(commentsQuery.data), [commentsQuery.data]);

  const likeMut = useMutation({
    mutationFn: () => togglePostLike(route.params.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-post", route.params.id] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
    },
  });

  const starMut = useMutation({
    mutationFn: () => togglePostStar(route.params.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-post", route.params.id] });
    },
  });

  const commentMut = useMutation({
    mutationFn: () => createPostComment(route.params.id, draft.trim()),
    onSuccess: () => {
      setDraft("");
      void commentsQuery.refetch();
      void postQuery.refetch();
    },
  });

  const post = postQuery.data?.post;
  const mediaLayout = Math.min(
    windowWidth - spacing.md * 2,
    PerformanceBudgets.feedMediaLayoutMax
  );
  const isOwner = user?.id === post?.author.id;

  return (
    <Screen>
      <AppHeader title="게시물" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {postQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : postQuery.isError || !post ? (
        <Text style={styles.error}>게시물을 불러오지 못했습니다.</Text>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 24, gap: 8 }}
            ListHeaderComponent={
              <View style={styles.postCard}>
                <Pressable
                  style={styles.authorRow}
                  onPress={() =>
                    navigation.navigate("UserProfile", { username: post.author.username })
                  }
                >
                  {post.author.image ? (
                    <Image
                      source={{ uri: post.author.image }}
                      style={styles.avatar}
                      cachePolicy={IMAGE_CACHE_POLICY}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]} />
                  )}
                  <View>
                    <Text style={styles.name}>{post.author.name || post.author.username}</Text>
                    <Text style={styles.handle}>@{post.author.username}</Text>
                  </View>
                </Pressable>
                {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
                {post.content ? (
                  <LinkifiedText text={post.content} style={styles.content} />
                ) : null}
                {post.media && post.media.length > 0 ? (
                  <FeedPostMediaCarousel
                    post={post}
                    layoutWidth={mediaLayout}
                    previewActive
                    isOwner={isOwner}
                  />
                ) : null}
                <View style={styles.actions}>
                  <Pressable onPress={() => likeMut.mutate()} hitSlop={8}>
                    <Text style={[styles.action, post.liked && styles.liked]}>
                      {post.liked ? "♥" : "♡"} {post._count?.likes ?? 0}
                    </Text>
                  </Pressable>
                  <Text style={styles.action}>💬 {post._count?.comments ?? 0}</Text>
                  <Pressable onPress={() => starMut.mutate()} hitSlop={8}>
                    <Text style={[styles.action, post.starred && styles.starred]}>
                      {post.starred ? "★ STAR" : "☆ STAR"}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.section}>댓글</Text>
              </View>
            }
            ListEmptyComponent={
              commentsQuery.isLoading ? (
                <ActivityIndicator color={colors.terracotta} />
              ) : (
                <Text style={styles.muted}>아직 댓글이 없습니다.</Text>
              )
            }
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Text style={styles.commentAuthor}>@{item.author.username}</Text>
                <LinkifiedText text={item.content} style={styles.commentBody} />
              </View>
            )}
          />
          <View style={styles.composer}>
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
              loading={commentMut.isPending}
              disabled={!draft.trim()}
              onPress={() => commentMut.mutate()}
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
  postCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.folkSm,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    backgroundColor: colors.muted,
  },
  avatarFallback: { backgroundColor: colors.gold },
  name: { fontWeight: "800", color: colors.cobalt },
  handle: { color: colors.textMuted, fontSize: 13 },
  title: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 6 },
  content: { fontSize: 15, lineHeight: 22, color: colors.text },
  media: {
    marginTop: spacing.sm,
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.muted,
  },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  action: { fontWeight: "700", color: colors.textMuted },
  liked: { color: colors.terracotta },
  starred: { color: colors.gold },
  section: {
    marginTop: spacing.lg,
    fontWeight: "800",
    color: colors.cobalt,
    fontSize: 16,
  },
  comment: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.16)",
    padding: spacing.md,
  },
  commentAuthor: { fontWeight: "800", color: colors.cobalt, marginBottom: 4 },
  commentBody: { color: colors.text, lineHeight: 20 },
  muted: { color: colors.textMuted, fontWeight: "600", paddingVertical: spacing.md },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 2,
    borderTopColor: "rgba(27, 74, 140, 0.18)",
    backgroundColor: colors.surfaceRaised,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.22)",
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.muted,
    color: colors.text,
  },
});
}

