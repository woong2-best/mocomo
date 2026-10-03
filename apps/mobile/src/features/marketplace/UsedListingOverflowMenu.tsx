import { useCallback, useMemo, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import {
  bumpMarketplaceListing,
  deleteMarketplaceListing,
  type MarketplaceListItem,
} from "@/api/marketplace";
import { blockUser } from "@/api/social";
import { PostReportSheet } from "@/features/feed/PostReportSheet";
import { dismissUsedListing } from "@/lib/used-listing-dismiss";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

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
  item: MarketplaceListItem;
  isOwner: boolean;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  onDismissed?: (listingId: string) => void;
  onDeleted?: (listingId: string) => void;
};

const MENU_WIDTH = 248;

export function UsedListingOverflowMenu({
  visible,
  onClose,
  anchor,
  item,
  isOwner,
  navigation,
  onDismissed,
  onDeleted,
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "block" | null>(null);

  const sellerId = item.sellerId ?? item.seller?.id ?? "";
  const sellerUsername = item.seller?.username ?? "user";

  const closeAll = useCallback(() => {
    setReportOpen(false);
    setConfirm(null);
    onClose();
  }, [onClose]);

  const menuTop = anchor ? anchor.y + anchor.height + 6 : 0;
  const menuLeft = anchor
    ? Math.max(spacing.sm, Math.min(anchor.x + anchor.width - MENU_WIDTH, windowWidth - MENU_WIDTH - spacing.sm))
    : spacing.sm;

  const onEdit = useCallback(() => {
    closeAll();
    navigation.navigate("UsedCreate", { editId: item.id });
  }, [closeAll, item.id, navigation]);

  const onBump = useCallback(async () => {
    if (busy) return;
    setBusy("bump");
    try {
      await bumpMarketplaceListing(item.id);
      closeAll();
      void queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
      showIslandSuccess(t("m.marketplace.bumped"), t("m.marketplace.moved_to_the_top_of_the"));
    } catch (e) {
      showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.marketplace.could_not_bump_listing"));
    } finally {
      setBusy(null);
    }
  }, [busy, closeAll, item.id, queryClient]);

  const runDelete = useCallback(() => {
    if (busy) return;
    setBusy("delete");
    void (async () => {
      try {
        await deleteMarketplaceListing(item.id);
        closeAll();
        onDeleted?.(item.id);
        void queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
        showIslandSuccess(t("m.marketplace.deleted"));
      } catch (e) {
        showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("post.menu.deleteFailed"));
      } finally {
        setBusy(null);
      }
    })();
  }, [busy, closeAll, item.id, onDeleted, queryClient]);

  const onDelete = useCallback(() => {
    if (busy) return;
    setConfirm("delete");
  }, [busy]);

  const onNotInterested = useCallback(async () => {
    if (busy) return;
    setBusy("hide");
    try {
      await dismissUsedListing(item.id);
      closeAll();
      onDismissed?.(item.id);
      showIslandSuccess(t("m.marketplace.not_interested"), t("m.marketplace.hidden_this_listing_from_your_feed"));
    } catch (e) {
      showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.common.something_went_wrong"));
    } finally {
      setBusy(null);
    }
  }, [busy, closeAll, item.id, onDismissed]);

  const runBlock = useCallback(() => {
    if (busy || !sellerId) return;
    setBusy("block");
    void (async () => {
      try {
        await blockUser(sellerId);
        void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
        void queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
        closeAll();
        onDismissed?.(item.id);
        showIslandSuccess(t("m.common.user_blocked"));
      } catch (e) {
        showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.common.could_not_block_user"));
      } finally {
        setBusy(null);
      }
    })();
  }, [busy, closeAll, item.id, onDismissed, queryClient, sellerId]);

  const onBlock = useCallback(() => {
    if (busy || !sellerId) return;
    setConfirm("block");
  }, [busy, sellerId]);

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
              {confirm === "delete" ? (
                <>
                  <Text style={styles.confirmTitle}>{t("m.marketplace.delete_listing")}</Text>
                  <Text style={styles.confirmBody}>{t("m.marketplace.delete_this_used_market_listing")}</Text>
                  <Pressable style={styles.row} onPress={runDelete} disabled={!!busy}>
                    <Ionicons name="trash-outline" size={18} color={colors.terracotta} />
                    <Text style={[styles.rowText, styles.dangerText]}>{t("post.menu.delete")}</Text>
                    {busy === "delete" ? (
                      <ActivityIndicator size="small" color={colors.terracotta} />
                    ) : null}
                  </Pressable>
                  <Pressable style={styles.row} onPress={() => setConfirm(null)}>
                    <Text style={styles.rowText}>{t("toast.cancel")}</Text>
                  </Pressable>
                </>
              ) : confirm === "block" ? (
                <>
                  <Text style={styles.confirmTitle}>{t("m.common.block")}</Text>
                  <Text style={styles.confirmBody}>{t("m.marketplace.block_sellerusername", { sellerUsername: String(sellerUsername) })}</Text>
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
                  <Pressable style={styles.row} onPress={onEdit} disabled={!!busy}>
                    <Ionicons name="create-outline" size={18} color={colors.text} />
                    <Text style={styles.rowText}>{t("m.common.edit")}</Text>
                  </Pressable>
                  <View style={styles.sep} />
                  <Pressable style={styles.row} onPress={() => void onBump()} disabled={!!busy}>
                    <Ionicons name="arrow-up-circle-outline" size={18} color={colors.text} />
                    <Text style={styles.rowText}>{t("m.marketplace.bump")}</Text>
                    {busy === "bump" ? (
                      <ActivityIndicator size="small" color={colors.cobalt} />
                    ) : null}
                  </Pressable>
                  <View style={styles.sep} />
                  <Pressable style={styles.row} onPress={onDelete} disabled={!!busy}>
                    <Ionicons name="trash-outline" size={18} color={colors.terracotta} />
                    <Text style={[styles.rowText, styles.dangerText]}>{t("post.menu.delete")}</Text>
                    {busy === "delete" ? (
                      <ActivityIndicator size="small" color={colors.terracotta} />
                    ) : null}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable style={styles.row} onPress={openReport} disabled={!!busy}>
                    <Ionicons name="flag-outline" size={18} color={colors.text} />
                    <Text style={styles.rowText}>{t("post.menu.report")}</Text>
                  </Pressable>
                  <View style={styles.sep} />
                  <Pressable style={styles.row} onPress={() => void onNotInterested()} disabled={!!busy}>
                    <Ionicons name="eye-off-outline" size={18} color={colors.text} />
                    <Text style={styles.rowText}>{t("m.marketplace.not_interested")}</Text>
                    {busy === "hide" ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
                  </Pressable>
                  <View style={styles.sep} />
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
        postId={item.id}
        listingId={item.id}
        reportTarget="used_listing"
        authorId={sellerId}
        authorUsername={sellerUsername}
        mode="report"
        onSubmitted={() => onDismissed?.(item.id)}
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
