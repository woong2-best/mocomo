import { useEffect, useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onConfirmHide: () => void;
};

export function SellButtonTrashOverlay({ visible, onDismiss, onConfirmHide }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shake.value = 0;
    shake.value = withSequence(
      withSpring(-6, { damping: 4, stiffness: 380 }),
      withSpring(6, { damping: 4, stiffness: 380 }),
      withSpring(0, { damping: 8, stiffness: 220 })
    );
  }, [shake, visible]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  async function confirmHide() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onConfirmHide();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="닫기" />
        <Animated.View
          entering={ZoomIn.springify().damping(14).stiffness(180)}
          exiting={ZoomOut.duration(160)}
          style={fabStyle}
        >
          <Pressable
            style={styles.fab}
            onPress={() => void confirmHide()}
            accessibilityLabel="판매 버튼 숨기기"
          >
            <Ionicons name="trash" size={28} color="#fff" />
            <Text style={styles.fabLabel}>판매 버튼 숨기기</Text>
          </Pressable>
        </Animated.View>
        <View pointerEvents="none" style={styles.hintWrap}>
          <Text style={styles.hint}>버튼을 숨기면 설정 → 메시지에서 다시 켤 수 있어요</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.48)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    fab: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      width: 124,
      height: 124,
      borderRadius: 62,
      backgroundColor: colors.danger,
      shadowColor: "#000",
      shadowOpacity: 0.28,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    fabLabel: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
      paddingHorizontal: 8,
    },
    hintWrap: {
      position: "absolute",
      bottom: "22%",
      paddingHorizontal: spacing.xl,
    },
    hint: {
      color: "rgba(255,255,255,0.88)",
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 18,
    },
  });
}
