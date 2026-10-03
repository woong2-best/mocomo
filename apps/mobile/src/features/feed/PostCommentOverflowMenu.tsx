import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { blockUser, submitCommentReport } from "@/api/social";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  commentId: string;
  authorId: string;
  authorUsername: string;
  isOwnComment?: boolean;
};

export function PostCommentOverflowMenu({
  visible,
  onClose,
  postId,
  commentId,
  authorId,
  authorUsername,
  isOwnComment = false,
}: Props) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState<"report" | "block" | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const closeAll = useCallback(() => {
    setConfirmBlock(false);
    onClose();
  }, [onClose]);

  async function onReport() {
    if (busy) return;
    setBusy("report");
    try {
      await submitCommentReport({
        postId,
        commentId,
        reportedUserId: authorId,
        reason: "SPAM",
      });
      showIslandSuccess(t("m.feed.report_submitted"), t("m.feed.our_team_will_review_it"));
      closeAll();
    } catch (err) {
      showIslandError(t("m.feed.report_failed"), err instanceof Error ? err.message : t("toast.retry"));
    } finally {
      setBusy(null);
    }
  }

  async function onBlock() {
    if (busy) return;
    setBusy("block");
    try {
      await blockUser(authorId);
      void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-post", postId] });
      showIslandSuccess(t("m.feed.blocked"), t("m.feed.blocked_authorusername", { authorUsername: String(authorUsername) }));
      closeAll();
    } catch (err) {
      showIslandError(t("m.feed.block_failed"), err instanceof Error ? err.message : t("toast.retry"));
    } finally {
      setBusy(null);
    }
  }

  if (isOwnComment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeAll}>
      <Pressable style={styles.backdrop} onPress={closeAll}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {confirmBlock ? (
            <>
              <Text style={styles.title}>{t("m.feed.block_authorusername", { authorUsername: String(authorUsername) })}</Text>
              <Text style={styles.hint}>{t("m.feed.you_won_t_see_each_other")}</Text>
              <View style={styles.row}>
                <Pressable style={styles.secondaryBtn} onPress={() => setConfirmBlock(false)}>
                  <Text style={styles.secondaryLabel}>{t("toast.cancel")}</Text>
                </Pressable>
                <Pressable style={styles.dangerBtn} onPress={() => void onBlock()} disabled={!!busy}>
                  {busy === "block" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.dangerLabel}>{t("m.common.block")}</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Pressable
                style={styles.menuRow}
                onPress={() => void onReport()}
                disabled={!!busy}
              >
                {busy === "report" ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="flag-outline" size={20} color={colors.text} />
                    <Text style={styles.menuLabel}>{t("post.menu.report")}</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={styles.menuRow}
                onPress={() => setConfirmBlock(true)}
                disabled={!!busy}
              >
                <Ionicons name="ban-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuLabel, { color: colors.danger }]}>{t("m.common.block")}</Text>
              </Pressable>
              <Pressable style={styles.cancelRow} onPress={closeAll}>
                <Text style={styles.cancelLabel}>{t("common.close")}</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: 4,
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    menuLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
    cancelRow: { paddingVertical: 16, alignItems: "center" },
    cancelLabel: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
    title: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 8 },
    hint: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
    row: { flexDirection: "row", gap: spacing.sm },
    secondaryBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    secondaryLabel: { fontWeight: "700", color: colors.text },
    dangerBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radii.md,
      backgroundColor: colors.danger,
      alignItems: "center",
    },
    dangerLabel: { fontWeight: "700", color: "#fff" },
  });
}
