import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { InlineComposeBox } from "@/features/compose/InlineComposeBox";
import { useTheme } from "@/theme/ThemeContext";
import { IslandToastScreenSlot, showIslandToast } from "@/ui/IslandToast";
import { spacing, type ThemeColors } from "@/theme/tokens";

/** Full-screen compose modal — same composer as the feed strip. */
export function ComposeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <View style={styles.flex}>
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + spacing.sm }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : insets.top}
    >
      <View style={styles.titleRow}>
        {navigation.canGoBack() ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel="뒤로"
          >
            <Ionicons name="chevron-back" size={26} color={colors.brand} />
          </Pressable>
        ) : (
          <View style={styles.backHit} />
        )}
        <Text style={styles.title}>새 게시물</Text>
        <View style={styles.backHit} />
      </View>
      <InlineComposeBox
        avatarUrl={user?.image}
        avatarLetter={(user?.name || user?.username || "?").slice(0, 1).toUpperCase()}
        onPosted={() => {
          showIslandToast("Posted", "게시물이 업로드되었습니다.");
          if (navigation.canGoBack()) navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
    <IslandToastScreenSlot />
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    backHit: {
      width: 40,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "800",
      color: colors.brand,
    },
  });
}
