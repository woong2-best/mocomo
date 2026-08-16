import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, typography } from "@/theme/tokens";

type Props = {
  title: string;
  leftLabel?: string;
  onLeftPress?: () => void;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  safe?: boolean;
  border?: boolean;
};

/** Folk chrome header — cream/navy surface, brand title. */
export function AppHeader({
  title,
  leftLabel,
  onLeftPress,
  leftSlot,
  rightSlot,
  style,
  // Screen already pads status-bar inset by default — keep false to avoid double gap.
  safe = false,
  border = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surfaceRaised },
        border && { borderBottomWidth: 2, borderBottomColor: colors.hairline },
        safe && { paddingTop: insets.top + spacing.xs },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {leftSlot
            ? leftSlot
            : leftLabel && onLeftPress
              ? (
                  <Pressable onPress={onLeftPress} hitSlop={12} style={styles.backHit}>
                    <Ionicons name="chevron-back" size={26} color={colors.brand} />
                  </Pressable>
                )
              : null}
        </View>
        <Text style={[styles.title, { color: colors.brand }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.sideRight]}>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  row: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  side: { width: 72, justifyContent: "center" },
  sideRight: { alignItems: "flex-end" },
  backHit: { marginLeft: -6, padding: 2 },
  title: {
    flex: 1,
    textAlign: "center",
    ...typography.title,
  },
});
