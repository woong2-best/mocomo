import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { FeedPost } from "@/api/feed";
import { togglePostLike } from "@/api/feed";
import { togglePostRepost, togglePostStar } from "@/api/social";
import { useAuth } from "@/auth/AuthContext";
import { FeedPostMediaCarousel } from "@/features/feed/FeedPostMediaCarousel";
import { FeedPostOverflowMenu } from "@/features/feed/FeedPostOverflowMenu";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { LinkifiedText } from "@/ui/LinkifiedText";
import { ShareGlobeIcon } from "@/ui/ShareGlobeIcon";
import { PerformanceBudgets } from "@/perf/budgets";
import { formatViewCount, recordPostViewOnce } from "@/lib/post-view";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  post: FeedPost;
  /** Visible in viewport — muted autoplay when true (Twitter-style). */
  previewActive?: boolean;
  /** Feed card scrolled into view — record view once per app session. */
  viewTrackActive?: boolean;
  paymentsEnabled?: boolean;
  onPurchaseSuccess?: () => void;
  onLikeCommit?: (postId: string, liked: boolean, likeCount: number) => void;
  onPressPost?: (postId: string) => void;
  onPressAuthor?: (username: string) => void;
  onPressVideo?: (postId: string, mediaId?: string, mediaIndex?: number) => void;
  onBlockedAuthor?: (authorId: string) => void;
};

function formatCount(n: number) {
  return formatViewCount(n);
}

function FeedPostCardInner({
  post,
  previewActive = false,
  viewTrackActive = false,
  paymentsEnabled = false,
  onPurchaseSuccess,
  onLikeCommit,
  onPressPost,
  onPressAuthor,
  onPressVideo,
  onBlockedAuthor,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const { status, user } = useAuth();
  const mediaLayout = Math.min(windowWidth - spacing.md * 2, PerformanceBudgets.feedMediaLayoutMax);

  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [starred, setStarred] = useState(!!post.starred);
  const [reposted, setReposted] = useState(!!post.reposted);
  const [repostCount, setRepostCount] = useState(post._count?.reposts ?? 0);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewCount, setViewCount] = useState(post.viewCount ?? 0);

  const isSelf = user?.id === post.author.id;
  const canShowMenu = status === "signedIn" && !isSelf;

  useEffect(() => {
    setViewCount(post.viewCount ?? 0);
  }, [post.id, post.viewCount]);

  useEffect(() => {
    if (!viewTrackActive) return;
    void recordPostViewOnce(post.id).then((next) => {
      if (next != null) setViewCount(next);
    });
  }, [viewTrackActive, post.id]);

  useEffect(() => {
    setLiked(!!post.liked);
    setLikeCount(post._count?.likes ?? 0);
    setStarred(!!post.starred);
    setReposted(!!post.reposted);
    setRepostCount(post._count?.reposts ?? 0);
  }, [
    post.id,
    post.liked,
    post.starred,
    post.reposted,
    post._count?.likes,
    post._count?.reposts,
  ]);

  const requireLogin = useCallback(() => {
    if (status !== "signedIn") {
      Alert.alert("로그인 필요", "이 기능을 사용하려면 로그인해 주세요.");
      return false;
    }
    return true;
  }, [status]);

  const onLike = useCallback(() => {
    if (pending || !requireLogin()) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setLikeCount(nextCount);
    setPending(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    void (async () => {
      try {
        const res = await togglePostLike(post.id);
        setLiked(res.liked);
        setLikeCount(res.likeCount);
        onLikeCommit?.(post.id, res.liked, res.likeCount);
      } catch {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      } finally {
        setPending(false);
      }
    })();
  }, [liked, likeCount, onLikeCommit, pending, post.id, requireLogin]);

  const onStar = useCallback(() => {
    if (!requireLogin()) return;
    const prev = starred;
    setStarred(!prev);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void togglePostStar(post.id)
      .then((res) => setStarred(res.starred))
      .catch(() => setStarred(prev));
  }, [post.id, requireLogin, starred]);

  const onRepost = useCallback(() => {
    if (!requireLogin()) return;
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!prevReposted);
    setRepostCount(Math.max(0, prevCount + (prevReposted ? -1 : 1)));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void togglePostRepost(post.id)
      .then((res) => {
        setReposted(res.reposted);
        setRepostCount(res.repostCount);
      })
      .catch(() => {
        setReposted(prevReposted);
        setRepostCount(prevCount);
      });
  }, [post.id, repostCount, reposted, requireLogin]);

  const onShare = useCallback(() => {
    void Share.share({
      message: `https://mocomo.net/post/${post.id}`,
      url: `https://mocomo.net/post/${post.id}`,
    });
  }, [post.id]);

  const openPost = useCallback(() => {
    onPressPost?.(post.id);
  }, [onPressPost, post.id]);

  const openAuthor = useCallback(() => {
    onPressAuthor?.(post.author.username);
  }, [onPressAuthor, post.author.username]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerMain}
          onPress={openAuthor}
          disabled={!onPressAuthor}
          accessibilityRole="button"
        >
          <FolkAvatar
            uri={post.author.image}
            name={post.author.name || post.author.username}
            size={40}
          />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {post.author.name || post.author.username}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>
              @{post.author.username}
            </Text>
          </View>
        </Pressable>
        {canShowMenu ? (
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={10}
            style={styles.menuBtn}
            accessibilityRole="button"
            accessibilityLabel="게시물 메뉴"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {post.content ? (
        <LinkifiedText
          text={post.content}
          style={styles.content}
          numberOfLines={8}
          onBackgroundPress={onPressPost ? openPost : undefined}
        />
      ) : post.title ? (
        <Pressable onPress={openPost} disabled={!onPressPost}>
          <Text style={styles.content} numberOfLines={4}>
            {post.title}
          </Text>
        </Pressable>
      ) : null}

      <FeedPostMediaCarousel
        post={post}
        layoutWidth={mediaLayout}
        previewActive={previewActive}
        isOwner={isSelf}
        paymentsEnabled={paymentsEnabled}
        onPurchaseSuccess={onPurchaseSuccess}
        onPressVideo={onPressVideo}
      />

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <Pressable onPress={onLike} hitSlop={10} style={styles.actionBtn}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? colors.terracotta : colors.textMuted}
            />
            <Text style={[styles.actionText, liked && styles.liked]}>{likeCount}</Text>
          </Pressable>
          <Pressable onPress={openPost} hitSlop={10} style={styles.actionBtn} disabled={!onPressPost}>
            <Ionicons name="chatbox-outline" size={19} color={colors.textMuted} />
            <Text style={styles.actionText}>{post._count?.comments ?? 0}</Text>
          </Pressable>
          <Pressable onPress={onRepost} hitSlop={10} style={styles.actionBtn}>
            <Ionicons
              name="repeat-outline"
              size={20}
              color={reposted ? colors.cobalt : colors.textMuted}
            />
            <Text style={[styles.actionText, reposted && styles.reposted]}>{repostCount}</Text>
          </Pressable>
          <Pressable onPress={onShare} hitSlop={10} style={styles.actionBtn}>
            <ShareGlobeIcon size={19} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.actionsRight}>
          <View style={styles.viewBtn} accessibilityLabel={`조회수 ${viewCount}회`}>
            <Ionicons name="eye-outline" size={17} color={colors.cobalt} />
            <Text style={styles.viewText}>{formatCount(viewCount)}</Text>
          </View>
          <Pressable onPress={onStar} hitSlop={10} style={styles.starBtn}>
            <Ionicons
              name={starred ? "star" : "star-outline"}
              size={20}
              color={starred ? colors.gold : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {canShowMenu ? (
        <FeedPostOverflowMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          postId={post.id}
          authorId={post.author.id}
          authorUsername={post.author.username}
          onBlocked={() => onBlockedAuthor?.(post.author.id)}
        />
      ) : null}
    </View>
  );
}

