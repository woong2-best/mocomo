import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import type { LiveListItem } from "@/api/live";
import { LiveBeadCard } from "@/features/live/LiveBeadCard";
import {
  buildLiveBeadSlots,
  wrapIndex,
  type LiveBeadSlot,
} from "@/features/live/live-bead-slots";

const VISIBLE_RADIUS = 2;
const SPRING = { damping: 26, stiffness: 240, mass: 0.85, overshootClamping: false };

type Props = {
  items: LiveListItem[];
  onOpenLive: (id: string) => void;
  /** Extra top inset below chrome (categories). */
  topInset?: number;
};

/**
 * Infinite bead-style live feed — finger-linked pan, recycled slots, wraparound index.
 * Not a FlatList; not page-snap paging.
 */
export function LiveBeadFeed({ items, onOpenLive, topInset = 0 }: Props) {
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 420);
  // Video-only bead (title overlays the frame — no meta strip below).
  const cardHeight = cardWidth * (9 / 16);
  const spacing = cardHeight * 0.78;

  const slots = useMemo(() => buildLiveBeadSlots(items), [items]);
  const length = slots.length;

  const index = useSharedValue(0);
  const startIndex = useSharedValue(0);
  const [activeKey, setActiveKey] = useState(slots[0]?.key ?? "");

  // Preserve focus when live data arrives into empty slots — map by relative wrap, not reset to 0.
  useEffect(() => {
    if (length <= 0) return;
    const current = wrapIndex(Math.round(index.value), length);
    const key = slots[current]?.key;
    if (key) setActiveKey(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, slots]);

  const publishActive = useCallback(
    (raw: number) => {
      if (length <= 0) return;
      const i = wrapIndex(Math.round(raw), length);
      const key = slots[i]?.key ?? "";
      setActiveKey((prev) => (prev === key ? prev : key));
    },
    [length, slots]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-6, 6])
        .failOffsetX([-24, 24])
        .onBegin(() => {
          startIndex.value = index.value;
        })
        .onUpdate((e) => {
          // Finger up → beads move up (next items come from below): negative translationY increases index.
          index.value = startIndex.value - e.translationY / spacing;
          runOnJS(publishActive)(index.value);
        })
        .onEnd((e) => {
          const velocitySlots = -e.velocityY / spacing;
          const projected = index.value + velocitySlots * 0.18;
          const target = Math.round(projected);
          index.value = withSpring(target, {
            ...SPRING,
            velocity: velocitySlots,
          });
          runOnJS(publishActive)(target);
        }),
    [index, publishActive, spacing, startIndex]
  );

  const stageHeight = height - topInset;

  const windowSlots = useMemo(() => {
    // Always render length copies for small N (≤8); recycle by wrapping visual offsets.
    return slots.map((slot, i) => ({ slot, baseIndex: i }));
  }, [slots]);

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.stage, { height: stageHeight }]}>
        {windowSlots.map(({ slot, baseIndex }) => (
          <BeadLayer
            key={slot.key}
            slot={slot}
            baseIndex={baseIndex}
            length={length}
            index={index}
            spacing={spacing}
            cardWidth={cardWidth}
            active={slot.key === activeKey}
            onOpenLive={onOpenLive}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

type LayerProps = {
  slot: LiveBeadSlot;
  baseIndex: number;
  length: number;
  index: SharedValue<number>;
  spacing: number;
  cardWidth: number;
  active: boolean;
  onOpenLive: (id: string) => void;
};

const BeadLayer = memo(function BeadLayer({
  slot,
  baseIndex,
  length,
  index,
  spacing,
  cardWidth,
  active,
  onOpenLive,
}: LayerProps) {
  const style = useAnimatedStyle(() => {
    // Shortest wrapped distance from floating index to this bead.
    let delta = baseIndex - index.value;
    if (length > 0) {
      const half = length / 2;
      while (delta > half) delta -= length;
      while (delta < -half) delta += length;
    }

    const abs = Math.abs(delta);
    const translateY = delta * spacing;
    const scale = interpolate(
      abs,
      [0, 1, 2, 3],
      [1, 0.9, 0.8, 0.72],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      abs,
      [0, 1, 2, 2.6],
      [1, 0.78, 0.42, 0],
      Extrapolation.CLAMP
    );
    const zIndex = Math.round(100 - abs * 10);

    return {
      opacity,
      zIndex,
      transform: [{ translateY }, { scale }],
    };
  }, [baseIndex, length, spacing]);

  // Cull far beads from the React tree weight for players (still keep transform shell).
  const near = true; // all ≤8 beads stay mounted; only active plays video

  return (
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      style={[styles.layer, { width: cardWidth }, style]}
    >
      {near ? (
        <LiveBeadCard
          slot={slot}
          width={cardWidth}
          active={active}
          onOpenLive={onOpenLive}
        />
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  layer: {
    position: "absolute",
  },
});
