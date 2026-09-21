import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  onPress: () => void;
  disabled?: boolean;
  size?: number;
};

/** Chzzk-cheese analogue — bright MOCO coin for live tips / cheer. */
function MocoTipButtonInner({ onPress, disabled, size = 40 }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="MOCO 후원"
      disabled={disabled}
      onPress={onPress}
      style={[styles.hit, { width: size, height: size, opacity: disabled ? 0.45 : 1 }]}
    >
      <View style={[styles.coin, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Text style={[styles.text, { fontSize: Math.max(9, size * 0.22) }]}>MOCO</Text>
      </View>
    </Pressable>
  );
}

export const MocoTipButton = memo(MocoTipButtonInner);

const styles = StyleSheet.create({
  hit: { alignItems: "center", justifyContent: "center" },
  coin: {
    backgroundColor: "#F5C518",
    borderWidth: 2,
    borderColor: "#E8A317",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  text: {
    color: "#1a1200",
    fontWeight: "900",
    letterSpacing: -0.3,
  },
});
