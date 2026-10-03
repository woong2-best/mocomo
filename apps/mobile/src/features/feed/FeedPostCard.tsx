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
import { FeedPostRepostMenu } from "@/features/feed/FeedPostRepostMenu";
import { useAuth } from "@/auth/AuthContext";
import { Image } from "expo-image";
import { FeedPostMediaCarousel } from "@/features/feed/FeedPostMediaCarousel";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { FeedPostPoll } from "@/features/feed/FeedPostPoll";
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
import { useUserProfileNav, type UserProfileSeed, userProfileQueryKey } from "@/features/profile/user-profile-nav";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  post: FeedPost;
  /** Profile pinned slot — show pin label and accent. */
  pinnedHighlight?: boolean;
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

function formatQuoteDuration(sec: number) {
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FeedPostCardInner({
  post,
  pinnedHighlight = false,
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
  const { t } = useI18n();
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
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [repostMenuAnchor, setRepostMenuAnchor] = useState<MenuAnchor | null>(null);
  const [repostBusy, setRepostBusy] = useState(false);
  const repostAnchorRef = useRef<View>(null);
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
      showIslandError(t("m.common.sign_in_required"), t("m.feed.sign_in_to_use_this_feature"));
      return false;
    }
    return true;
  }, [status, t]);

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

  const openRepostMenu = useCallback(() => {
    if (!requireLogin()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    repostAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setRepostMenuAnchor({ x, y, width, height });
      setRepostMenuOpen(true);
    });
  }, [requireLogin]);

  const onRepostChange = useCallback((nextReposted: boolean, nextCount: number) => {
    setReposted(nextReposted);
    setRepostCount(nextCount);
  }, []);

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

  const onProfilePinChange = useCallback(() => {
    if (user?.username) {
      void queryClient.invalidateQueries({ queryKey: userProfileQueryKey(user.username) });
    }
  }, [queryClient, user?.username]);

  if (!post?.id || !post.author?.id) return null;

  const repostName = post.repostBy
    ? post.repostBy.user.name || post.repostBy.user.username
    : null;

  return (
    <View style={[styles.card, pinnedHighlight && styles.cardPinned]}>
      {pinnedHighlight ? (
        <View style={styles.pinnedLabel}>
          <Ionicons name="pin" size={14} color={colors.textMuted} />
          <Text style={styles.pinnedLabelText}>{t("m.feed.pinned_post")}</Text>
        </View>
      ) : null}
      {post.repostBy && repostName ? (
        <Pressable
          style={styles.repostBanner}
          onPress={() =>
            onPressAuthor?.({
              username: post.repostBy!.user.username,
              name: post.repostBy!.user.name,
              image: post.repostBy!.user.image,
            })
          }
          disabled={!onPressAuthor}
        >
          <Ionicons name="repeat-outline" size={14} color={colors.textMuted} />
          <Text style={styles.repostBannerText} numberOfLines={1}>
            {t("m.feed.reposted_by_repostname", { repostName: String(repostName) })}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.header}>
        <Pressable
          style={styles.headerMain}
          onPress={openPost}
          disabled={!onPressPost}
          accessibilityRole="button"
          accessibilityLabel={t("m.common.view_post")}
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
                accessibilityLabel={t("m.feed.view_profile")}
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
                        ? t("m.feed.anonymous")
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
              accessibilityLabel={t("post.menu.ariaLabel")}
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

      {post.quotedPostBlocked ? (
        <View style={styles.quoteCardOuter}>
          <View style={[styles.quoteCard, styles.quoteBlocked]}>
            <Text style={styles.quoteBlockedText}>
              {t("m.feed.this_post_is_from_a_blocked")}
            </Text>
          </View>
        </View>
      ) : post.quotedPost ? (
        <Pressable
          style={styles.quoteCardOuter}
          onPress={() => onPressPost?.(post.quotedPost!.id)}
          disabled={!onPressPost}
        >
          <View style={styles.quoteCard}>
            <Text style={styles.quoteName} numberOfLines={1}>
              {post.quotedPost.author.name || post.quotedPost.author.username}
              <Text style={styles.quoteHandle}> @{post.quotedPost.author.username}</Text>
            </Text>
            {post.quotedPost.content ? (
              <Text style={styles.quoteBody} numberOfLines={3}>
                {post.quotedPost.content}
              </Text>
            ) : null}
          </View>
          {post.quotedPost.media?.[0]?.url ? (
            <SensitiveContentGate enabled={!!post.quotedPost.isNsfw} style={styles.quoteMediaWrap}>
              <Image
                source={{
                  uri:
                    post.quotedPost.media[0].posterUrl || post.quotedPost.media[0].url,
                }}
                style={styles.quoteMedia}
                contentFit="cover"
              />
              {post.quotedPost.media[0].type === "VIDEO" &&
              post.quotedPost.media[0].duration != null &&
              post.quotedPost.media[0].duration > 0 ? (
                <View style={styles.quoteDuration} pointerEvents="none">
                  <Text style={styles.quoteDurationText}>
                    {formatQuoteDuration(post.quotedPost.media[0].duration)}
                  </Text>
                </View>
              ) : null}
            </SensitiveContentGate>
          ) : null}
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

      {post.poll ? (
        <FeedPostPoll
          postId={post.id}
          poll={post.poll}
          isAuthor={isSelf}
          signedIn={status === "signedIn"}
          onNeedLogin={requireLogin}
        />
      ) : null}

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
          <View ref={repostAnchorRef} collapsable={false}>
            <Pressable onPress={openRepostMenu} hitSlop={10} style={styles.actionBtn}>
              <Ionicons
                name="repeat-outline"
                size={20}
                color={reposted ? colors.cobalt : colors.textMuted}
              />
              <Text style={[styles.actionText, reposted && styles.reposted]}>{repostCount}</Text>
            </Pressable>
          </View>
          )}
          <Pressable onPress={onShare} hitSlop={10} style={styles.actionBtn}>
            <ShareGlobeIcon size={19} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.actionsRight}>
          <View style={styles.viewBtn} accessibilityLabel={t("m.feed.viewcount_views", { viewCount: String(viewCount) })}>
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

      {isQna ? null : (
        <FeedPostRepostMenu
          visible={repostMenuOpen}
          anchor={repostMenuAnchor}
          onClose={() => {
            setRepostMenuOpen(false);
            setRepostMenuAnchor(null);
          }}
          postId={post.id}
          authorUsername={post.author.username}
          title={post.title}
          content={post.content}
          reposted={reposted}
          repostCount={repostCount}
          busy={repostBusy}
          onBusyChange={setRepostBusy}
          onRepostChange={onRepostChange}
          requireLogin={requireLogin}
        />
      )}

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
          featuredOnProfile={!!post.profilePinned}
          ownerPinLabels={isSelf}
          onFeaturedChange={onProfilePinChange}
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
    a.post.poll?.id === b.post.poll?.id &&
    a.post.poll?.totalVotes === b.post.poll?.totalVotes &&
    a.post.poll?.myVoteOptionId === b.post.poll?.myVoteOptionId &&
    a.post.poll?.closed === b.post.poll?.closed &&
    (a.post.media?.length ?? 0) === (b.post.media?.length ?? 0) &&
    a.post.media?.[0]?.posterUrl === b.post.media?.[0]?.posterUrl &&
    a.post.media?.[0]?.url === b.post.media?.[0]?.url &&
    a.post.author.username === b.post.author.username &&
    a.post.author.name === b.post.author.name &&
    a.post.author.image === b.post.author.image &&
    a.post.isAnonymous === b.post.isAnonymous &&
    a.post.repostBy?.id === b.post.repostBy?.id &&
    a.post.quotedPost?.id === b.post.quotedPost?.id &&
    a.paymentsEnabled === b.paymentsEnabled &&
    a.pinnedHighlight === b.pinnedHighlight &&
    a.post.profilePinned === b.post.profilePinned &&
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
    cardPinned: {
      backgroundColor: isDark ? colors.muted : "rgba(197, 82, 42, 0.06)",
      borderLeftWidth: 3,
      borderLeftColor: colors.cobalt,
    },
    pinnedLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    pinnedLabelText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    repostBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
      paddingLeft: 50,
    },
    repostBannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    quoteCardOuter: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 10,
      backgroundColor: colors.muted,
    },
    quoteCard: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 8,
    },
    quoteBlocked: {
      paddingVertical: 14,
    },
    quoteBlockedText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
    },
    quoteMediaWrap: {
      width: "100%",
      aspectRatio: 16 / 10,
      maxHeight: 220,
    },
    quoteMedia: { width: "100%", height: "100%" },
    quoteDuration: {
      position: "absolute",
      left: 8,
      bottom: 8,
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    quoteDurationText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fff",
      fontVariant: ["tabular-nums"],
    },
    quoteName: { fontSize: 13, fontWeight: "700", color: colors.text },
    quoteHandle: { fontSize: 13, fontWeight: "400", color: colors.textMuted },
    quoteBody: { marginTop: 4, fontSize: 14, lineHeight: 19, color: colors.textMuted },
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
