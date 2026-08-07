import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { FeedPost } from "@/api/feed";
import { togglePostLike } from "@/api/feed";
import { FeedImageLightbox } from "@/features/feed/FeedImageLightbox";
import { LazyFeedVideoPreview } from "@/features/feed/LazyFeedVideoPreview";
import {
  firstVisualMedia,
  postHasPlayableVideo,
} from "@/features/feed/feed-video-groups";
import { FolkAvatar } from "@/ui/FolkAvatar";
import {
  IMAGE_CACHE_POLICY,
  feedMediaDecodeWidth,
} from "@/perf/image";
import { PerformanceBudgets } from "@/perf/budgets";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  post: FeedPost;
  /** Visible in viewport — muted autoplay when true (Twitter-style). */
  previewActive?: boolean;
  onLikeCommit?: (postId: string, liked: boolean, likeCount: number) => void;
  onPressPost?: (postId: string) => void;
  onPressAuthor?: (username: string) => void;
  onPressVideo?: (postId: string, mediaId?: string, mediaIndex?: number) => void;
};

function FeedPostCardInner({
  post,
  previewActive = false,
  onLikeCommit,
  onPressPost,
  onPressAuthor,
  onPressVideo,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const mediaLayout = Math.min(windowWidth - spacing.md * 2, PerformanceBudgets.feedMediaLayoutMax);
  const mediaDecode = feedMediaDecodeWidth(mediaLayout);

  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [pending, setPending] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    setLiked(!!post.liked);
    setLikeCount(post._count?.likes ?? 0);
  }, [post.id, post.liked, post._count?.likes]);

  const visual = useMemo(() => firstVisualMedia(post), [post]);
  const isVideo = visual?.type === "VIDEO";
  const hasVideo = postHasPlayableVideo(post);
  const videoCount = useMemo(
    () => (post.media ?? []).filter((m) => m.type === "VIDEO" && m.url).length,
    [post.media]
  );

  const images = useMemo(
    () =>
      (post.media ?? [])
        .filter((m) => m.type === "IMAGE" && !!m.url?.trim())
        .map((m, i) => ({
          id: m.id?.trim() || `${post.id}:img:${i}`,
          url: m.url.trim(),
        })),
    [post.id, post.media]
  );

  const videoMediaIndex = useMemo(() => {
    if (!visual || visual.type !== "VIDEO") return 0;
    const videos = (post.media ?? []).filter((m) => m.type === "VIDEO" && m.url);
    return Math.max(
      0,
      videos.findIndex((m) => m.id === visual.id || m.url === visual.url)
    );
  }, [post.media, visual]);

  const onLike = useCallback(() => {
    if (pending) return;
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
  }, [liked, likeCount, onLikeCommit, pending, post.id]);

  /** Web parity: video → immersive viewer (Reels). */
  const openVideo = useCallback(() => {
    if (hasVideo && onPressVideo) {
      onPressVideo(post.id, visual?.id, isVideo ? videoMediaIndex : 0);
      return;
    }
    onPressPost?.(post.id);
  }, [hasVideo, isVideo, onPressPost, onPressVideo, post.id, videoMediaIndex, visual?.id]);

  /** Web parity: photo → fullscreen lightbox (PostMediaLightbox). */
  const openPhoto = useCallback(() => {
    if (images.length === 0) {
      onPressPost?.(post.id);
      return;
    }
    const start =
      visual?.type === "IMAGE"
        ? Math.max(
            0,
            images.findIndex((img) => img.url === visual.url || img.id === visual.id)
          )
        : 0;
    setLightboxIndex(start === -1 ? 0 : start);
    setLightboxOpen(true);
  }, [images, onPressPost, post.id, visual]);

  const openPost = useCallback(() => {
    onPressPost?.(post.id);
  }, [onPressPost, post.id]);

  const openAuthor = useCallback(() => {
    onPressAuthor?.(post.author.username);
  }, [onPressAuthor, post.author.username]);

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.header}
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

      {post.content ? (
        <Pressable onPress={openPost} disabled={!onPressPost}>
          <Text style={styles.content} numberOfLines={8}>
            {post.content}
          </Text>
        </Pressable>
      ) : post.title ? (
        <Pressable onPress={openPost} disabled={!onPressPost}>
          <Text style={styles.content} numberOfLines={4}>
            {post.title}
          </Text>
        </Pressable>
      ) : null}

      {visual && isVideo ? (
        <LazyFeedVideoPreview
          media={visual}
          active={previewActive}
          videoCount={videoCount}
          onPress={openVideo}
        />
      ) : visual && images.length > 0 ? (
        <View style={[styles.media, { width: mediaLayout }]}>
          <Image
            source={{ uri: visual.url, width: mediaDecode, height: mediaDecode }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={visual.url}
            transition={0}
            pointerEvents="none"
          />
          {/* Native Image can swallow taps — same overlay pattern as video preview */}
          <Pressable
            style={styles.mediaHit}
            onPress={openPhoto}
            accessibilityRole="button"
            accessibilityLabel="사진 크게 보기"
          />
          {images.length > 1 ? (
            <View style={styles.countBadge} pointerEvents="none">
              <Text style={styles.countBadgeText}>{images.length}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onLike} hitSlop={10} style={styles.actionBtn}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={18}
            color={liked ? colors.terracotta : colors.textMuted}
          />
          <Text style={[styles.actionText, liked && styles.liked]}>{likeCount}</Text>
        </Pressable>
        <Pressable onPress={openPost} hitSlop={10} style={styles.actionBtn} disabled={!onPressPost}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} />
          <Text style={styles.actionText}>{post._count?.comments ?? 0}</Text>
        </Pressable>
      </View>

      <FeedImageLightbox
        visible={lightboxOpen}
        images={images}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </View>
  );
}

function propsEqual(a: Props, b: Props) {
  return (
    a.post.id === b.post.id &&
    a.previewActive === b.previewActive &&
    a.post.liked === b.post.liked &&
    a.post._count?.likes === b.post._count?.likes &&
    a.post._count?.comments === b.post._count?.comments &&
    a.post.content === b.post.content &&
    (a.post.media?.length ?? 0) === (b.post.media?.length ?? 0) &&
    a.post.media?.[0]?.posterUrl === b.post.media?.[0]?.posterUrl &&
    a.post.media?.[0]?.url === b.post.media?.[0]?.url &&
    a.onPressPost === b.onPressPost &&
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
      paddingTop: 14,
      paddingBottom: 10,
    },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    headerText: { marginLeft: 10, flex: 1 },
    name: { fontSize: 15, fontWeight: "800", color: colors.text },
    handle: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
    content: { fontSize: 16, lineHeight: 22, color: colors.text, marginBottom: 8 },
    media: {
      borderRadius: radii.md,
      backgroundColor: colors.muted,
      marginBottom: 8,
      aspectRatio: 16 / 10,
      alignSelf: "stretch",
      overflow: "hidden",
    },
    mediaHit: {
      ...StyleSheet.absoluteFill,
      zIndex: 2,
    },
    countBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 3,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    countBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    actions: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 2 },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
    actionText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    liked: { color: colors.terracotta },
  });
}
