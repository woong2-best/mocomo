import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import type { ReelItem } from "@/api/reels";
import { togglePostLike } from "@/api/feed";
import { IMAGE_CACHE_POLICY, avatarDecodeSize } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  item: ReelItem;
  active: boolean;
  /** Mount native decoder only when near viewport (memory gate). */
  loadPlayer: boolean;
  height: number;
};

function ReelPlayer({
  src,
  active,
  posterUrl,
}: {
  src: string;
  active: boolean;
  posterUrl: string | null;
}) {
  const player = useVideoPlayer(src, (p) => {
    p.loop = true;
    p.muted = false;
    // Prefer quick start on mid-range devices
    p.timeUpdateEventInterval = 0;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
      // Keep near-neighbor warm but rewind far buffers lightly
      try {
        player.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [active, player]);

  return (
    <>
      {posterUrl && !active ? (
        <Image
          source={{ uri: posterUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          transition={0}
        />
      ) : null}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
    </>
  );
}

function ReelSlideInner({ item, active, loadPlayer, height }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const [liked, setLiked] = useState(!!item.liked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const avatarPx = avatarDecodeSize(44);

  const src = useMemo(() => {
    // Progressive URL first for faster start on mid Android; HLS when only option.
    const progressive = item.media.url?.trim();
    const hls = item.media.hlsUrl?.trim();
    if (progressive && !progressive.includes(".m3u8")) return progressive;
    return hls || progressive || "";
  }, [item.media.hlsUrl, item.media.url]);

  const poster = item.media.posterUrl;

  const onLike = () => {
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void togglePostLike(item.postId)
      .then((res) => {
        setLiked(res.liked);
        setLikeCount(res.likeCount);
      })
      .catch(() => {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      });
  };

  return (
    <View style={[styles.slide, { height }]}>
      {loadPlayer && src ? (
        <ReelPlayer src={src} active={active} posterUrl={poster} />
      ) : poster ? (
        <Image
          source={{ uri: poster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          transition={0}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.posterFallback]} />
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.meta}>
          <Text style={styles.user}>@{item.author.username}</Text>
          {item.content ? (
            <Text style={styles.caption} numberOfLines={3}>
              {item.content}
            </Text>
          ) : null}
        </View>

        <View style={styles.rail}>
          {item.author.image ? (
            <Image
              source={{ uri: item.author.image, width: avatarPx, height: avatarPx }}
              style={styles.avatar}
              cachePolicy={IMAGE_CACHE_POLICY}
              transition={0}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
          <Pressable onPress={onLike} style={styles.railBtn} hitSlop={12}>
            <Text style={styles.railIcon}>{liked ? "♥" : "♡"}</Text>
            <Text style={styles.railCount}>{likeCount}</Text>
          </Pressable>
          <View style={styles.railBtn}>
            <Text style={styles.railIcon}>💬</Text>
            <Text style={styles.railCount}>{item.commentCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function reelEqual(a: Props, b: Props) {
  const { colors } = useTheme();

  return (
    a.item.id === b.item.id &&
    a.active === b.active &&
    a.loadPlayer === b.loadPlayer &&
    a.height === b.height &&
    a.item.liked === b.item.liked &&
    a.item.likeCount === b.item.likeCount
  );
}

export const ReelSlide = memo(ReelSlideInner, reelEqual);

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  slide: {
    width: "100%",
    backgroundColor: "#000",
  },
  posterFallback: { backgroundColor: "#111" },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
    paddingBottom: 96,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  meta: { flex: 1, paddingRight: spacing.md },
  user: { color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  caption: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  rail: { alignItems: "center", gap: 18 },
    avatar: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: "#fff" },
  avatarFallback: { backgroundColor: colors.border },
  railBtn: { alignItems: "center" },
  railIcon: { color: "#fff", fontSize: 28 },
  railCount: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 2 },
});
}

