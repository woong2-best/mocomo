import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatViewerCountCompact } from "@/features/live/live-categories";

type Props = {
  viewerCount: number;
  /** Prefix the count with a red LIVE segment (hero / large cards). */
  showLive?: boolean;
  size?: "sm" | "md";
};

/** Chzzk-style joined badge: red `LIVE` segment + dark viewer-count segment. */
function LiveViewerBadgeInner({ viewerCount, showLive = true, size = "md" }: Props) {
  const small = size === "sm";

  return (
    <View style={styles.group}>
      {showLive ? (
        <View style={[styles.liveSeg, small && styles.liveSegSm]}>
          <Text style={[styles.liveText, small && styles.liveTextSm]}>LIVE</Text>
        </View>
      ) : null}
      <View style={[styles.countSeg, small && styles.countSegSm]}>
        {showLive ? null : <View style={styles.dot} />}
        <Text style={[styles.countText, small && styles.countTextSm]}>
          {formatViewerCountCompact(viewerCount)}명
        </Text>
      </View>
    </View>
  );
}

export const LiveViewerBadge = memo(LiveViewerBadgeInner);

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 5,
    overflow: "hidden",
  },
  liveSeg: {
    backgroundColor: "#E02020",
    paddingHorizontal: 6,
    paddingVertical: 3,
    justifyContent: "center",
  },
  liveSegSm: { paddingHorizontal: 5, paddingVertical: 2 },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  liveTextSm: { fontSize: 9 },
  countSeg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  countSegSm: { paddingHorizontal: 5, paddingVertical: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#E02020" },
  countText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  countTextSm: { fontSize: 10 },
});
