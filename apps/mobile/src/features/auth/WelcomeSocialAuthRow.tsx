import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileAuthProvider } from "@/auth/oauth";
import { GoogleIcon } from "@/features/auth/SocialBrandIcons";

type Props = {
  busyProvider: MobileAuthProvider | null;
  disabled?: boolean;
  onPress: (provider: MobileAuthProvider) => void;
  /** Default: Google로 계속 */
  label?: string;
};

/**
 * Single Google CTA — replaces the old multi-provider icon row.
 * White pill + Google mark + dark label (readable contrast).
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
      style={[styles.btn, (disabled || busyProvider !== null) && styles.btnDisabled]}
      disabled={disabled || busyProvider !== null}
      accessibilityRole="button"
      accessibilityLabel={label}
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
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  btnDisabled: {
    opacity: 0.65,
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
