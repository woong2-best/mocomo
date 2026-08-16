import { forwardRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeContext";
import { radii } from "@/theme/tokens";

type Props = TextInputProps & {
  onClear?: () => void;
  containerStyle?: object;
  /** Rounded pill for feed header (X-style). */
  variant?: "default" | "pill";
};

/** Folk search field — theme-aware. */
export const SearchField = forwardRef<TextInput, Props>(function SearchField(
  { onClear, containerStyle, value, style, variant = "default", ...rest },
  ref
) {
  const { colors, isDark } = useTheme();
  const pill = variant === "pill";
  return (
    <View
      style={[
        styles.wrap,
        pill && styles.pill,
        {
          backgroundColor: isDark ? colors.searchFill : colors.surfaceRaised,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(27, 74, 140, 0.55)",
        },
        containerStyle,
      ]}
    >
      <Ionicons
        name="search"
        size={18}
        color={isDark ? colors.textMuted : colors.brand}
        style={styles.icon}
      />
      <TextInput
        ref={ref}
        placeholder="검색"
        placeholderTextColor={colors.textMuted}
        value={value}
        style={[styles.input, { color: colors.text }, style]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        {...rest}
      />
      {value && onClear ? (
        <Pressable onPress={onClear} hitSlop={8} style={styles.clear}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
});

/**
 * Header search affordance (web HeaderSearch look):
 * bordered pill with magnifier + "검색", navigates on press.
 */
export function SearchFieldButton({
  onPress,
  label = "검색",
}: {
  onPress: () => void;
  label?: string;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.wrap,
        styles.headerSearch,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: isDark ? "rgba(107, 163, 232, 0.45)" : "rgba(27, 74, 140, 0.55)",
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name="search" size={18} color={colors.brand} style={styles.icon} />
      <Text style={[styles.placeholder, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.md,
    minHeight: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  pill: {
    borderRadius: 999,
    minHeight: 38,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerSearch: {
    flex: 1,
    minHeight: 38,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 8,
  },
  clear: { marginLeft: 4 },
});
