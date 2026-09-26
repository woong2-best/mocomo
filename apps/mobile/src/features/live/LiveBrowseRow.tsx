import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { LiveListItem } from "@/api/live";
import { formatViewerCount, formatViewerCountCompact } from "@/features/live/live-categories";
import { LiveAdultWatermark, isLiveAdultItem } from "@/features/live/LiveAdultWatermark";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";

type RowProps = {
  item: LiveListItem;
  onPress: () => void;
};

function LiveBrowseRowInner({ item, onPress }: RowProps) {
  const { width } = useWindowDimensions();
  const thumbW = Math.round(Math.min(width * 0.42, 188));
  const decode = feedMediaDecodeWidth(thumbW);
  const thumb = item.thumbnailUrl ?? item.host?.image ?? null;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.thumbWrap, { width: thumbW }]}>
        {thumb ? (
          <Image
            source={{ uri: thumb, width: decode, height: Math.round(decode * (9 / 16)) }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={thumb}
            transition={0}
          />
        ) : (
          <View style={[styles.thumb, styles.fallback]}>
            <Ionicons name="radio" size={22} color="rgba(255,255,255,0.45)" />
          </View>
        )}
        {isLiveAdultItem(item) ? <LiveAdultWatermark /> : null}
        <View style={styles.duration}>
          <Text style={styles.durationText}>{formatViewerCountCompact(item.viewerCount)}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.host} numberOfLines={1}>
          {item.host?.username ?? "live"}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {formatViewerCount(item.viewerCount)}
        </Text>
      </View>
    </Pressable>
  );
}

export const LiveBrowseRow = memo(LiveBrowseRowInner);

type HeroProps = {
  item: LiveListItem;
  onPress: () => void;
};

function LiveBrowseHeroInner({ item, onPress }: HeroProps) {
  const { width } = useWindowDimensions();
  const decode = feedMediaDecodeWidth(width);
  const thumb = item.thumbnailUrl ?? item.host?.image ?? null;
  const height = Math.round(width * (9 / 16));

  const source = useMemo(
    () => (thumb ? { uri: thumb, width: decode, height } : null),
    [decode, height, thumb]
  );

  return (
    <Pressable style={{ width, height, backgroundColor: "#000" }} onPress={onPress}>
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={thumb ?? item.id}
          transition={0}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
        style={styles.heroScrim}
        pointerEvents="none"
      />
      {isLiveAdultItem(item) ? <LiveAdultWatermark /> : null}
    </Pressable>
  );
}

export const LiveBrowseHero = memo(LiveBrowseHeroInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#000",
  },
  thumbWrap: {
    aspectRatio: 16 / 9,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  thumb: { width: "100%", height: "100%" },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141414",
    paddingHorizontal: 16,
  },
  duration: {
    position: "absolute",
    right: 4,
    bottom: 4,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  meta: { flex: 1, minWidth: 0, paddingTop: 1, gap: 3 },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  host: {
    color: "#B5B5B5",
    fontSize: 12,
    fontWeight: "600",
  },
  sub: {
    color: "#8E8E8E",
    fontSize: 12,
    fontWeight: "500",
  },
  heroScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
});
