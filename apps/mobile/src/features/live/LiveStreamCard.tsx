import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { LiveListItem } from "@/api/live";
import { liveCategoryLabel } from "@/features/live/live-categories";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  item: LiveListItem;
  cardWidth: number;
  onPress: () => void;
};

function LiveStreamCardInner({ item, cardWidth, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const thumb = item.thumbnailUrl ?? item.host.image;
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
            <Ionicons name="radio" size={36} color={colors.terracotta} style={{ opacity: 0.45 }} />
          </View>
        )}
        <View style={styles.scrim} pointerEvents="none" />
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerChip}>
          <Ionicons name="eye" size={11} color="#fff" />
          <Text style={styles.viewerText}>{item.viewerCount}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <FolkAvatar uri={item.host.image} name={item.host.username} size={36} />
        <View style={styles.metaText}>
          <Text style={styles.host} numberOfLines={1}>
            @{item.host.username}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
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
      </View>
    </Pressable>
  );
}

export const LiveStreamCard = memo(LiveStreamCardInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    thumbWrap: {
      aspectRatio: 16 / 9,
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: "rgba(27, 74, 140, 0.12)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    thumb: { width: "100%", height: "100%" },
    thumbFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.08)",
    },
    liveBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#059669",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#fff",
    },
    liveText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
    viewerChip: {
      position: "absolute",
      bottom: 10,
      left: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.65)",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    viewerText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    meta: { flexDirection: "row", gap: 10, marginTop: 10, paddingHorizontal: 2 },
    metaText: { flex: 1, minWidth: 0, gap: 2 },
    host: { fontSize: 13, fontWeight: "700", color: colors.text },
    title: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
    tag: {
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagText: { fontSize: 10, fontWeight: "600", color: colors.textMuted },
  });
}
