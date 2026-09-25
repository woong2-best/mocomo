import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  blockUser,
  deleteOwnPost,
  toggleMuteUser,
  togglePostProfileFeature,
} from "@/api/social";
import { PostReportSheet } from "@/features/feed/PostReportSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type MenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  anchor: MenuAnchor | null;
  postId: string;
  authorId: string;
  authorUsername: string;
  isOwner?: boolean;
  /** Hide pin for anonymous QnA own posts */
  hideProfilePin?: boolean;
  featuredOnProfile?: boolean;
  onFeaturedChange?: (featured: boolean) => void;
  onMuted?: (muted: boolean) => void;
  onBlocked?: () => void;
  onDeleted?: () => void;
};

const MENU_WIDTH = 248;

export function FeedPostOverflowMenu({
  visible,
  onClose,
  anchor,
  postId,
  authorId,
  authorUsername,
  isOwner = false,
  hideProfilePin = false,
  featuredOnProfile = false,
  onFeaturedChange,
  onMuted,
  onBlocked,
  onDeleted,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const [featured, setFeatured] = useState(featuredOnProfile);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (visible) setFeatured(featuredOnProfile);
  }, [featuredOnProfile, visible]);

  const closeAll = useCallback(() => {
    setReportOpen(false);
    onClose();
  }, [onClose]);

  const menuTop = anchor ? anchor.y + anchor.height + 6 : 0;
  const menuLeft = anchor
    ? Math.max(spacing.sm, Math.min(anchor.x + anchor.width - MENU_WIDTH, windowWidth - MENU_WIDTH - spacing.sm))
    : spacing.sm;

  const onFeature = useCallback(async () => {
    if (busy) return;
    setBusy("feature");
    try {
      const res = await togglePostProfileFeature(postId);
      setFeatured(res.featured);
      onFeaturedChange?.(res.featured);
      closeAll();
      Alert.alert(
        res.featured ? "프로필 메인에 올렸습니다" : "프로필 메인에서 내렸습니다"
      );
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [busy, closeAll, onFeaturedChange, postId]);

  const onDelete = useCallback(() => {
    if (busy) return;
    Alert.alert("게시물 삭제", "이 게시물을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제하기",
        style: "destructive",
        onPress: () => {
          setBusy("delete");
          void (async () => {
            try {
              await deleteOwnPost(postId);
              closeAll();
              onDeleted?.();
              Alert.alert("삭제했습니다");
            } catch (e) {
              Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했습니다.");
            } finally {
              setBusy(null);
            }
          })();
        },
      },
    ]);
  }, [busy, closeAll, onDeleted, postId]);

  const onQuiet = useCallback(async () => {
    if (busy) return;
    setBusy("quiet");
    try {
      const res = await toggleMuteUser(authorId, authorUsername);
      setMuted(res.muted);
      onMuted?.(res.muted);
      closeAll();
      Alert.alert(res.muted ? "Quiet로 설정했습니다" : "Quiet을 해제했습니다");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [authorId, authorUsername, busy, closeAll, onMuted]);

  const onBlock = useCallback(() => {
    if (busy) return;
    Alert.alert("차단하기", `@${authorUsername} 님을 차단할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "차단하기",
        style: "destructive",
        onPress: () => {
          setBusy("block");
          void (async () => {
            try {
              await blockUser(authorId);
              closeAll();
              onBlocked?.();
              Alert.alert("차단했습니다");
            } catch (e) {
              Alert.alert("오류", e instanceof Error ? e.message : "차단에 실패했습니다.");
            } finally {
              setBusy(null);
            }
          })();
        },
      },
    ]);
  }, [authorId, authorUsername, busy, closeAll, onBlocked]);

  const openReport = useCallback(() => {
    setReportOpen(true);
  }, []);

  return (
    <>
      <Modal visible={visible && !reportOpen} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.scrim} onPress={closeAll}>
          {anchor ? (
            <View
              style={[styles.menu, { top: menuTop, left: menuLeft, width: MENU_WIDTH }]}
              onStartShouldSetResponder={() => true}
            >
              {isOwner ? (
                <>
                  <Pressable style={styles.row} onPress={onDelete} disabled={!!busy}>
                    <Ionicons name="trash-outline" size={18} color={colors.terracotta} />
                    <Text style={[styles.rowText, styles.dangerText]}>삭제하기</Text>
                    {busy === "delete" ? (
                      <ActivityIndicator size="small" color={colors.terracotta} />
                    ) : null}
                  </Pressable>
                  {!hideProfilePin ? (
                    <>
                      <View style={styles.sep} />
                      <Pressable style={styles.row} onPress={() => void onFeature()} disabled={!!busy}>
                        <Ionicons name={featured ? "pin-outline" : "pin"} size={18} color={colors.text} />
                        <Text style={styles.rowText}>
                          {featured ? "프로필 메인에서 내리기" : "내 프로필 메인에 올리기"}
                        </Text>
                        {busy === "feature" ? (
                          <ActivityIndicator size="small" color={colors.cobalt} />
                        ) : null}
                      </Pressable>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <Pressable style={styles.row} onPress={() => void onFeature()} disabled={!!busy}>
                    <Ionicons name={featured ? "pin-outline" : "pin"} size={18} color={colors.text} />
                    <Text style={styles.rowText}>
                      {featured ? "프로필 메인에서 내리기" : "내 프로필 메인에 올리기"}
                    </Text>
                    {busy === "feature" ? (
                      <ActivityIndicator size="small" color={colors.cobalt} />
                    ) : null}
                  </Pressable>
                  <View style={styles.sep} />
                  <Pressable style={styles.row} onPress={() => void onQuiet()} disabled={!!busy}>
                    <Ionicons
                      name={muted ? "volume-high-outline" : "volume-mute-outline"}
                      size={18}
                      color={colors.text}
                    />
                    <Text style={styles.rowText}>{muted ? "Unquiet" : "Quiet"}</Text>
                    {busy === "quiet" ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
                  </Pressable>
                  <View style={styles.sep} />
                  <Pressable style={styles.row} onPress={openReport} disabled={!!busy}>
                    <Ionicons name="flag-outline" size={18} color={colors.text} />
                    <Text style={styles.rowText}>신고하기</Text>
                  </Pressable>
                  <Pressable style={styles.row} onPress={onBlock} disabled={!!busy}>
                    <Ionicons name="ban-outline" size={18} color={colors.terracotta} />
                    <Text style={[styles.rowText, styles.dangerText]}>차단하기</Text>
                    {busy === "block" ? (
                      <ActivityIndicator size="small" color={colors.terracotta} />
                    ) : null}
                  </Pressable>
                </>
              )}
            </View>
          ) : null}
        </Pressable>
      </Modal>

      <PostReportSheet
        visible={reportOpen}
        onClose={closeAll}
        postId={postId}
        authorId={authorId}
        authorUsername={authorUsername}
        mode="report"
      />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    menu: {
      position: "absolute",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 4,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: spacing.md,
    },
    rowText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
    dangerText: { color: colors.terracotta },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
  });
}
