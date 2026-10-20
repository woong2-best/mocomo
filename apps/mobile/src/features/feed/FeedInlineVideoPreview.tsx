import { memo, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { enablePitchPreservingPlayback } from "@/lib/video-preserve-pitch";
import { Ionicons } from "@expo/vector-icons";
import type { FeedMedia } from "@/api/feed";
import { isPaidPlaybackPath } from "@/api/watermark";
import { LockedMediaTile } from "@/components/media/LockedMediaTile";
import type { PaidMediaMonetization } from "@/components/media/paid-media-types";
import { PaidVideoPlayer } from "@/components/media/PaidVideoPlayer";
import { posterToImageSource, useFeedVideoPoster } from "@/lib/video-thumbnail";
import { cachedImageSource, IMAGE_CACHE_POLICY } from "@/perf/image";
import { PerformanceBudgets } from "@/perf/budgets";
import { useI18n } from "@/i18n/I18nProvider";
import {
  isPooledVideoSupported,
  MocomoPooledVideoView,
} from "@/native/MocomoNativeFeed";
import { feedMediaFrameHeight } from "@/features/feed/feedMediaAspect";
import { formatFeedVideoDuration } from "@/features/feed/feedMediaDuration";
import { spacing } from "@/theme/tokens";

/** Feed-wide mute preference (Twitter-style). */
let feedPreviewMuted = true;
const muteListeners = new Set<(muted: boolean) => void>();

function setFeedPreviewMuted(next: boolean) {
  feedPreviewMuted = next;
  for (const fn of muteListeners) fn(next);
}

function useFeedPreviewMuted() {
  const [muted, setMuted] = useState(feedPreviewMuted);
  useEffect(() => {
    const fn = (v: boolean) => setMuted(v);
    muteListeners.add(fn);
    return () => {
      muteListeners.delete(fn);
    };
  }, []);
  return [muted, setFeedPreviewMuted] as const;
}

export { resolveVideoPoster } from "@/lib/video-poster";

export function resolveVideoSrc(media: FeedMedia): string {
  const progressive = media.url?.trim() || "";
  const hls = media.hlsUrl?.trim() || "";
  if (progressive && !progressive.includes(".m3u8")) return progressive;
  return hls || progressive;
}

function posterSource(poster: string | object) {
  return posterToImageSource(poster, (uri) => cachedImageSource(uri)) as
    | { uri: string }
    | object;
}

type Props = {
  media: FeedMedia;
  active: boolean;
  videoCount?: number;
  onPress: () => void;
  embedded?: boolean;
  /** Portrait single tiles use contain so the whole frame stays visible. */
  contentFit?: "contain" | "cover";
  monetization?: PaidMediaMonetization;
  style?: StyleProp<ViewStyle>;
};

/**
 * Twitter-style feed preview: muted inline playback when visible.
 * Native VideoView swallows touches — open hit target is an overlay Pressable
 * (same product intent as web onOpenImmersive → fullscreen viewer).
 */
function FeedInlineVideoPreviewInner({
  media,
  active,
  videoCount = 1,
  onPress,
  embedded = false,
  contentFit = "cover",
  monetization,
  style,
}: Props) {
  const { t } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const poster = useFeedVideoPoster(media);
  const src = useMemo(() => resolveVideoSrc(media), [media]);
  const frameStyle = useMemo(() => {
    if (embedded) return null;
    const layoutWidth = Math.min(windowWidth - spacing.md * 2, PerformanceBudgets.feedMediaLayoutMax);
    return {
      height: feedMediaFrameHeight(layoutWidth, windowHeight, media.width, media.height, media.type),
    };
  }, [embedded, media.height, media.type, media.width, windowHeight, windowWidth]);
  const isPaid =
    isPaidPlaybackPath(src) || isPaidPlaybackPath(media.url) || (media.priceKrw ?? 0) > 0;
  const durationLabel = formatFeedVideoDuration(media.duration);
  const [muted, setMuted] = useFeedPreviewMuted();
  /** Keep poster covering the decoder surface until a real frame paints. */
  const [hasFirstFrame, setHasFirstFrame] = useState(false);

  if (media.locked && monetization) {
    return (
      <View style={[styles.wrap, embedded ? styles.wrapEmbedded : frameStyle, style]}>
        <LockedMediaTile media={media} monetization={monetization} />
      </View>
    );
  }

  // Idle cells stay on the JS poster + play overlay. Native surfaces composite on top
  // of RN siblings and were hiding the thumbnail / play button.
  const usePooledAndroid =
    Platform.OS === "android" &&
    isPooledVideoSupported() &&
    Boolean(src) &&
    active &&
    !isPaid;
  const shouldLoadNativePlayer = Boolean(src) && active && !isPaid && !usePooledAndroid;
  const shouldLoadPaidPlayer = Boolean(media.url) && active && isPaid && !media.locked;

  const player = useVideoPlayer(shouldLoadNativePlayer ? src : null, (p) => {
    enablePitchPreservingPlayback(p);
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    setHasFirstFrame(false);
  }, [src]);

  useEffect(() => {
    if (active) setHasFirstFrame(false);
  }, [active]);

  useEffect(() => {
    if (!shouldLoadNativePlayer) return;
    player.muted = muted;
  }, [muted, player, shouldLoadNativePlayer]);

  useEffect(() => {
    if (!shouldLoadNativePlayer) return;
    try {
      player.play();
    } catch {
      // ignore
    }
    // Pause before unload — otherwise ExoPlayer/AVPlayer can keep audio under the Reels stack.
    return () => {
      try {
        player.pause();
      } catch {
        // ignore
      }
    };
  }, [player, shouldLoadNativePlayer]);

  // iOS / non-pooled: hide poster once playback has advanced past the first paint.
  useEffect(() => {
    if (!shouldLoadNativePlayer || !player) return;
    const sub = player.addListener("timeUpdate", ({ currentTime }: { currentTime: number }) => {
      if (currentTime > 0.02) setHasFirstFrame(true);
    });
    return () => {
      try {
        sub.remove();
      } catch {
        // ignore
      }
    };
  }, [player, shouldLoadNativePlayer]);

  const openImmersive = () => {
    try {
      if (shouldLoadNativePlayer) player.pause();
    } catch {
      // ignore
    }
    onPress();
  };

  return (
    <View style={[styles.wrap, embedded ? styles.wrapEmbedded : frameStyle, style]}>
      {poster ? (
        <Image
          source={posterSource(poster)}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={typeof poster === "string" ? poster : media.id ?? media.url}
          transition={0}
          pointerEvents="none"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} pointerEvents="none" />
      )}

      {shouldLoadPaidPlayer ? (
        <PaidVideoPlayer
          media={media}
          active={active}
          muted={muted}
          contentFit={contentFit}
          monetization={monetization}
        />
      ) : usePooledAndroid ? (
        <MocomoPooledVideoView
          style={StyleSheet.absoluteFill}
          url={src}
          posterUrl={typeof poster === "string" ? poster : null}
          streamUid={media.streamUid}
          playing={active}
          muted={muted}
          onFirstFrame={() => setHasFirstFrame(true)}
        />
      ) : shouldLoadNativePlayer ? (
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit={contentFit}
          nativeControls={false}
          surfaceType="textureView"
          pointerEvents="none"
        />
      ) : null}

      {/* Cover decoder black until first frame — same footprint as poster underneath. */}
      {poster && !hasFirstFrame && active ? (
        <Image
          source={posterSource(poster)}
          style={[StyleSheet.absoluteFill, styles.posterCover]}
          contentFit={contentFit}
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={
            typeof poster === "string" ? `${poster}-cover` : `${media.id ?? media.url}-cover`
          }
          transition={0}
          pointerEvents="none"
        />
      ) : null}

      {!active ? (
        <View style={styles.playCenter} pointerEvents="none">
          <View style={styles.playCircle}>
            <Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      ) : null}

      {durationLabel ? (
        <View style={styles.durationBadge} pointerEvents="none">
          <Text style={styles.badgeText}>{durationLabel}</Text>
        </View>
      ) : null}

      {videoCount > 1 && !embedded ? (
        <View style={styles.countBadge} pointerEvents="none">
          <Text style={styles.badgeText}>{videoCount} videos</Text>
        </View>
      ) : null}

      {/* Full-bleed open target above native video surface */}
      <Pressable
        style={styles.openHit}
        onPress={openImmersive}
        accessibilityRole="button"
        accessibilityLabel={t("m.feed.open_video_full_screen")}
      />

      <Pressable
        style={styles.muteBtn}
        hitSlop={8}
        onPress={() => setMuted(!muted)}
        accessibilityRole="button"
        accessibilityLabel={muted ? t("m.feed.unmute") : t("m.feed.mute")}
      >
        <Ionicons name={muted ? "volume-mute" : "volume-high"} size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

export const FeedInlineVideoPreview = memo(FeedInlineVideoPreviewInner);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
    marginBottom: 10,
  },
  wrapEmbedded: {
    flex: 1,
    height: "100%",
    borderRadius: 0,
    marginBottom: 0,
  },
  fallbackBg: { backgroundColor: "#3a3a3a" },
  posterCover: { zIndex: 1 },
  openHit: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  playCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 3,
  },
  countBadge: {
    position: "absolute",
    right: 44,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 3,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  muteBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
});