function propsEqual(a: Props, b: Props) {
  return (
    a.post.id === b.post.id &&
    a.previewActive === b.previewActive &&
    a.viewTrackActive === b.viewTrackActive &&
    a.post.liked === b.post.liked &&
    a.post.starred === b.post.starred &&
    a.post.reposted === b.post.reposted &&
    a.post.viewCount === b.post.viewCount &&
    a.post._count?.likes === b.post._count?.likes &&
    a.post._count?.comments === b.post._count?.comments &&
    a.post._count?.reposts === b.post._count?.reposts &&
    a.post.content === b.post.content &&
    (a.post.media?.length ?? 0) === (b.post.media?.length ?? 0) &&
    a.post.media?.[0]?.posterUrl === b.post.media?.[0]?.posterUrl &&
    a.post.media?.[0]?.url === b.post.media?.[0]?.url &&
    a.paymentsEnabled === b.paymentsEnabled &&
    a.onPressAuthor === b.onPressAuthor &&
    a.onPressVideo === b.onPressVideo
  );
}

export const FeedPostCard = memo(FeedPostCardInner, propsEqual);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      paddingHorizontal: spacing.md,
      paddingTop: 12,
      paddingBottom: 12,
    },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    headerMain: { flexDirection: "row", alignItems: "center", flex: 1 },
    headerText: { marginLeft: 10, flex: 1 },
    menuBtn: { padding: 4, marginLeft: 4 },
    name: { fontSize: 15, fontWeight: "800", color: colors.text },
    handle: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
    content: { fontSize: 15, lineHeight: 21, color: colors.text, marginBottom: 10 },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    actionsLeft: { flexDirection: "row", alignItems: "center", gap: 18 },
    actionsRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
    viewBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    viewText: { fontSize: 13, color: colors.cobalt, fontWeight: "700", fontVariant: ["tabular-nums"] },
    starBtn: { paddingLeft: 2 },
    actionText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    liked: { color: colors.terracotta },
    reposted: { color: colors.cobalt },
  });
}
