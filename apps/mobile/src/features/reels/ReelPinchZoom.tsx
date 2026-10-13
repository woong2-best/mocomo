import { useCallback, useEffect, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  clampReelPinchScale,
  REEL_PINCH_SNAP_MS,
  reelPinchOffset,
} from "@/features/reels/reel-pinch-zoom";

type Props = {
  children: ReactNode;
  enabled?: boolean;
  resetKey?: string;
  onZoomChange?: (zooming: boolean) => void;
  onSingleTap?: () => void;
  style?: StyleProp<ViewStyle>;
};

const SNAP = { duration: REEL_PINCH_SNAP_MS, easing: Easing.out(Easing.cubic) };

/**
 * Instagram Reels pinch: two-finger zoom + pan while fingers are down.
 * Release snaps media back to 1×.
 */
export function ReelPinchZoom({
  children,
  enabled = true,
  resetKey,
  onZoomChange,
  onSingleTap,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const boxW = useSharedValue(1);
  const boxH = useSharedValue(1);
  const zooming = useSharedValue(false);

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
    zooming.value = false;
  }, [scale, tx, ty, zooming]);

  useEffect(() => {
    hardReset();
    onZoomChange?.(false);
    // Reset only when this slide leaves the viewport or the media changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid snapping on callback identity
  }, [enabled, resetKey, hardReset]);

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .cancelsTouchesInView(false)
    .onBegin((e) => {
      originX.value = e.focalX;
      originY.value = e.focalY;
      if (!zooming.value) {
        zooming.value = true;
        runOnJS(notify)(true);
      }
    })
    .onUpdate((e) => {
      const next = clampReelPinchScale(e.scale);
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
      scale.value = withTiming(1, SNAP);
      tx.value = withTiming(0, SNAP);
      ty.value = withTiming(0, SNAP, (finished) => {
        if (!finished) return;
        zooming.value = false;
        runOnJS(notify)(false);
      });
    });

  const tap = Gesture.Tap()
    .enabled(enabled && !!onSingleTap)
    .maxDuration(250)
    .onEnd(() => {
      if (zooming.value) return;
      if (onSingleTap) runOnJS(onSingleTap)();
    });

  const composed = Gesture.Simultaneous(pinch, tap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        collapsable={false}
        style={[styles.fill, style, animStyle]}
        onLayout={(e) => {
          boxW.value = Math.max(1, e.nativeEvent.layout.width);
          boxH.value = Math.max(1, e.nativeEvent.layout.height);
        }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
