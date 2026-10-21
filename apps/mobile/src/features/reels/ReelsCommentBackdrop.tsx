import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  REELS_COMMENT_DURATION_MS,
  reelsCommentBackdropEndAction,
  reelsCommentBackdropHeight,
} from "@/features/reels/reels-comment-layout";

const SNAP = {
  duration: REELS_COMMENT_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};

type Props = {
  progress: SharedValue<number>;
  screenHeight: SharedValue<number>;
  /** Resting sheet height. Drag distance while the keyboard is closed. */
  sheetHeight: SharedValue<number>;
  /** Live sheet height (shrinks when the keyboard covers the sheet). */
  frameHeight: SharedValue<number>;
  frameLift: SharedValue<number>;
  onDismiss: () => void;
  accessibilityLabel: string;
};

/**
 * Hit target for the gap and the shrunk video above the sheet.
 * A tap closes immediately. A downward drag follows the same progress as the handle.
 * Play/pause on the reel is disabled while this layer is up.
 */
export function ReelsCommentBackdrop({
  progress,
  screenHeight,
  sheetHeight,
  frameHeight,
  frameLift,
  onDismiss,
  accessibilityLabel,
}: Props) {
  const dragStart = useSharedValue(1);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          dragStart.value = progress.value;
        })
        .onUpdate((e) => {
          const ay = Math.abs(e.translationY);
          const ax = Math.abs(e.translationX);
          if (ay < 12 || ax > ay) return;
          const h = Math.max(1, frameHeight.value || sheetHeight.value);
          progress.value = Math.min(1, Math.max(0, dragStart.value - e.translationY / h));
        })
        .onEnd((e) => {
          const action = reelsCommentBackdropEndAction(
            e.translationX,
            e.translationY,
            e.velocityY,
            progress.value
          );
          if (action === "dismiss") {
            runOnJS(onDismiss)();
            return;
          }
          progress.value = withTiming(1, SNAP);
        }),
    [dragStart, frameHeight, onDismiss, progress, sheetHeight]
  );

  const clipStyle = useAnimatedStyle(() => ({
    height: reelsCommentBackdropHeight(
      screenHeight.value,
      frameHeight.value || sheetHeight.value,
      frameLift.value,
      progress.value
    ),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "activate") onDismiss();
        }}
        style={[styles.backdrop, clipStyle]}
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    elevation: 2,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
});
