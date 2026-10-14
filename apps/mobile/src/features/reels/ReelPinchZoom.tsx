import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
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
  REEL_GESTURE_SLOP,
  REEL_HOLD_MS,
  REEL_PINCH_SNAP_MS,
  reelCommittedVisualScale,
  reelOneFingerShouldYield,
  reelPinchOffset,
  reelPinchShouldCommit,
} from "@/features/reels/reel-pinch-zoom";

type Props = {
  children: ReactNode;
  /** Chrome that must not scale (pause badge). Must not capture touches. */
  overlay?: ReactNode;
  enabled?: boolean;
  /** Video only. Images page and pinch, they do not pause. */
  tapEnabled?: boolean;
  /** Video only. A still hold is 2×; movement yields to the pagers. */
  holdEnabled?: boolean;
  onTap?: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  resetKey?: string;
  /** Scale needed for contain-fitted media to cover the phone. */
  fillBoost?: number;
  onZoomChange?: (zooming: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

const SNAP = { duration: REEL_PINCH_SNAP_MS, easing: Easing.out(Easing.cubic) };

/**
 * One surface, Instagram order:
 * two-finger pinch zooms and snaps back; one-finger movement fails this
 * surface so the horizontal and vertical pagers can take it; a still hold
 * is 2×; a short tap pauses. No stacked edge/tap overlays.
 */
export function ReelPinchZoom({
  children,
  overlay,
  enabled = true,
  tapEnabled = false,
  holdEnabled = false,
  onTap,
  onHoldStart,
  onHoldEnd,
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
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const pinchDecided = useSharedValue(false);
  const blockTap = useSharedValue(false);

  boost.value = Math.max(1, fillBoost);

  const onTapRef = useRef(onTap);
  const onHoldStartRef = useRef(onHoldStart);
  const onHoldEndRef = useRef(onHoldEnd);
  onTapRef.current = onTap;
  onHoldStartRef.current = onHoldStart;
  onHoldEndRef.current = onHoldEnd;

  const notify = useCallback(
    (next: boolean) => {
      onZoomChange?.(next);
    },
    [onZoomChange]
  );
  const holdingRef = useRef(false);
  const fireTap = useCallback(() => {
    onTapRef.current?.();
  }, []);
  const fireHoldStart = useCallback(() => {
    holdingRef.current = true;
    onHoldStartRef.current?.();
  }, []);
  const fireHoldEnd = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    onHoldEndRef.current?.();
  }, []);

  const hardReset = useCallback(() => {
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
    committed.value = false;
    pinchDecided.value = false;
    blockTap.value = false;
  }, [blockTap, committed, pinchDecided, scale, tx, ty]);

  useEffect(() => {
    hardReset();
    onZoomChange?.(false);
    // Reset only when this slide leaves the viewport or the media changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid snapping on callback identity
  }, [enabled, resetKey, hardReset]);

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .enabled(enabled)
      .manualActivation(true)
      .cancelsTouchesInView(false)
      .onTouchesDown((e, manager) => {
        const first = e.allTouches[0];
        if (first && e.numberOfTouches === 1 && !pinchDecided.value) {
          startX.value = first.x;
          startY.value = first.y;
        }
        if (pinchDecided.value || e.numberOfTouches < 2) return;
        const focal = e.allTouches[0];
        if (focal) {
          originX.value = focal.x;
          originY.value = focal.y;
        }
        pinchDecided.value = true;
        blockTap.value = true;
        manager.activate();
      })
      .onTouchesMove((e, manager) => {
        if (e.numberOfTouches >= 2) {
          if (pinchDecided.value) return;
          const focal = e.allTouches[0];
          if (focal) {
            originX.value = focal.x;
            originY.value = focal.y;
          }
          pinchDecided.value = true;
          blockTap.value = true;
          manager.activate();
          return;
        }
        if (pinchDecided.value) return;
        const finger = e.allTouches[0];
        if (!finger) return;
        const dx = finger.x - startX.value;
        const dy = finger.y - startY.value;
        if (!reelOneFingerShouldYield(dx * dx + dy * dy)) return;
        pinchDecided.value = true;
        manager.fail();
      })
      .onTouchesUp((e, manager) => {
        if (e.numberOfTouches >= 2) return;
        if (!pinchDecided.value) {
          pinchDecided.value = true;
          manager.fail();
          return;
        }
        if (committed.value) manager.end();
      })
      .onBegin((e) => {
        originX.value = e.focalX;
        originY.value = e.focalY;
      })
      .onUpdate((e) => {
        if (e.numberOfPointers < 2 && !committed.value) return;
        if (!committed.value) {
          if (!reelPinchShouldCommit(e.scale, Math.max(e.numberOfPointers, 2))) return;
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
        pinchDecided.value = false;
        const wasCommitted = committed.value;
        if (!wasCommitted) {
          scale.value = 1;
          tx.value = 0;
          ty.value = 0;
          blockTap.value = false;
          return;
        }
        committed.value = false;
        scale.value = withTiming(1, SNAP);
        tx.value = withTiming(0, SNAP);
        ty.value = withTiming(0, SNAP, (finished) => {
          if (!finished) return;
          blockTap.value = false;
          runOnJS(notify)(false);
        });
      });

    if (!tapEnabled && !holdEnabled) return pinch;

    const tap = Gesture.Tap()
      .enabled(enabled && tapEnabled)
      .maxDistance(REEL_GESTURE_SLOP)
      .maxDuration(REEL_HOLD_MS + 40)
      .cancelsTouchesInView(false)
      .onEnd((_e, success) => {
        if (!success || blockTap.value) return;
        runOnJS(fireTap)();
      });

    const hold = Gesture.LongPress()
      .enabled(enabled && holdEnabled)
      .minDuration(REEL_HOLD_MS)
      .maxDistance(REEL_GESTURE_SLOP)
      .cancelsTouchesInView(false)
      .onStart(() => {
        if (blockTap.value) return;
        runOnJS(fireHoldStart)();
      })
      .onFinalize(() => {
        runOnJS(fireHoldEnd)();
      });

    const oneFinger = Gesture.Exclusive(hold, tap);
    return Gesture.Simultaneous(pinch, oneFinger);
  }, [
    blockTap,
    boost,
    boxH,
    boxW,
    committed,
    enabled,
    fireHoldEnd,
    fireHoldStart,
    fireTap,
    holdEnabled,
    notify,
    originX,
    originY,
    pinchDecided,
    scale,
    startX,
    startY,
    tapEnabled,
    tx,
    ty,
  ]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
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
