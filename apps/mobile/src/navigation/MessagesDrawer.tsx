import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessagesInboxScreen } from "@/features/messages/MessagesInboxScreen";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";

const OPEN_MS = 280;
const CLOSE_MS = 220;

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Right-side inbox overlay — same motion as the left menu drawer. */
export function MessagesDrawer({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const panelWidth = Math.min(Math.round(screenW * 0.92), screenW - 48);

  const [presented, setPresented] = useState(false);
  const slideX = useRef(new Animated.Value(360)).current;

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

  return (
    <Modal
      visible={presented}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          style={[styles.scrimWrap, { opacity: backdropOpacity }]}
          pointerEvents="none"
        >
          <BlurView
            intensity={isDark ? 55 : 65}
            tint={isDark ? "dark" : "light"}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isDark
                  ? "rgba(8, 10, 14, 0.45)"
                  : "rgba(0, 0, 0, 0.38)",
              },
            ]}
            pointerEvents="none"
          />
        </Animated.View>

        <Pressable
          style={[styles.marginDismiss, { right: panelWidth }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="메세지 닫기"
        />

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              paddingTop: insets.top + 4,
              paddingBottom: insets.bottom,
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <MessagesInboxScreen presentation="drawer" onRequestClose={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1 },
    scrimWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    marginDismiss: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 3,
    },
    panel: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: isDark ? "#0F1524" : colors.background,
      zIndex: 2,
      elevation: 8,
    },
  });
}
