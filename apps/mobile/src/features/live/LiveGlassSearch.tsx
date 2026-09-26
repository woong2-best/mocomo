import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const COLLAPSED = 42;
const SLIDE_MS = 280;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  expandedWidth: number;
};

export function LiveGlassSearch({ value, onChangeText, expandedWidth }: Props) {
  const inputRef = useRef<TextInput>(null);
  const open = useSharedValue(0);
  const [openUi, setOpenUi] = useState(false);

  const barStyle = useAnimatedStyle(() => ({
    width: interpolate(open.value, [0, 1], [COLLAPSED, expandedWidth], Extrapolation.CLAMP),
  }));

  const fieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0.42, 0.78], [0, 1], Extrapolation.CLAMP),
  }));

  const expand = (next: boolean) => {
    setOpenUi(next);
    open.value = withTiming(next ? 1 : 0, {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });
    if (next) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => inputRef.current?.focus(), 180);
    } else {
      inputRef.current?.blur();
    }
  };

  return (
    <Animated.View style={[styles.shell, barStyle]}>
      <View style={styles.clip}>
      <BlurView
        intensity={48}
        tint="dark"
        {...(Platform.OS === "android" ? { experimentalBlurMethod: "dimezisBlurView" as const } : {})}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tint} pointerEvents="none" />
      <LinearGradient
        colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
        style={styles.sheen}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.field, fieldStyle]}
        pointerEvents={openUi ? "auto" : "none"}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="닉네임, 제목"
          placeholderTextColor="rgba(255,255,255,0.55)"
          style={[styles.input, openUi && value.length > 0 ? styles.inputWithClear : null]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor="#8EB4FF"
        />
      </Animated.View>
      {openUi && value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={styles.clear}
          accessibilityLabel="검색어 지우기"
        >
          <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.75)" />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => expand(!openUi)}
        hitSlop={8}
        style={styles.iconHit}
        accessibilityRole="button"
        accessibilityLabel={openUi ? "검색 닫기" : "검색"}
      >
        <Ionicons name="search" size={20} color="#FFFFFF" />
        {!openUi && value.length > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: COLLAPSED,
    shadowColor: "#9EC0FF",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  clip: {
    flex: 1,
    overflow: "hidden",
    borderRadius: COLLAPSED / 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7EB0FF",
  },
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 24, 38, 0.42)",
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 6,
    right: 6,
    height: 14,
    borderRadius: 10,
  },
  iconHit: {
    position: "absolute",
    right: 0,
    top: 0,
    width: COLLAPSED,
    height: COLLAPSED,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
  },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 0,
    paddingLeft: 16,
    paddingRight: COLLAPSED,
  },
  inputWithClear: {
    paddingRight: COLLAPSED + 28,
  },
  clear: {
    position: "absolute",
    right: COLLAPSED - 4,
    top: 0,
    width: 32,
    height: COLLAPSED,
    alignItems: "center",
    justifyContent: "center",
  },
});
