import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MarketHomeScreen, type MarketHubLane } from "@/features/marketplace/MarketHomeScreen";
import { useTheme } from "@/theme/ThemeContext";

const OPEN_MS = 280;
const CLOSE_MS = 220;

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenLane: (lane: MarketHubLane, q?: string) => void;
};

export function MarketHubSlidePanel({ visible, onClose, onOpenLane }: Props) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelWidth = Math.min(Math.round(screenW * 0.92), 420);
  const [presented, setPresented] = useState(false);
  const slideX = useRef(new Animated.Value(panelWidth)).current;

  const backdropOpacity = slideX.interpolate({
    inputRange: [0, panelWidth],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (visible) {
      setPresented(true);
      slideX.setValue(panelWidth);
      Animated.timing(slideX, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!presented) return;
    Animated.timing(slideX, {
      toValue: panelWidth,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPresented(false);
    });
  }, [panelWidth, presented, slideX, visible]);

  if (!presented && !visible) return null;

  return (
    <Modal visible={presented} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.scrim, { opacity: backdropOpacity }]}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              backgroundColor: colors.background,
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <MarketHomeScreen embedded onClose={onClose} onOpenLane={onOpenLane} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,0,0,0.45)" },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
});
