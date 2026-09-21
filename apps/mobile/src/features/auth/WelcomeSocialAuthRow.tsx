import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { MobileAuthProvider } from "@/auth/oauth";
import { GoogleIcon } from "@/features/auth/SocialBrandIcons";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  busyProvider: MobileAuthProvider | null;
  disabled?: boolean;
  onPress: (provider: MobileAuthProvider) => void;
  label?: string;
};

/**
 * Google CTA — same rounded-rect language as ID/password fields (not a pill).
 */
export function WelcomeSocialAuthRow({
  busyProvider,
  disabled,
  onPress,
  label = "Google로 계속",
}: Props) {
  const busy = busyProvider === "gmail";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        (disabled || busyProvider !== null) && styles.btnDisabled,
        pressed && !disabled && !busy && styles.btnPressed,
      ]}
      disabled={disabled || busyProvider !== null}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onPress={() => onPress("gmail")}
    >
      {busy ? (
        <ActivityIndicator color="#4285F4" />
      ) : (
        <View style={styles.inner}>
          <GoogleIcon size={20} />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(27, 74, 140, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    letterSpacing: -0.2,
  },
});
