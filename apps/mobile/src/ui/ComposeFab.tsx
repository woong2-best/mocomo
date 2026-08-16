import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { useTheme } from "@/theme/ThemeContext";
import { shadows } from "@/theme/tokens";

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Compose FAB above floating tab bar. */
export function ComposeFab({ onPress, icon = "add" }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bottom = floatingTabClearance(insets.bottom) + 8;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="새 글"
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.fab },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name={icon} size={28} color={colors.textOnAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 18,
    zIndex: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.fab,
  },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.92 },
});
