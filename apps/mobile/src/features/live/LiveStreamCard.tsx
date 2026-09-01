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

type Props = {
  item: LiveListItem;
  cardWidth: number;
  onPress: () => void;
  onOverflow?: () => void;
};

/** Horizontal-rail live card: thumb → title → host → tags (followed / category rails). */
function LiveStreamCardInner({ item, cardWidth, onPress, onOverflow }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const thumb = item.thumbnailUrl ?? item.host?.image ?? null;
  const decode = feedMediaDecodeWidth(cardWidth);
  const tags = (item.tags ?? []).slice(0, 2);

  return (
    <Pressable style={[styles.wrap, { width: cardWidth }]} onPress={onPress}>
      <View style={styles.thumbWrap}>
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
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="radio" size={32} color={colors.terracotta} style={{ opacity: 0.45 }} />
          </View>
        )}
        {isLiveAdultItem(item) ? <LiveAdultWatermark /> : null}
        <View style={styles.badge}>
          <LiveViewerBadge viewerCount={item.viewerCount} />
        </View>
      </View>

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
    </Pressable>
  );
}

export const LiveStreamCard = memo(LiveStreamCardInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 7 },
    thumbWrap: {
      aspectRatio: 16 / 9,
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: "rgba(27, 74, 140, 0.12)",
    },
    thumb: { width: "100%", height: "100%" },
    thumbFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    badge: { position: "absolute", top: 8, left: 8 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 19,
    },
    overflowBtn: { paddingTop: 2 },
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
