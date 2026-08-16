import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Pad below the system status bar. Default true.
   * Set false when the screen already applies insets.top itself
   * (e.g. Feed / Messages custom headers).
   */
  safeTop?: boolean;
  /** Pad above the home indicator. Default false — tabs/lists usually handle bottom. */
  safeBottom?: boolean;
};

export function Screen({
  children,
  style,
  safeTop = true,
  safeBottom = false,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: safeTop ? insets.top : 0,
          paddingBottom: safeBottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
