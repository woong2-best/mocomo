import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { Ionicons } from "@expo/vector-icons";
import {
  blockUser,
  deleteOwnPost,
  toggleMuteUser,
  togglePostProfileFeature,
} from "@/api/social";
import { PostReportSheet } from "@/features/feed/PostReportSheet";
import { useI18n } from "@/i18n/I18nProvider";
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
  /** Owner pin labels (vs “profile main” for others’ posts). */
  ownerPinLabels?: boolean;
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
  ownerPinLabels = false,
  onFeaturedChange,
  onMuted,
  onBlocked,
  onDeleted,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const [featured, setFeatured] = useState(featuredOnProfile);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirm, setConfirm] = useState<"block" | null>(null);

  useEffect(() => {
    if (visible) setFeatured(featuredOnProfile);
  }, [featuredOnProfile, visible]);

  const closeAll = useCallback(() => {
    setReportOpen(false);
    setConfirm(null);
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
      showIslandSuccess(
        res.featured
          ? ownerPinLabels
            ? t("m.feed.pinned_to_your_profile")
            : t("m.feed.pinned_to_profile_main")
          : ownerPinLabels
            ? t("m.feed.unpinned_from_profile")
            : t("m.feed.removed_from_profile_main")
      );
    } catch (e) {
      showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.common.something_went_wrong"));
    } finally {
      setBusy(null);
    }
  }, [busy, closeAll, onFeaturedChange, postId]);

  const runDelete = useCallback(() => {
    if (busy) return;
    setBusy("delete");
    void (async () => {
      try {
        await deleteOwnPost(postId);
        closeAll();
        onDeleted?.();
        showIslandSuccess(t("toast.deleted"));
      } catch (e) {
        showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("post.menu.deleteFailed"));
      } finally {
        setBusy(null);
      }
    })();
  }, [busy, closeAll, onDeleted, postId]);

  const onQuiet = useCallback(async () => {
    if (busy) return;
    setBusy("quiet");
    try {
      const res = await toggleMuteUser(authorId, authorUsername);
      setMuted(res.muted);
      onMuted?.(res.muted);
      closeAll();
      showIslandSuccess(res.muted ? t("post.menu.mutedToast") : t("post.menu.unmutedToast"));
    } catch (e) {
      showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.common.something_went_wrong"));
    } finally {
      setBusy(null);
    }
  }, [authorId, authorUsername, busy, closeAll, onMuted]);

  const runBlock = useCallback(() => {
    if (busy) return;
    setBusy("block");
    void (async () => {
      try {
        await blockUser(authorId);
        closeAll();
        onBlocked?.();
        showIslandSuccess(t("m.common.user_blocked"));
      } catch (e) {
        showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.common.could_not_block_user"));
      } finally {
        setBusy(null);
      }
    })();
  }, [authorId, busy, closeAll, onBlocked]);

  const onBlock = useCallback(() => {
    if (busy) return;
    setConfirm("block");
  }, [busy]);

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
              {confirm === "block" ? (
                <>
                  <Text style={styles.confirmTitle}>{t("m.common.block")}</Text>
                  <Text style={styles.confirmBody}>
                    {t("m.feed.block_authorusername", { authorUsername: String(authorUsername) })}
                  </Text>
                  <Pressable style={styles.row} onPress={runBlock} disabled={!!busy}>
                    <Ionicons name="ban-outline" size={18} color={colors.terracotta} />
                    <Text style={[styles.rowText, styles.dangerText]}>{t("m.common.block")}</Text>
                    {busy === "block" ? (
                      <ActivityIndicator size="small" color={colors.terracotta} />
                    ) : null}
                  </Pressable>
                  <Pressable style={styles.row} onPress={() => setConfirm(null)}>
                    <Text style={styles.rowText}>{t("toast.cancel")}</Text>
                  </Pressable>
                </>
              ) : isOwner ? (
                <>
                  <Pressable style={styles.row} onPress={runDelete} disabled={!!busy}>
                    <Ionicons name="trash-outline" size={18} color={colors.terracotta} />
                    <Text style={[styles.rowText, styles.dangerText]}>{t("post.menu.delete")}</Text>
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
                          {featured
                            ? ownerPinLabels
                              ? t("m.feed.unpin_from_profile")
                              : t("m.feed.remove_from_profile_main")
                            : ownerPinLabels
                              ? t("m.feed.pin_to_profile")
                              : t("m.feed.pin_to_my_profile_main")}
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
                      {featured
                        ? t("m.feed.remove_from_profile_main")
                        : t("m.feed.pin_to_my_profile_main")}
                    </Text>
                    {busy === "feature" ? (
                      <ActivityIndicator size="small" color={colors.cobalt} />
                    ) : null}
                  </Pressable>
                  <View style={styles.sep} />
                  <Pressable style={styles.row} onPress={() => void onQuiet()} disabled={!!busy}>
                    <Ionicons
                      name={muted ? "volume-mute-outline" : "volume-high-outline"}
                      size={18}
                      color={colors.text}
                    />
                    <Text style={styles.rowText}>{muted ? t("post.menu.unmute") : t("post.menu.mute")}</Text>
                    {busy === "quiet" ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
                  </Pressable>
                  <View style={styles.sep} />
                  <Pressable style={styles.row} onPress={openReport} disabled={!!busy}>
                    <Ionicons name="flag-outline" size={18} color={colors.text} />
                    <Text style={styles.rowText}>{t("post.menu.report")}</Text>
                  </Pressable>
                  <Pressable style={styles.row} onPress={onBlock} disabled={!!busy}>
                    <Ionicons name="ban-outline" size={18} color={colors.terracotta} />
                    <Text style={[styles.rowText, styles.dangerText]}>{t("m.common.block")}</Text>
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
    confirmTitle: {
      paddingHorizontal: spacing.md,
      paddingTop: 10,
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    confirmBody: {
      paddingHorizontal: spacing.md,
      paddingBottom: 6,
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
