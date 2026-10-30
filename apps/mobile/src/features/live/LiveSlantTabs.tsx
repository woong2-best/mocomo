import { memo, useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { MOBILE_LIVE_CATEGORIES, type MobileLiveCategoryId } from "@/features/live/live-categories";

const BAR_H = 46;
const SLANT = (22 * Math.PI) / 180;
const SHIFT = BAR_H * Math.tan(SLANT);
const FONT = 13;
const STROKE = 1.2;
const STROKE_ON = 2;

const TABS = MOBILE_LIVE_CATEGORIES.map((tab) => ({ id: tab.id, label: tab.tab }));

type Props = {
  active: MobileLiveCategoryId;
  onSelect: (id: MobileLiveCategoryId) => void;
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
    const inset = STROKE_ON / 2;
    const topLeft = index === 0 ? inset : left;
    const topRight = index === last ? contentW - inset : right;
    const bottomLeft = index === 0 ? inset : left - shift;
    const bottomRight = index === last ? contentW - inset : right - shift;
    const top = inset;
    const bottom = BAR_H - inset;
    const points = `${topLeft},${top} ${topRight},${top} ${bottomRight},${bottom} ${bottomLeft},${bottom}`;
    const labelShift = index === 0 || index === last ? -shift / 4 : -shift / 2;
    return { id: tab.id, label: tab.label, points, left, topW, labelShift };
  });

  return { slots, contentW };
}

export const LiveSlantTabs = memo(function LiveSlantTabs({ active, onSelect }: Props) {
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
      style={styles.bar}
      contentContainerStyle={{ width: contentW }}
    >
      <View style={{ width: contentW, height: BAR_H, overflow: "hidden" }}>
        <Svg width={contentW} height={BAR_H} pointerEvents="none">
          {ordered.map((slot) => {
            const on = slot.id === active;
            return (
              <Polygon
                key={slot.id}
                points={slot.points}
                fill={on ? "#000000" : "#0a0a0a"}
                stroke={on ? "#4da3ff" : "#8A8A8A"}
                strokeWidth={on ? STROKE_ON : STROKE}
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
    height: BAR_H,
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  hit: {
    position: "absolute",
    top: 0,
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
  },
});
