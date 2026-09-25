import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function MarketCheckOption({
  label,
  checked,
  onPress,
  ink,
  paper,
  line,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  ink: string;
  paper: string;
  line: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View
        style={[
          styles.box,
          { borderColor: line, backgroundColor: paper },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={15} color={ink} /> : null}
      </View>
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingRight: 14,
  },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontWeight: "600", fontSize: 14 },
});
