import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Cream circle on the card’s top-right — removes that selected photo. */
export function AttachSelectionOverlay({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      style={styles.badge}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="remove" size={20} color="#142848" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 240, 232, 0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
});
