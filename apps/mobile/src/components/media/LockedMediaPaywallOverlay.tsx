import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label?: string;
  children?: React.ReactNode;
};

export function LockedMediaPaywallOverlay({ label = "결제하기", children }: Props) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Ionicons name="lock-closed" size={28} color="#fff" style={styles.icon} />
      {children ?? <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 12,
    gap: 8,
  },
  icon: {
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  label: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
