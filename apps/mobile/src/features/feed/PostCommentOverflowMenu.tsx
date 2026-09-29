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
      showIslandSuccess("신고 접수", "운영진이 검토합니다.");
      closeAll();
    } catch (err) {
      showIslandError("신고 실패", err instanceof Error ? err.message : "다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function onBlock() {
    if (busy) return;
    setBusy("block");
    try {
      await blockUser(authorId);
      showIslandSuccess("차단됨", `@${authorUsername} 님을 차단했습니다.`);
      closeAll();
    } catch (err) {
      showIslandError("차단 실패", err instanceof Error ? err.message : "다시 시도해 주세요.");
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
              <Text style={styles.title}>@{authorUsername} 님을 차단할까요?</Text>
              <Text style={styles.hint}>차단하면 서로의 게시물과 댓글이 보이지 않습니다.</Text>
              <View style={styles.row}>
                <Pressable style={styles.secondaryBtn} onPress={() => setConfirmBlock(false)}>
                  <Text style={styles.secondaryLabel}>취소</Text>
                </Pressable>
                <Pressable style={styles.dangerBtn} onPress={() => void onBlock()} disabled={!!busy}>
                  {busy === "block" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.dangerLabel}>차단</Text>
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
                    <Text style={styles.menuLabel}>신고</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={styles.menuRow}
                onPress={() => setConfirmBlock(true)}
                disabled={!!busy}
              >
                <Ionicons name="ban-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuLabel, { color: colors.danger }]}>차단</Text>
              </Pressable>
              <Pressable style={styles.cancelRow} onPress={closeAll}>
                <Text style={styles.cancelLabel}>닫기</Text>
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
