import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { LiveListItem } from "@/api/live";
import { liveCategoryLabel } from "@/features/live/live-categories";
import { LiveViewerBadge } from "@/features/live/LiveViewerBadge";
import { LiveAdultWatermark, isLiveAdultItem } from "@/features/live/LiveAdultWatermark";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

const DEFAULT_THUMB_W = 152;

type Props = {
  item: LiveListItem;
  onPress: () => void;
  onOverflow?: () => void;
  thumbWidth?: number;
};

/** Ranked row (조회수 순): wide thumb left, title · host · tags right. */
function LiveStreamListRowInner({
  item,
  onPress,
  onOverflow,
  thumbWidth = DEFAULT_THUMB_W,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const thumb = item.thumbnailUrl ?? item.host?.image ?? null;
  const decode = feedMediaDecodeWidth(thumbWidth);
  const tags = (item.tags ?? []).slice(0, 2);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.thumbWrap, { width: thumbWidth }]}>
        {thumb ? (
          <Image
            source={{
              uri: thumb,
              width: decode,
              height: Math.round(decode * (9 / 16)),
            }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={thumb}
            transition={0}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="radio" size={24} color={colors.terracotta} style={{ opacity: 0.4 }} />
          </View>
        )}
        {isLiveAdultItem(item) ? <LiveAdultWatermark /> : null}
        <View style={styles.badge}>
          <LiveViewerBadge viewerCount={item.viewerCount} showLive={false} size="sm" />
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {onOverflow ? (
            <Pressable onPress={onOverflow} hitSlop={8} style={styles.overflowBtn}>
              <Ionicons name="ellipsis-vertical" size={15} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.hostRow}>
          <FolkAvatar
            uri={item.host?.image}
            name={item.host?.username ?? "?"}
            size={18}
            framed={false}
          />
          <Text style={styles.host} numberOfLines={1}>
            @{item.host?.username ?? "host"}
          </Text>
          {item.host?.isPartner ? (
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
          ) : null}
        </View>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{liveCategoryLabel(item.category)}</Text>
          </View>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

export const LiveStreamListRow = memo(LiveStreamListRowInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 10,
      paddingVertical: 7,
    },
    thumbWrap: {
      aspectRatio: 16 / 9,
      borderRadius: radii.sm,
      overflow: "hidden",
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    thumb: { width: "100%", height: "100%" },
    thumbFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    badge: { position: "absolute", top: 6, left: 6 },
    meta: { flex: 1, minWidth: 0, gap: 5 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 19,
    },
    overflowBtn: { paddingTop: 1 },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    host: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: colors.textMuted },
    tags: { flexDirection: "row", flexWrap: "nowrap", gap: 4, overflow: "hidden" },
    tag: {
      backgroundColor: colors.muted,
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagText: { fontSize: 10, fontWeight: "600", color: colors.textMuted },
  });
}
