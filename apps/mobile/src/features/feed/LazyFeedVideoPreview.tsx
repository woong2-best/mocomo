import { memo, useEffect, useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { FeedMedia } from "@/api/feed";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { PerformanceBudgets } from "@/perf/budgets";
import { spacing } from "@/theme/tokens";

type Props = {
  media: FeedMedia;
  active: boolean;
  videoCount?: number;
  onPress: () => void;
  /** Inside horizontal carousel — fill parent cell, no outer margin. */
  embedded?: boolean;
};

type PreviewComponent = ComponentType<Props>;

let cachedPreview: PreviewComponent | null = null;
let loadingPreview: Promise<PreviewComponent> | null = null;

function loadPreview(): Promise<PreviewComponent> {
  if (cachedPreview) return Promise.resolve(cachedPreview);
  if (!loadingPreview) {
    loadingPreview = import("@/features/feed/FeedInlineVideoPreview").then((m) => {
      cachedPreview = m.FeedInlineVideoPreview;
      return cachedPreview;
    });
  }
  return loadingPreview;
}

function posterUri(media: FeedMedia): string | null {
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

/**
 * Keeps expo-video out of the Home JS graph until a video cell actually mounts.
 */
function LazyFeedVideoPreviewInner(props: Props) {
  const [Preview, setPreview] = useState<PreviewComponent | null>(() => cachedPreview);
  const { width: windowWidth } = useWindowDimensions();
  const mediaLayout = Math.min(windowWidth - spacing.md * 2, PerformanceBudgets.feedMediaLayoutMax);
  const decode = feedMediaDecodeWidth(mediaLayout);
  const poster = posterUri(props.media);

  useEffect(() => {
    if (Preview) return;
    let alive = true;
    void loadPreview().then((Comp) => {
      if (alive) setPreview(() => Comp);
    });
    return () => {
      alive = false;
    };
  }, [Preview]);

  // Warm the module as soon as a video row appears (even if not active yet)
  useEffect(() => {
    void loadPreview();
  }, []);

  if (Preview) {
    return <Preview {...props} />;
  }

  return (
    <Pressable onPress={props.onPress} style={[styles.wrap, { width: mediaLayout }]}>
      {poster ? (
        <Image
          source={{ uri: poster, width: decode, height: decode }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={poster}
          transition={0}
          pointerEvents="none"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} pointerEvents="none" />
      )}
      <View style={styles.play} pointerEvents="none">
        <Ionicons name="play" size={22} color="#fff" />
      </View>
      {(props.videoCount ?? 1) > 1 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{props.videoCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export const LazyFeedVideoPreview = memo(LazyFeedVideoPreviewInner);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    marginBottom: 8,
    aspectRatio: 16 / 10,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  fallback: { backgroundColor: "#222" },
  play: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
