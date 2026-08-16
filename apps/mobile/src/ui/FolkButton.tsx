import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "ghost";

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FolkButton({
  label,
  variant = "primary",
  loading,
  disabled,
  style,
  ...rest
}: Props) {
  const { colors, isDark } = useTheme();
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const borderCobalt = isDark ? "rgba(107, 163, 232, 0.35)" : "rgba(27, 74, 140, 0.28)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && {
          backgroundColor: colors.terracotta,
          borderColor: isDark ? "rgba(107, 163, 232, 0.18)" : "rgba(27, 74, 140, 0.18)",
          ...shadows.folkSm,
        },
        isSecondary && {
          backgroundColor: colors.surfaceRaised,
          borderColor: borderCobalt,
        },
        variant === "ghost" && {
          backgroundColor: "transparent",
          borderColor: "transparent",
        },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textOnAccent : colors.brand} />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && { color: colors.textOnAccent },
            (isSecondary || variant === "ghost") && { color: colors.brand },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  disabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.98 }] },
  label: { fontSize: 15, fontWeight: "700" },
});
