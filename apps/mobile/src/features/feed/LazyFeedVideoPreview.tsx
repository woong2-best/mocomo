import { memo, useEffect, useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { FeedMedia } from "@/api/feed";
import { posterToImageSource, resolveCachedVideoPoster } from "@/lib/video-thumbnail";
import { cachedImageSource, IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { PerformanceBudgets } from "@/perf/budgets";
import { formatFeedVideoDuration } from "@/features/feed/feedMediaDuration";
import { spacing } from "@/theme/tokens";

type Props = {
  media: FeedMedia;
  active: boolean;
  videoCount?: number;
  onPress: () => void;
  /** Inside a sized parent cell — fill it, no outer margin. */
  embedded?: boolean;
  /** Portrait single tiles use contain so the whole frame stays visible. */
  contentFit?: "contain" | "cover";
  monetization?: import("@/components/media/paid-media-types").PaidMediaMonetization;
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

/**
 * Keeps expo-video out of the Home JS graph until a video cell actually mounts.
 */
function LazyFeedVideoPreviewInner(props: Props) {
  const [Preview, setPreview] = useState<PreviewComponent | null>(() => cachedPreview);
  const { width: windowWidth } = useWindowDimensions();
  const mediaLayout = Math.min(windowWidth - spacing.md * 2, PerformanceBudgets.feedMediaLayoutMax);
  const decode = feedMediaDecodeWidth(mediaLayout);
  const poster = resolveCachedVideoPoster(props.media);
  const durationLabel = formatFeedVideoDuration(props.media.duration);

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
    <Pressable
      onPress={props.onPress}
      style={props.embedded ? styles.wrapEmbedded : [styles.wrap, { width: mediaLayout }]}
    >
      {poster ? (
        <Image
          source={posterToImageSource(poster, (uri) => cachedImageSource(uri, decode)) as object}
          style={StyleSheet.absoluteFill}
          contentFit={props.contentFit ?? "cover"}
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={typeof poster === "string" ? poster : props.media.id ?? props.media.url}
          transition={0}
          pointerEvents="none"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} pointerEvents="none" />
      )}
      <View style={styles.play} pointerEvents="none">
        <View style={styles.playCircle}>
          <Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
      {durationLabel ? (
        <View style={styles.durationBadge} pointerEvents="none">
          <Text style={styles.badgeText}>{durationLabel}</Text>
        </View>
      ) : null}
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
    backgroundColor: "#3a3a3a",
    marginBottom: 8,
    aspectRatio: 16 / 10,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  wrapEmbedded: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 0,
    backgroundColor: "#3a3a3a",
    overflow: "hidden",
  },
  fallback: { backgroundColor: "#3a3a3a" },
  play: {
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
