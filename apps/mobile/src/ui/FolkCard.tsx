import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing } from "@/theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  raised?: boolean;
};

export function FolkCard({ children, style, padded = true, raised = true }: Props) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: isDark ? "rgba(107, 163, 232, 0.28)" : "rgba(27, 74, 140, 0.22)",
        },
        padded && styles.padded,
        raised && shadows.folkSm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 2,
    overflow: "hidden",
  },
  padded: {
    padding: spacing.md,
  },
});
