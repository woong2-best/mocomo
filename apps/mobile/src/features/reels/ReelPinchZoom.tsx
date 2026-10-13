import { useCallback, useEffect, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  REEL_PINCH_SNAP_MS,
  reelCommittedVisualScale,
  reelPinchOffset,
  reelPinchShouldCommit,
} from "@/features/reels/reel-pinch-zoom";

type Props = {
  children: ReactNode;
  /** Chrome that must not scale (pause / 2× hold). */
  overlay?: ReactNode;
  enabled?: boolean;
  resetKey?: string;
  /** Scale needed for contain-fitted media to cover the phone. */
  fillBoost?: number;
  onZoomChange?: (zooming: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

const SNAP = { duration: REEL_PINCH_SNAP_MS, easing: Easing.out(Easing.cubic) };

/**
 * Instagram Reels pinch: two fingers only. One-finger swipe never zooms.
 * Once committed, media fills the phone, then extra pinch zooms in. Release snaps back.
 */
export function ReelPinchZoom({
  children,
  overlay,
  enabled = true,
  resetKey,
  fillBoost = 1,
  onZoomChange,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const boxW = useSharedValue(1);
  const boxH = useSharedValue(1);
  const boost = useSharedValue(Math.max(1, fillBoost));
  const committed = useSharedValue(false);

  boost.value = Math.max(1, fillBoost);

  const notify = useCallback(
    (next: boolean) => {
      onZoomChange?.(next);
    },
    [onZoomChange]
  );

  const hardReset = useCallback(() => {
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
    committed.value = false;
  }, [committed, scale, tx, ty]);

  useEffect(() => {
    hardReset();
    onZoomChange?.(false);
    // Reset only when this slide leaves the viewport or the media changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid snapping on callback identity
  }, [enabled, resetKey, hardReset]);

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .minPointers(2)
    .maxPointers(2)
    .cancelsTouchesInView(false)
    .onBegin((e) => {
      if (e.numberOfPointers < 2) return;
      originX.value = e.focalX;
      originY.value = e.focalY;
    })
    .onUpdate((e) => {
      if (e.numberOfPointers < 2) return;
      if (!committed.value) {
        if (!reelPinchShouldCommit(e.scale, e.numberOfPointers)) return;
        committed.value = true;
        runOnJS(notify)(true);
      }
      const next = reelCommittedVisualScale(e.scale, boost.value);
      const offset = reelPinchOffset(
        next,
        originX.value,
        originY.value,
        e.focalX,
        e.focalY,
        boxW.value / 2,
        boxH.value / 2
      );
      scale.value = next;
      tx.value = offset.x;
      ty.value = offset.y;
    })
    .onFinalize(() => {
      if (!committed.value) {
        scale.value = 1;
        tx.value = 0;
        ty.value = 0;
        return;
      }
      committed.value = false;
      scale.value = withTiming(1, SNAP);
      tx.value = withTiming(0, SNAP);
      ty.value = withTiming(0, SNAP, (finished) => {
        if (!finished) return;
        runOnJS(notify)(false);
      });
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={pinch}>
      <View
        collapsable={false}
        style={[styles.fill, style]}
        onLayout={(e) => {
          boxW.value = Math.max(1, e.nativeEvent.layout.width);
          boxH.value = Math.max(1, e.nativeEvent.layout.height);
        }}
      >
        <Animated.View style={[styles.fill, animStyle]} pointerEvents="none">
          {children}
        </Animated.View>
        {overlay}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
