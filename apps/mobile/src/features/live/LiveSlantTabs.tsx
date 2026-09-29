import { memo, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import type { MobileLiveCategoryId } from "@/features/live/live-categories";

const BAR_H = 46;
const GLOW_PAD = 8;
const SLANT = (22 * Math.PI) / 180;
const SHIFT = BAR_H * Math.tan(SLANT);

const TABS: {
  id: MobileLiveCategoryId;
  full: string;
  short: string;
}[] = [
  { id: "ALL", full: "ALL", short: "ALL" },
  { id: "VIRTUAL", full: "FOLLOW", short: "FOL" },
  { id: "GAME", full: "GAME", short: "GAME" },
  { id: "JUST_CHATTING", full: "CHAT", short: "CHAT" },
  { id: "IRL", full: "FESTIVAL", short: "FES" },
  { id: "MUSIC", full: "MUSIC", short: "MUS" },
  { id: "LIVE", full: "R-18", short: "R-18" },
];

type Props = {
  active: MobileLiveCategoryId;
  onSelect: (id: MobileLiveCategoryId) => void;
};

type Slot = {
  id: MobileLiveCategoryId;
  full: string;
  short: string;
  points: string;
  left: number;
  topW: number;
  labelShift: number;
};

function buildSlots(screenW: number, active: MobileLiveCategoryId): Slot[] {
  const width = Math.max(0, screenW);
  if (width <= 0) return [];
  const last = TABS.length - 1;
  const weights = TABS.map((tab) => (tab.id === active ? 1.45 : 1));
  const weightSum = weights.reduce((sum, n) => sum + n, 0);
  const minTop = width / weightSum;
  const shift = Math.min(SHIFT, minTop * 0.42);
  let x = 0;

  return TABS.map((tab, index) => {
    const topW = index === last ? width - x : (width * weights[index]) / weightSum;
    const left = x;
    const right = left + topW;
    x = right;
    const bottomLeft = index === 0 ? 0 : left - shift;
    const bottomRight = index === last ? width : right - shift;
    const top = GLOW_PAD;
    const bottom = GLOW_PAD + BAR_H;
    const points = `${left},${top} ${right},${top} ${bottomRight},${bottom} ${bottomLeft},${bottom}`;
    const labelShift = index === 0 || index === last ? -shift / 4 : -shift / 2;
    return {
      id: tab.id,
      full: tab.full,
      short: tab.short,
      points,
      left,
      topW,
      labelShift,
    };
  });
}

export const LiveSlantTabs = memo(function LiveSlantTabs({ active, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const slots = useMemo(() => buildSlots(width, active), [width, active]);
  const ordered = useMemo(() => {
    const idle = slots.filter((slot) => slot.id !== active);
    const on = slots.find((slot) => slot.id === active);
    return on ? [...idle, on] : slots;
  }, [slots, active]);

  if (width <= 0 || slots.length === 0) return null;

  return (
    <View style={styles.bar}>
      <Svg width={width} height={BAR_H + GLOW_PAD * 2} pointerEvents="none">
        {slots
          .filter((slot) => slot.id === active)
          .map((slot) => (
            <Polygon
              key={`${slot.id}-glow`}
              points={slot.points}
              fill="#1a6aff"
              fillOpacity={0.28}
              stroke="#1a6aff"
              strokeWidth={10}
              strokeOpacity={0.95}
              strokeLinejoin="round"
            />
          ))}
        {ordered.map((slot) => {
          const on = slot.id === active;
          return (
            <Polygon
              key={slot.id}
              points={slot.points}
              fill={on ? "#000000" : "#0a0a0a"}
              stroke={on ? "#4da3ff" : "#8A8A8A"}
              strokeWidth={on ? 2.6 : 1.25}
              strokeLinejoin="miter"
            />
          );
        })}
      </Svg>
      {slots.map((slot) => {
        const on = slot.id === active;
        return (
          <Pressable
            key={slot.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(slot.id)}
            style={[styles.hit, { left: slot.left, width: slot.topW }]}
          >
            <Text
              style={[
                styles.label,
                on && styles.labelOn,
                { transform: [{ translateX: slot.labelShift }] },
              ]}
              numberOfLines={1}
            >
              {on ? slot.full : slot.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    height: BAR_H + GLOW_PAD * 2,
    width: "100%",
    backgroundColor: "#000",
  },
  hit: {
    position: "absolute",
    top: GLOW_PAD,
    height: BAR_H,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.3,
    textAlign: "center",
    fontFamily: Platform.OS === "android" ? "sans-serif" : undefined,
    includeFontPadding: false,
  },
  labelOn: {
    color: "#FFFFFF",
    textShadowColor: "#1a6aff",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
