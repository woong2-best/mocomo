import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import type { FeedMedia } from "@/api/feed";
import { IMAGE_CACHE_POLICY } from "@/perf/image";

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

export function resolveVideoPoster(media: FeedMedia): string | null {
  const direct = media.posterUrl?.trim();
  if (direct) return direct;

  const probe = media.hlsUrl?.trim() || media.url?.trim() || "";
  const uid =
    probe.match(/videodelivery\.net\/([^/?#]+)/i)?.[1] ||
    probe.match(/cloudflarestream\.com\/([^/?#]+)/i)?.[1] ||
    probe.match(/\/([a-f0-9]{32})\//i)?.[1];
  if (uid && /^[a-zA-Z0-9_-]{16,}$/.test(uid)) {
    return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=0s&height=720`;
  }
  return null;
}

export function resolveVideoSrc(media: FeedMedia): string {
  const progressive = media.url?.trim() || "";
  const hls = media.hlsUrl?.trim() || "";
  if (progressive && !progressive.includes(".m3u8")) return progressive;
  return hls || progressive;
}

function formatDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  media: FeedMedia;
  active: boolean;
  videoCount?: number;
  onPress: () => void;
  embedded?: boolean;
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
}: Props) {
  const poster = useMemo(() => resolveVideoPoster(media), [media]);
  const src = useMemo(() => resolveVideoSrc(media), [media]);
  const durationLabel = formatDuration(media.duration);
  const [muted, setMuted] = useFeedPreviewMuted();

  const shouldLoadPlayer = Boolean(src) && active;

  const player = useVideoPlayer(shouldLoadPlayer ? src : null, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    if (!shouldLoadPlayer) return;
    player.muted = muted;
  }, [muted, player, shouldLoadPlayer]);

  useEffect(() => {
    if (!shouldLoadPlayer) return;
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
  }, [player, shouldLoadPlayer]);

  const openImmersive = () => {
    // Stop inline preview immediately so it cannot overlap Reels audio/video.
    try {
      if (shouldLoadPlayer) player.pause();
    } catch {
      // ignore
    }
    onPress();
  };

  const aspect =
    media.width && media.height && media.width > 0 && media.height > 0
      ? media.width / media.height
      : 16 / 10;

  return (
    <View
      style={[
        styles.wrap,
        embedded ? styles.wrapEmbedded : { aspectRatio: Math.min(Math.max(aspect, 0.56), 1.9) },
      ]}
    >
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={poster}
          transition={0}
          pointerEvents="none"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} pointerEvents="none" />
      )}

      {shouldLoadPlayer ? (
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="cover"
          nativeControls={false}
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
        accessibilityLabel="영상 전체화면으로 보기"
      />

      <Pressable
        style={styles.muteBtn}
        hitSlop={8}
        onPress={() => setMuted(!muted)}
        accessibilityRole="button"
        accessibilityLabel={muted ? "소리 켜기" : "음소거"}
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
  fallbackBg: { backgroundColor: "#1a1a1a" },
  openHit: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  playCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
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
