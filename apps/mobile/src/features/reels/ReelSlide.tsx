import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import type { ReelItem } from "@/api/reels";
import { togglePostLike } from "@/api/feed";
import { LockedMediaTile } from "@/components/media/LockedMediaTile";
import { isPaidPlaybackPath } from "@/api/watermark";
import { PaidVideoPlayer } from "@/components/media/PaidVideoPlayer";
import { IMAGE_CACHE_POLICY, avatarDecodeSize } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { LinkifiedText } from "@/ui/LinkifiedText";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { useAuth } from "@/auth/AuthContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  item: ReelItem;
  active: boolean;
  /** Mount native decoder only when near viewport (memory gate). */
  loadPlayer: boolean;
  height: number;
};

function ReelNativePlayer({
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
    p.timeUpdateEventInterval = 0;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
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

function ReelPlayer({
  item,
  src,
  active,
  posterUrl,
}: {
  item: ReelItem;
  src: string;
  active: boolean;
  posterUrl: string | null;
}) {
  const isPaid = isPaidPlaybackPath(src) || (item.media.priceKrw ?? 0) > 0;
  const mediaId = item.media.id?.trim() || null;
  const locked = Boolean(item.media.locked);

  if (locked && item.monetization) {
    return (
      <LockedMediaTile
        media={{
          id: mediaId ?? undefined,
          url: item.media.url,
          type: "VIDEO",
          priceKrw: item.media.priceKrw,
          locked: true,
          lockReason: item.media.lockReason,
          instantPurchasePriceKrw: item.media.instantPurchasePriceKrw,
        }}
        monetization={item.monetization}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  if (isPaid && mediaId) {
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
        <PaidVideoPlayer
          media={{
            id: mediaId,
            url: item.media.url,
            type: "VIDEO",
            priceKrw: item.media.priceKrw,
            locked: item.media.locked,
            lockReason: item.media.lockReason,
            instantPurchasePriceKrw: item.media.instantPurchasePriceKrw,
          }}
          active={active}
          muted={false}
          contentFit="cover"
          monetization={item.monetization}
        />
      </>
    );
  }

  return <ReelNativePlayer src={src} active={active} posterUrl={posterUrl} />;
}

function ReelSlideInner({ item, active, loadPlayer, height }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const { user } = useAuth();

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
      <SensitiveContentGate
        enabled={!!item.isNsfw && user?.id !== item.author.id}
        style={StyleSheet.absoluteFill}
      >
        {loadPlayer && (src || item.media.locked) ? (
          <ReelPlayer item={item} src={src} active={active} posterUrl={poster} />
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
      </SensitiveContentGate>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.meta}>
          <Text style={styles.user}>@{item.author.username}</Text>
          {item.content ? (
            <LinkifiedText
              text={item.content}
              style={styles.caption}
              numberOfLines={3}
              lightLinks
            />
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

