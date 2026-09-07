import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

/** NSFW toggle — rounded rect, no PNG background artifacts */
export function NsfwToggleButton({ active, onToggle, disabled }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityLabel="NSFW"
      accessibilityRole="button"
      accessibilityState={{ checked: active }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        !active && styles.btnOff,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <Text style={styles.text}>NSFW</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 28,
    minWidth: 50,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#e84545",
    alignItems: "center",
    justifyContent: "center",
  },
  btnOff: { opacity: 0.42 },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.9 },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
