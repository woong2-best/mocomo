import { useMemo } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { InlineComposeBox } from "@/features/compose/InlineComposeBox";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

/** Full-screen compose modal — same composer as the feed strip. */
export function ComposeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + spacing.sm }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : insets.top}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>새 게시물</Text>
        {navigation.canGoBack() ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.close}>닫기</Text>
          </Pressable>
        ) : null}
      </View>
      <InlineComposeBox
        avatarUrl={user?.image}
        avatarLetter={(user?.name || user?.username || "?").slice(0, 1).toUpperCase()}
        onPosted={() => {
          Alert.alert("게시됨", "게시물이 업로드되었습니다.", [
            {
              text: "확인",
              onPress: () => {
                if (navigation.canGoBack()) navigation.goBack();
              },
            },
          ]);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.brand },
    close: { fontSize: 15, fontWeight: "700", color: colors.terracotta },
  });
}
