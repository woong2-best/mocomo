import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";

/** 16:9 design space — stretched to the hero slot with preserveAspectRatio="none". */
const VB_W = 1600;
const VB_H = 900;
const TOP_H = 585;
const MID_Y = 585;
const MID_H = 72;
const BOT_Y = 657;
const BOT_H = 243;

/** SMPTE bars, sampled off a CRT so they read muted rather than fully saturated. */
const TOP_BARS = [
  "#B8B8B8",
  "#C6C637",
  "#5FC4C4",
  "#57C24C",
  "#9C2A96",
  "#8B1616",
  "#2A20C2",
] as const;

/** Reverse-blue strip. */
const MID_BARS = [
  "#2A20C2",
  "#0A0A0A",
  "#9C2A96",
  "#0A0A0A",
  "#5FC4C4",
  "#0A0A0A",
  "#B8B8B8",
] as const;

/** -I · white · +Q · black · pluge ramp, as [color, width fraction]. */
const BOTTOM_CELLS: readonly (readonly [string, number])[] = [
  ["#22436B", 0.173],
  ["#D8D8D8", 0.189],
  ["#3A1070", 0.178],
  ["#060606", 0.15],
  ["#0E0E0E", 0.08],
  ["#171717", 0.086],
  ["#060606", 0.144],
];

/**
 * CRT scanline overlay drawn as explicit rows rather than an SVG `<Pattern>` —
 * a pattern that fails to resolve fills solid black over the whole card.
 */
const SCAN_PERIOD = 10;
const SCAN_THICKNESS = 4.5;
const SCAN_ROWS = Array.from(
  { length: Math.ceil(VB_H / SCAN_PERIOD) },
  (_, i) => i * SCAN_PERIOD
);

type Props = {
  /** Full width of the hero slot. */
  width: number;
  message: string;
};

/** Empty live hub: broadcast test pattern with the "no stream" notice on top. */
function LiveEmptyTestPatternInner({ width, message }: Props) {
  const topW = VB_W / TOP_BARS.length;
  const midW = VB_W / MID_BARS.length;

  let botX = 0;
  const bottom = BOTTOM_CELLS.map(([color, fraction], i) => {
    const cell = { color, x: botX, w: VB_W * fraction, key: `b${i}` };
    botX += cell.w;
    return cell;
  });

  return (
    <View style={[styles.wrap, { width }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        {TOP_BARS.map((color, i) => (
          <Rect
            key={`t${i}`}
            x={topW * i}
            y={0}
            width={topW + 0.5}
            height={TOP_H}
            fill={color}
          />
        ))}
        {MID_BARS.map((color, i) => (
          <Rect
            key={`m${i}`}
            x={midW * i}
            y={MID_Y}
            width={midW + 0.5}
            height={MID_H}
            fill={color}
          />
        ))}
        {bottom.map((cell) => (
          <Rect
            key={cell.key}
            x={cell.x}
            y={BOT_Y}
            width={cell.w + 0.5}
            height={BOT_H}
            fill={cell.color}
          />
        ))}

        {SCAN_ROWS.map((y) => (
          <Rect
            key={`s${y}`}
            x={0}
            y={y}
            width={VB_W}
            height={SCAN_THICKNESS}
            fill="#000"
            opacity={0.16}
          />
        ))}
      </Svg>

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.pill}>
          <Ionicons name="videocam-off-outline" size={16} color="#fff" />
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
    backgroundColor: "#050505",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "86%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  pillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
