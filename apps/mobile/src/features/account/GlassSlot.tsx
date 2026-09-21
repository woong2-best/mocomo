import { useCallback } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

/** Matches AccountMenuSheet CARD_RADIUS */
const CARD_RADIUS = 22;
const PRESS_SPRING = { damping: 22, stiffness: 520, mass: 0.45 };

type Props = {
  isDark: boolean;
  busy: boolean;
  onPress: () => void;
};

function useRecessedPress() {
  const press = useSharedValue(0);

  const sink = useCallback(() => {
    press.value = withSpring(1, PRESS_SPRING);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [press]);

  const rise = useCallback(() => {
    press.value = withSpring(0, { damping: 16, stiffness: 280, mass: 0.55 });
  }, [press]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(press.value, [0, 1], [1, 0.96]) },
      { translateY: interpolate(press.value, [0, 1], [0, 2]) },
    ],
  }));

  const insetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(press.value, [0, 1], [0, 1]),
  }));

  return { sink, rise, shellStyle, insetStyle };
}

/**
 * Real-time glass empty slot — BlurView layers matching systemThinMaterial.
 * Layer order (bottom → top) is fixed per product spec.
 */
export function GlassSlot({ isDark, busy, onPress }: Props) {
  const { sink, rise, shellStyle, insetStyle } = useRecessedPress();
  const tint = isDark ? "dark" : "light";
  const androidBlur =
    Platform.OS === "android"
      ? ({ experimentalBlurMethod: "dimezisBlurView" as const })
      : {};

  return (
    <Pressable
      style={styles.fill}
      disabled={busy}
      onPressIn={sink}
      onPressOut={rise}
      onPress={() => {
        rise();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="계정 추가"
    >
      <Animated.View
        style={[
          styles.card,
          {
            shadowOpacity: isDark ? 0.35 : 0.12,
          },
          shellStyle,
        ]}
      >
        {/* Layer 1 — live blur */}
        <BlurView
          intensity={isDark ? 55 : 65}
          tint={tint}
          style={[StyleSheet.absoluteFill, styles.cardClip]}
          {...androidBlur}
        />

        {/* Layer 2 — tint overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(20,22,28,0.35)"
                : "rgba(255,255,255,0.18)",
            },
          ]}
          pointerEvents="none"
        />
        {/* Press darken on Layer 2 (opacity 0 → 1) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(20,22,28,0.45)"
                : "rgba(255,255,255,0.28)",
            },
            insetStyle,
          ]}
          pointerEvents="none"
        />

        {/* Layer 3 — inner highlight border */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.borderHighlight,
            {
              borderColor: isDark
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.55)",
            },
          ]}
        />

        {/* Layer 4 — top sheen (upper 45% only) */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"]
              : ["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]
          }
          locations={[0, 0.45]}
          style={styles.topSheen}
          pointerEvents="none"
        />

        {/* Layer 5 — + glass button */}
        <View style={styles.plusButton}>
          <BlurView
            intensity={40}
            tint={tint}
            style={StyleSheet.absoluteFill}
            {...androidBlur}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.plusBorder,
            ]}
          />
          <Ionicons
            name="add"
            size={26}
            color={isDark ? "#FFFFFF" : "#3A3A3C"}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  card: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  cardClip: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  borderHighlight: {
    borderWidth: 1,
    borderRadius: CARD_RADIUS,
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
  },
  plusButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  plusBorder: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 14,
  },
});
