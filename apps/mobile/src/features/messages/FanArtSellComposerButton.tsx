import { useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const HOLD_MS = 2000;
const RING_SIZE = 48;
const STROKE = 3;
const R = (RING_SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

type Props = {
  disabled?: boolean;
  onPress: () => void;
  onHoldComplete: () => void;
};

export function FanArtSellComposerButton({ disabled, onPress, onHoldComplete }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const holdProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  const holdCompletedRef = useRef(false);

  const triggerHoldComplete = useCallback(() => {
    holdCompletedRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onHoldComplete();
  }, [onHoldComplete]);

  const onPressIn = useCallback(() => {
    if (disabled) return;
    holdCompletedRef.current = false;
    scale.value = withSpring(0.92, { damping: 14, stiffness: 280 });
    cancelAnimation(holdProgress);
    holdProgress.value = 0;
    holdProgress.value = withTiming(1, { duration: HOLD_MS }, (finished) => {
      if (finished) runOnJS(triggerHoldComplete)();
    });
  }, [disabled, holdProgress, scale, triggerHoldComplete]);

  const onPressOut = useCallback(() => {
    cancelAnimation(holdProgress);
    holdProgress.value = withTiming(0, { duration: 180 });
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  }, [holdProgress, scale]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - holdProgress.value),
  }));

  const handlePress = useCallback(() => {
    if (holdCompletedRef.current) {
      holdCompletedRef.current = false;
      return;
    }
    onPress();
  }, [onPress]);

  return (
    <Pressable
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      accessibilityLabel="팬아트 판매"
      accessibilityHint="길게 누르면 판매 버튼을 숨길 수 있습니다"
    >
      <Animated.View style={[styles.wrap, btnStyle]}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={R}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={R}
            stroke="#fff"
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${C} ${C}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            animatedProps={ringProps}
          />
        </Svg>
        <View style={styles.iconCore}>
          <Ionicons name="cash" size={18} color="#fff" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    ring: {
      position: "absolute",
    },
    iconCore: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
