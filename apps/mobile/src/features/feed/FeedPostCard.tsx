import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { FeedPost } from "@/api/feed";
import { togglePostLike } from "@/api/feed";
import { runOptimisticStarToggle } from "@/api/star-hub-cache";
import { togglePostRepost } from "@/api/social";
import { useAuth } from "@/auth/AuthContext";
import { FeedPostMediaCarousel } from "@/features/feed/FeedPostMediaCarousel";
import {
  FeedPostOverflowMenu,
  type MenuAnchor,
} from "@/features/feed/FeedPostOverflowMenu";
import type { RootStackParamList } from "@/navigation/types";
import { avatarSquircleRadius, FolkAvatar } from "@/ui/FolkAvatar";
import { TranslatableText } from "@/ui/TranslatableText";
import { ShareGlobeIcon } from "@/ui/ShareGlobeIcon";
import { PerformanceBudgets } from "@/perf/budgets";
import { formatRelativeTimeAgo } from "@/lib/format-relative-time";
import { formatViewCount, recordPostViewOnce } from "@/lib/post-view";
import { useTheme } from "@/theme/ThemeContext";
import { useShowLikeCounts } from "@/hooks/use-display-preferences";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { SupportTierBadge } from "@/ui/SupportTierBadge";
import { profileDisplayTier } from "@/lib/support-tier-display";
import { useUserProfileNav, type UserProfileSeed } from "@/features/profile/user-profile-nav";

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
  onPressAuthor?: (author: UserProfileSeed) => void;
  onPressCommunity?: (slug: string) => void;
  onPressVideo?: (postId: string, mediaId?: string, mediaIndex?: number) => void;
  onBlockedAuthor?: (authorId: string) => void;
  onDeletedPost?: (postId: string) => void;
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
  onPressCommunity,
  onPressVideo,
  onBlockedAuthor,
  onDeletedPost,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const { prefetch: prefetchAuthorProfile } = useUserProfileNav();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { width: windowWidth } = useWindowDimensions();
  const { status, user } = useAuth();
  const starLock = useRef(false);
  const postIdRef = useRef(post.id);
  postIdRef.current = post.id;
  const showLikeCounts = useShowLikeCounts();
  const mediaLayout = Math.min(windowWidth - spacing.md * 2, PerformanceBudgets.feedMediaLayoutMax);

  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [starred, setStarred] = useState(!!post.starred);
  const [reposted, setReposted] = useState(!!post.reposted);
  const [repostCount, setRepostCount] = useState(post._count?.reposts ?? 0);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const menuAnchorRef = useRef<View>(null);
  const [viewCount, setViewCount] = useState(post.viewCount ?? 0);

  const isQna = Boolean(post.community?.slug);
  const hideIdentity = isQna || post.isAnonymous || post.author?.username === "anonymous";
  const isSelf = user?.id === post.author?.id;
  const canShowMenu = status === "signedIn" && (isSelf || !hideIdentity || isQna);

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
    starLock.current = false;
  }, [post.id]);

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
      showIslandError("로그인 필요", "이 기능을 사용하려면 로그인해 주세요.");
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
    if (starLock.current || !requireLogin()) return;
    const postId = post.id;
    const prev = starred;
    const next = !prev;
    starLock.current = true;
    setStarred(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void runOptimisticStarToggle(queryClient, { ...post, starred: next }, next)
      .then((res) => {
        if (postIdRef.current === postId) setStarred(res.starred);
      })
      .catch(() => {
        if (postIdRef.current === postId) setStarred(prev);
      })
      .finally(() => {
        starLock.current = false;
      });
  }, [post, queryClient, requireLogin, starred]);

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

  const authorSeed = useMemo<UserProfileSeed>(
    () => ({
      username: post.author?.username ?? "",
      name: post.author?.name,
      image: post.author?.image,
    }),
    [post.author?.image, post.author?.name, post.author?.username]
  );

  const prefetchAuthor = useCallback(() => {
    if (hideIdentity) return;
    prefetchAuthorProfile(authorSeed);
  }, [authorSeed, hideIdentity, prefetchAuthorProfile]);

  const openAuthor = useCallback(() => {
    if (hideIdentity) return;
    onPressAuthor?.(authorSeed);
  }, [authorSeed, hideIdentity, onPressAuthor]);

  const openMenu = useCallback(() => {
    menuAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setMenuOpen(true);
    });
  }, []);

  const handleDeleted = useCallback(() => {
    onDeletedPost?.(post.id);
    void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
    void queryClient.invalidateQueries({ queryKey: ["mobile-post", post.id] });
    if (user?.username) {
      void queryClient.invalidateQueries({ queryKey: ["mobile-user", user.username] });
    }
    if (route.name === "PostDetail" && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, onDeletedPost, post.id, queryClient, route.name, user?.username]);

  if (!post?.id || !post.author?.id) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerMain}
          onPress={openPost}
          disabled={!onPressPost}
          accessibilityRole="button"
          accessibilityLabel="게시물 보기"
        >
          <View style={styles.headerRow} pointerEvents="box-none">
            {isQna ? (
              <View
                style={styles.qnaMarkWrap}
                accessibilityLabel="QnA question"
              >
                <View style={styles.qnaMark}>
                  <Text style={styles.qnaMarkText}>Q</Text>
                </View>
              </View>
            ) : (
              <Pressable
                onPressIn={prefetchAuthor}
                onPress={openAuthor}
                disabled={!onPressAuthor || hideIdentity}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="프로필 보기"
              >
                <FolkAvatar
                  uri={post.author.image}
                  name={post.author.name || post.author.username}
                  size={40}
                />
              </Pressable>
            )}
            <View style={styles.headerText}>
              {!isQna ? (
                <Pressable
                  onPressIn={prefetchAuthor}
                  onPress={openAuthor}
                  disabled={!onPressAuthor || hideIdentity}
                  accessibilityRole="button"
                >
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {hideIdentity
                        ? "익명"
                        : post.author.name || post.author.username}
                    </Text>
                    {!hideIdentity ? (
                      <SupportTierBadge
                        tier={profileDisplayTier(
                          post.author.supportTierSent,
                          post.author.earnedMocoTier
                        )}
                      />
                    ) : null}
                  </View>
                </Pressable>
              ) : null}
              {hideIdentity ? (
                <Text style={styles.handle} numberOfLines={1}>
                  {post.createdAt ? (
                    <Text style={styles.handleMeta}>{formatRelativeTimeAgo(post.createdAt)}</Text>
                  ) : null}
                </Text>
              ) : (
                <Pressable
                  onPressIn={prefetchAuthor}
                  onPress={openAuthor}
                  disabled={!onPressAuthor}
                  accessibilityRole="button"
                >
                  <Text style={styles.handle} numberOfLines={1}>
                    @{post.author.username}
                    {post.createdAt ? (
                      <Text style={styles.handleMeta}>
                        {"  "}
                        {formatRelativeTimeAgo(post.createdAt)}
                      </Text>
                    ) : null}
                  </Text>
                </Pressable>
              )}
              {post.community?.slug ? (
                <Pressable
                  onPress={() => onPressCommunity?.(post.community!.slug)}
                  disabled={!onPressCommunity}
                  hitSlop={6}
                >
                  <Text style={styles.communityChip} numberOfLines={1}>
                    {post.community.name}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Pressable>
        {canShowMenu ? (
          <View ref={menuAnchorRef} collapsable={false}>
            <Pressable
              onPress={openMenu}
              hitSlop={10}
              style={styles.menuBtn}
              accessibilityRole="button"
              accessibilityLabel="게시물 메뉴"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {post.content ? (
        <TranslatableText
          text={post.content}
          style={styles.content}
          numberOfLines={8}
          onBackgroundPress={onPressPost ? openPost : undefined}
          translateActive={viewTrackActive}
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
        onPressVideo={isQna ? undefined : onPressVideo}
      />

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          {isQna ? null : (
          <Pressable onPress={onLike} hitSlop={10} style={styles.actionBtn}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? colors.terracotta : colors.textMuted}
            />
            {showLikeCounts ? (
              <Text style={[styles.actionText, liked && styles.liked]}>{likeCount}</Text>
            ) : null}
          </Pressable>
          )}
          <Pressable onPress={openPost} hitSlop={10} style={styles.actionBtn} disabled={!onPressPost}>
            <Ionicons name="chatbox-outline" size={19} color={colors.textMuted} />
            <Text style={styles.actionText}>{post._count?.comments ?? 0}</Text>
          </Pressable>
          {isQna ? null : (
          <Pressable onPress={onRepost} hitSlop={10} style={styles.actionBtn}>
            <Ionicons
              name="repeat-outline"
              size={20}
              color={reposted ? colors.cobalt : colors.textMuted}
            />
            <Text style={[styles.actionText, reposted && styles.reposted]}>{repostCount}</Text>
          </Pressable>
          )}
          <Pressable onPress={onShare} hitSlop={10} style={styles.actionBtn}>
            <ShareGlobeIcon size={19} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.actionsRight}>
          <View style={styles.viewBtn} accessibilityLabel={`조회수 ${viewCount}회`}>
            <Ionicons name="eye-outline" size={17} color={colors.textMuted} />
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
          anchor={menuAnchor}
          onClose={() => {
            setMenuOpen(false);
            setMenuAnchor(null);
          }}
          postId={post.id}
          authorId={post.author.id}
          authorUsername={post.author.username}
          isOwner={isSelf}
          hideProfilePin={hideIdentity && isSelf}
          onBlocked={() => onBlockedAuthor?.(post.author.id)}
          onDeleted={handleDeleted}
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
    a.post.author.username === b.post.author.username &&
    a.post.author.name === b.post.author.name &&
    a.post.author.image === b.post.author.image &&
    a.post.isAnonymous === b.post.isAnonymous &&
    a.paymentsEnabled === b.paymentsEnabled &&
    a.onPressAuthor === b.onPressAuthor &&
    a.onPressCommunity === b.onPressCommunity &&
    a.onPressVideo === b.onPressVideo
  );
}

export const FeedPostCard = memo(FeedPostCardInner, propsEqual);

function createStyles(colors: ThemeColors, isDark: boolean) {
  const avatarRing = isDark ? "rgba(107, 163, 232, 0.45)" : "rgba(168, 180, 200, 0.95)";
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
    headerMain: { flex: 1, alignSelf: "stretch", justifyContent: "center" },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      width: "100%",
    },
    headerText: { marginLeft: 10, flex: 1, minWidth: 0 },
    qnaMarkWrap: {
      padding: 2,
      borderRadius: avatarSquircleRadius(40) + 2,
      borderWidth: 2,
      borderColor: avatarRing,
      backgroundColor: colors.background,
    },
    qnaMark: {
      width: 40,
      height: 40,
      borderRadius: avatarSquircleRadius(40),
      backgroundColor: colors.cobalt,
      alignItems: "center",
      justifyContent: "center",
    },
    qnaMarkText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 17,
    },
    menuBtn: { padding: 4, marginLeft: 4 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
    name: { fontSize: 15, fontWeight: "800", color: colors.text, flexShrink: 1 },
    handle: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
    handleMeta: { fontSize: 13, color: colors.textMuted, fontWeight: "400" },
    communityChip: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: "700",
      color: colors.brand,
    },
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
    viewText: { fontSize: 13, color: colors.textMuted, fontWeight: "600", fontVariant: ["tabular-nums"] },
    starBtn: { paddingLeft: 2 },
    actionText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    liked: { color: colors.terracotta },
    reposted: { color: colors.cobalt },
  });
}
