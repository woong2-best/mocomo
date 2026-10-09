import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resetFeedPostOffset } from "@/features/feed/feed-post-offset";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { InlineComposeBox } from "@/features/compose/InlineComposeBox";
import { useKeyboardLift } from "@/lib/use-keyboard-inset";
import { useTheme } from "@/theme/ThemeContext";
import { IslandToastScreenSlot, showIslandToast } from "@/ui/IslandToast";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

/** Full-screen compose modal — same composer as the feed strip. */
export function ComposeScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { keyboardLift } = useKeyboardLift();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "ComposeModal">>();
  const initialContent = route.params?.initialContent;
  const quotedPostId = route.params?.quotedPostId;
  const quotedAuthorUsername = route.params?.quotedAuthorUsername;
  const quotedPreview = route.params?.quotedPreview;
  const screenTitle = route.params?.initialTitle?.trim() || t("m.compose.new_post");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return (
    <View style={styles.flex}>
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: Platform.OS === "android" ? keyboardLift : 0,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.titleRow}>
        {navigation.canGoBack() ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="chevron-back" size={26} color={colors.brand} />
          </Pressable>
        ) : (
          <View style={styles.backHit} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {screenTitle}
        </Text>
        <View style={styles.backHit} />
      </View>
      <InlineComposeBox
        avatarUrl={user?.image}
        avatarLetter={(user?.name || user?.username || "?").slice(0, 1).toUpperCase()}
        initialContent={initialContent}
        quotedPostId={quotedPostId}
        quotedAuthorUsername={quotedAuthorUsername}
        quotedPreview={quotedPreview}
        autoFocus={!!initialContent || !!quotedPostId}
        onPosted={async () => {
          resetFeedPostOffset();
          await queryClient.resetQueries({ queryKey: ["mobile-feed"] });
          showIslandToast(t("toast.published"), t("m.compose.your_post_was_uploaded"));
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
