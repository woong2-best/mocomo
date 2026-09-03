import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LiveListItem } from "@/api/live";
import { liveCategoryLabel } from "@/features/live/live-categories";
import { LiveHeroPreviewPoster } from "@/features/live/LiveHeroPreviewVideo";
import { LiveAdultWatermark, isLiveAdultItem } from "@/features/live/LiveAdultWatermark";
import { LiveViewerBadge } from "@/features/live/LiveViewerBadge";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { type ThemeColors } from "@/theme/tokens";

type Props = {
  item: LiveListItem;
  /** Full window width — the hero is edge-to-edge. */
  width: number;
  onPress: (id: string) => void;
};

/** Top-ranked live stream: full-bleed 16:9 spotlight above every other section. */
function LiveTopHeroCardInner({ item, width, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const thumb = item.thumbnailUrl ?? item.host?.image ?? null;
  const highlightTag = (item.tags ?? [])[0] ?? null;

  return (
    <Pressable style={[styles.wrap, { width }]} onPress={() => onPress(item.id)}>
      <View style={styles.thumbWrap}>
        <LiveHeroPreviewPoster posterUrl={thumb} width={width} />
        {isLiveAdultItem(item) ? <LiveAdultWatermark /> : null}
        <View style={styles.scrimTop} pointerEvents="none" />
        <View style={styles.scrimBottom} pointerEvents="none" />

        <View style={styles.topRow}>
          <LiveViewerBadge viewerCount={item.viewerCount} />
          {highlightTag ? (
            <View style={styles.topTag}>
              <Text style={styles.topTagText} numberOfLines={1}>
                {highlightTag}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomMeta}>
          <View style={styles.hostRow}>
            <FolkAvatar
              uri={item.host?.image}
              name={item.host?.username ?? "?"}
              size={22}
              framed={false}
            />
            <Text style={styles.hostName} numberOfLines={1}>
              @{item.host?.username ?? "host"}
            </Text>
            {item.host?.isPartner ? (
              <Ionicons name="checkmark-circle" size={13} color="#4AC77A" />
            ) : null}
            <View style={styles.catChip}>
              <Text style={styles.catChipText}>{liveCategoryLabel(item.category)}</Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const LiveTopHeroCard = memo(LiveTopHeroCardInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { backgroundColor: colors.background },
    thumbWrap: {
      aspectRatio: 16 / 9,
      overflow: "hidden",
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    scrimTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "30%",
      backgroundColor: "rgba(0,0,0,0.28)",
    },
    scrimBottom: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "52%",
      backgroundColor: "rgba(0,0,0,0.68)",
    },
    topRow: {
      position: "absolute",
      top: 10,
      left: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    topTag: {
      maxWidth: 120,
      backgroundColor: "rgba(0,0,0,0.62)",
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    topTagText: { color: "rgba(255,255,255,0.92)", fontSize: 10, fontWeight: "700" },
    bottomMeta: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      gap: 6,
    },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    hostName: {
      maxWidth: "55%",
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    catChip: {
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    catChipText: { color: "rgba(255,255,255,0.92)", fontSize: 10, fontWeight: "700" },
    title: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 21,
    },
  });
}
