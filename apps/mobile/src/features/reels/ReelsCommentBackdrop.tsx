import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  REELS_COMMENT_DURATION_MS,
  reelsCommentShouldClose,
} from "@/features/reels/reels-comment-layout";

const SNAP = {
  duration: REELS_COMMENT_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};

type Props = {
  progress: SharedValue<number>;
  sheetHeight: SharedValue<number>;
  onDismiss: () => void;
  accessibilityLabel: string;
};

/**
 * Full-screen hit target above the reel and under the sheet.
 * Tap (or a downward flick) closes — Instagram Reels comments.
 */
export function ReelsCommentBackdrop({
  progress,
  sheetHeight,
  onDismiss,
  accessibilityLabel,
}: Props) {
  const dragStart = useSharedValue(1);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(10)
        .onEnd((_e, success) => {
          if (success) runOnJS(onDismiss)();
        }),
    [onDismiss]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .failOffsetX([-28, 28])
        .onStart(() => {
          dragStart.value = progress.value;
        })
        .onUpdate((e) => {
          const h = Math.max(1, sheetHeight.value);
          progress.value = Math.min(1, Math.max(0, dragStart.value - e.translationY / h));
        })
        .onEnd((e) => {
          if (reelsCommentShouldClose(progress.value, e.velocityY)) {
            runOnJS(onDismiss)();
          } else {
            progress.value = withTiming(1, SNAP);
          }
        }),
    [dragStart, onDismiss, progress, sheetHeight]
  );

  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "activate") onDismiss();
        }}
        style={styles.backdrop}
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    elevation: 1,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
});
