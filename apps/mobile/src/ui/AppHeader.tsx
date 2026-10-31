import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, typography } from "@/theme/tokens";

type Props = {
  title?: string;
  /** Default center; use left for long titles beside the back button (ellipsis before right actions). */
  titleAlign?: "center" | "left";
  leftLabel?: string;
  onLeftPress?: () => void;
  leftSlot?: React.ReactNode;
  /** Replaces the centered title — used when the header itself is the search field. */
  centerSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  safe?: boolean;
  border?: boolean;
};

/** Folk chrome header — cream/navy surface, brand title. */
export function AppHeader({
  title,
  titleAlign = "center",
  leftLabel,
  onLeftPress,
  leftSlot,
  centerSlot,
  rightSlot,
  style,
  // Screen already pads status-bar inset by default — keep false to avoid double gap.
  safe = false,
  border = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();
  const backA11y = leftLabel ?? t("common.back");

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
        {titleAlign === "left" && !centerSlot ? (
          <>
            <View style={styles.leading}>
              {leftSlot
                ? leftSlot
                : onLeftPress
                  ? (
                      <Pressable
                        onPress={onLeftPress}
                        hitSlop={12}
                        style={styles.backHit}
                        accessibilityRole="button"
                        accessibilityLabel={backA11y}
                      >
                        <Ionicons name="chevron-back" size={26} color={colors.brand} />
                      </Pressable>
                    )
                  : null}
            </View>
            <Text
              style={[styles.titleLeft, { color: colors.brand }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {rightSlot ? <View style={styles.trailing}>{rightSlot}</View> : null}
          </>
        ) : (
          <>
            <View style={centerSlot ? styles.sideCompact : styles.side}>
              {leftSlot
                ? leftSlot
                : onLeftPress
                  ? (
                      <Pressable
                        onPress={onLeftPress}
                        hitSlop={12}
                        style={styles.backHit}
                        accessibilityRole="button"
                        accessibilityLabel={backA11y}
                      >
                        <Ionicons name="chevron-back" size={26} color={colors.brand} />
                      </Pressable>
                    )
                  : null}
            </View>
            {centerSlot ? (
              <View style={styles.centerFill}>{centerSlot}</View>
            ) : (
              <Text style={[styles.title, { color: colors.brand }]} numberOfLines={1}>
                {title}
              </Text>
            )}
            {centerSlot && !rightSlot ? null : (
              <View style={[styles.side, styles.sideRight]}>{rightSlot}</View>
            )}
          </>
        )}
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
  sideCompact: { justifyContent: "center", marginRight: 4 },
  sideRight: { alignItems: "flex-end" },
  centerFill: { flex: 1, minWidth: 0 },
  backHit: { marginLeft: -6, padding: 2 },
  leading: { flexShrink: 0 },
  trailing: { flexShrink: 0, marginLeft: spacing.xs },
  titleLeft: {
    flex: 1,
    minWidth: 0,
    marginLeft: 2,
    textAlign: "left",
    ...typography.title,
  },
  title: {
    flex: 1,
    textAlign: "center",
    ...typography.title,
  },
});
