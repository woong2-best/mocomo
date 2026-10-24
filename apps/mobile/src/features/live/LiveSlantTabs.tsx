import { memo, useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { MOBILE_LIVE_CATEGORIES, type MobileLiveCategoryId } from "@/features/live/live-categories";

const BAR_H = 46;
const GLOW_PAD = 8;
const SLANT = (22 * Math.PI) / 180;
const SHIFT = BAR_H * Math.tan(SLANT);
const FONT = 13;

const TABS = MOBILE_LIVE_CATEGORIES.map((tab) => ({ id: tab.id, label: tab.tab }));

type Props = {
  active: MobileLiveCategoryId;
  onSelect: (id: MobileLiveCategoryId) => void;
  /** Sit on top of the featured stage instead of a solid black bar. */
  overlay?: boolean;
};

type Slot = {
  id: MobileLiveCategoryId;
  label: string;
  points: string;
  left: number;
  topW: number;
  labelShift: number;
};

function tabWidth(label: string): number {
  return Math.max(54, Math.ceil(label.length * FONT * 0.72) + 20);
}

function buildSlots(screenW: number): { slots: Slot[]; contentW: number } {
  const width = Math.max(0, screenW);
  if (width <= 0) return { slots: [], contentW: 0 };
  const natural = TABS.map((tab) => tabWidth(tab.label));
  const naturalSum = natural.reduce((sum, n) => sum + n, 0);
  const contentW = Math.max(width, naturalSum);
  const scale = naturalSum > 0 ? contentW / naturalSum : 1;
  const minTop = contentW / TABS.length;
  const shift = Math.min(SHIFT, minTop * 0.42);
  let x = 0;
  const last = TABS.length - 1;

  const slots = TABS.map((tab, index) => {
    const topW = index === last ? contentW - x : natural[index] * scale;
    const left = x;
    const right = left + topW;
    x = right;
    const bottomLeft = index === 0 ? 0 : left - shift;
    const bottomRight = index === last ? contentW : right - shift;
    const top = GLOW_PAD;
    const bottom = GLOW_PAD + BAR_H;
    const points = `${left},${top} ${right},${top} ${bottomRight},${bottom} ${bottomLeft},${bottom}`;
    const labelShift = index === 0 || index === last ? -shift / 4 : -shift / 2;
    return { id: tab.id, label: tab.label, points, left, topW, labelShift };
  });

  return { slots, contentW };
}

export const LiveSlantTabs = memo(function LiveSlantTabs({ active, onSelect, overlay = false }: Props) {
  const { width } = useWindowDimensions();
  const { slots, contentW } = useMemo(() => buildSlots(width), [width]);
  const ordered = useMemo(() => {
    const idle = slots.filter((slot) => slot.id !== active);
    const on = slots.find((slot) => slot.id === active);
    return on ? [...idle, on] : slots;
  }, [slots, active]);

  if (width <= 0 || slots.length === 0) return null;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      style={[styles.bar, overlay && styles.barOverlay]}
      contentContainerStyle={{ width: contentW }}
    >
      <View style={{ width: contentW, height: BAR_H + GLOW_PAD * 2 }}>
        <Svg width={contentW} height={BAR_H + GLOW_PAD * 2} pointerEvents="none">
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
              accessibilityLabel={slot.label}
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
                {slot.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  bar: {
    height: BAR_H + GLOW_PAD * 2,
    width: "100%",
    backgroundColor: "#000",
  },
  barOverlay: {
    backgroundColor: "transparent",
    marginTop: -36,
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
    fontSize: FONT,
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
