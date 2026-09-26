import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

/** Full-height bars from the empty-broadcast card. */
const BARS = ["#E7A9C4", "#E39A3C", "#2436C4", "#3CB44B", "#A63CB0", "#9A2430", "#4EC8C8"] as const;

type Props = {
  width: number;
  message: string;
  rounded?: boolean;
};

/** Empty live hero: color bars with the no-broadcast notice in the center. */
function LiveEmptyTestPatternInner({ width, message, rounded = false }: Props) {
  return (
    <View style={[styles.wrap, { width }, rounded && styles.rounded]}>
      <View style={styles.bars}>
        {BARS.map((color) => (
          <View key={color} style={[styles.bar, { backgroundColor: color }]} />
        ))}
      </View>
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.pill}>
          <Text style={styles.pillText}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

export const LiveEmptyTestPattern = memo(LiveEmptyTestPatternInner);

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 16 / 9,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  rounded: {
    borderRadius: 22,
    alignSelf: "center",
  },
  bars: {
    flex: 1,
    flexDirection: "row",
  },
  bar: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  pill: {
    maxWidth: "92%",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(8,8,8,0.92)",
  },
  pillText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
});
