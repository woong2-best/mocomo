import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { togglePostRepost } from "@/api/social";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { MenuAnchor } from "@/features/feed/FeedPostOverflowMenu";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
  anchor: MenuAnchor | null;
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
  reposted: boolean;
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onRepostChange: (reposted: boolean, repostCount: number) => void;
  repostCount: number;
  requireLogin: () => boolean;
};

const MENU_WIDTH = 176;
const MENU_EST_HEIGHT = 96;

export function FeedPostRepostMenu({
  visible,
  onClose,
  anchor,
  postId,
  authorUsername,
  title,
  content,
  reposted,
  busy = false,
  onBusyChange,
  onRepostChange,
  repostCount,
  requireLogin,
}: Props) {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const close = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const menuTop = anchor ? Math.max(spacing.sm, anchor.y - MENU_EST_HEIGHT - 10) : 0;
  const menuLeft = anchor
    ? Math.max(
        spacing.sm,
        Math.min(anchor.x + anchor.width / 2 - MENU_WIDTH / 2, windowWidth - MENU_WIDTH - spacing.sm)
      )
    : spacing.sm;

  const toggleRepost = useCallback(() => {
    if (!requireLogin() || busy) return;
    const prevReposted = reposted;
    const prevCount = repostCount;
    onRepostChange(!prevReposted, Math.max(0, prevCount + (prevReposted ? -1 : 1)));
    onBusyChange?.(true);
    onClose();
    void togglePostRepost(postId)
      .then((res) => {
        onRepostChange(res.reposted, res.repostCount);
        void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
        void queryClient.invalidateQueries({ queryKey: ["mobile-user"] });
      })
      .catch(() => {
        onRepostChange(prevReposted, prevCount);
        showIslandError(t("m.feed.repost"), t("m.feed.could_not_repost"));
      })
      .finally(() => {
        onBusyChange?.(false);
      });
  }, [
    busy,
    onBusyChange,
    onClose,
    onRepostChange,
    postId,
    repostCount,
    reposted,
    queryClient,
    requireLogin,
  ]);

  const quotePost = useCallback(() => {
    if (!requireLogin()) return;
    onClose();
    const preview = title?.trim() || content?.trim().replace(/\s+/g, " ").slice(0, 80) || t("m.common.post");
    navigation.navigate("ComposeModal", {
      initialTitle: t("m.feed.quote"),
      quotedPostId: postId,
      quotedAuthorUsername: authorUsername,
    });
  }, [authorUsername, content, navigation, onClose, postId, requireLogin, title]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        {anchor ? (
          <View
            style={[styles.menu, { top: menuTop, left: menuLeft, width: MENU_WIDTH }]}
            onStartShouldSetResponder={() => true}
          >
            <Pressable style={styles.row} onPress={toggleRepost} disabled={busy}>
              <Ionicons name="repeat-outline" size={18} color={colors.terracotta} />
              <Text style={styles.rowText}>{reposted ? t("m.feed.undo_repost") : t("m.feed.repost")}</Text>
              {busy ? <ActivityIndicator size="small" color={colors.terracotta} /> : null}
            </Pressable>
            <Pressable style={styles.row} onPress={quotePost} disabled={busy}>
              <Ionicons name="create-outline" size={18} color={colors.terracotta} />
              <Text style={styles.rowText}>{t("m.feed.quote_post")}</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    menu: {
      position: "absolute",
      backgroundColor: isDark ? colors.surfaceRaised : colors.surfaceRaised,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderColor: isDark ? "rgba(107, 163, 232, 0.35)" : colors.border,
      paddingVertical: 6,
      paddingHorizontal: 4,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
    },
    rowText: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
