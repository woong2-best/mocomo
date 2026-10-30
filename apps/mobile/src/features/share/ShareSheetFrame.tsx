import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHARE_SHEET, SHARE_SPRING } from "@/features/share/share-sheet-theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 1100;

export function ShareSheetFrame({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(visible);
  const translateY = useSharedValue(640);
  const dim = useSharedValue(0);
  const sheetH = useSharedValue(640);
  const dragStart = useSharedValue(0);
  const openedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const finishClose = useCallback(() => {
    Keyboard.dismiss();
    openedRef.current = false;
    setShown(false);
    onCloseRef.current();
  }, []);

  const animateOpen = useCallback(() => {
    translateY.value = withSpring(0, SHARE_SPRING);
    dim.value = withSpring(1, SHARE_SPRING);
  }, [dim, translateY]);

  const animateClose = useCallback(
    (notify: boolean) => {
      translateY.value = withSpring(sheetH.value, SHARE_SPRING, (done) => {
        if (done && notify) runOnJS(finishClose)();
      });
      dim.value = withSpring(0, SHARE_SPRING);
    },
    [dim, finishClose, sheetH, translateY]
  );

  useEffect(() => {
    if (visible) {
      setShown(true);
      if (openedRef.current) return;
      openedRef.current = true;
      translateY.value = sheetH.value;
      dim.value = 0;
      requestAnimationFrame(() => animateOpen());
      return;
    }
    if (openedRef.current) {
      openedRef.current = false;
      animateClose(true);
    }
  }, [animateClose, animateOpen, dim, sheetH, translateY, visible]);

  const requestClose = useCallback(() => {
    if (!openedRef.current) return;
    animateClose(true);
  }, [animateClose]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onStart(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, dragStart.value + e.translationY);
      dim.value = Math.max(0, 1 - translateY.value / sheetH.value);
    })
    .onEnd((e) => {
      const shouldClose =
        translateY.value > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY;
      if (shouldClose) {
        translateY.value = withSpring(sheetH.value, SHARE_SPRING, (done) => {
          if (done) runOnJS(finishClose)();
        });
        dim.value = withSpring(0, SHARE_SPRING);
      } else {
        translateY.value = withSpring(0, SHARE_SPRING);
        dim.value = withSpring(1, SHARE_SPRING);
      }
    });

  const dimStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!shown) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityRole="button">
          <Animated.View style={[styles.dim, dimStyle]} />
        </Pressable>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }, sheetStyle]}
            onLayout={(e) => {
              sheetH.value = e.nativeEvent.layout.height;
            }}
          >
            <View style={styles.handleWrap} accessibilityRole="adjustable">
              <View style={styles.handle} />
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: SHARE_SHEET.dim,
  },
  sheet: {
    backgroundColor: SHARE_SHEET.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    maxHeight: "92%",
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: SHARE_SHEET.handle,
  },
});
