import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { removeFollowingDmUser } from "@/api/following-dm-cache";
import {
  blockAndReportUser,
  toggleMuteUser,
  type ReportReasonId,
} from "@/api/social";
import { API_BASE_URL } from "@/config/env";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import type { TFn } from "@/i18n/types";

const REPORT_REASON_IDS: ReportReasonId[] = [
  "SPAM",
  "ABUSE",
  "HARASSMENT",
  "HATE",
  "FRAUD",
  "SEXUAL",
  "IMPERSONATION",
  "OTHER",
];

function reportReasonLabel(id: ReportReasonId, t: TFn): string {
  switch (id) {
    case "SPAM":
      return t("m.profile.spam_or_ads");
    case "ABUSE":
      return t("m.profile.abuse_or_harassment");
    case "HARASSMENT":
      return t("m.profile.harassment");
    case "HATE":
      return t("m.profile.hate_speech");
    case "FRAUD":
      return t("m.profile.fraud_or_illegal_activity");
    case "SEXUAL":
      return t("m.profile.sexual_content");
    case "IMPERSONATION":
      return t("m.profile.impersonation");
    case "OTHER":
      return t("m.profile.other");
    default:
      return t("m.profile.other");
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  initialMuted?: boolean;
  onMuted?: (muted: boolean) => void;
  onBlocked?: () => void;
};

export function ProfileOptionsSheet({
  visible,
  onClose,
  userId,
  username,
  initialMuted = false,
  onMuted,
  onBlocked,
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(initialMuted);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReasonId>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");
  const [blockConfirm, setBlockConfirm] = useState(false);

  const profileUrl = `${API_BASE_URL.replace(/\/$/, "")}/u/${username}`;

  useEffect(() => {
    if (visible) setMuted(initialMuted);
  }, [initialMuted, visible]);

  const closeAll = useCallback(() => {
    setReportOpen(false);
    setReportError("");
    setBlockConfirm(false);
    onClose();
  }, [onClose]);

  const onCopyLink = useCallback(async () => {
    try {
      await Share.share({ message: profileUrl, url: profileUrl });
      closeAll();
    } catch {
      showIslandError(t("m.common.error"), t("m.profile.could_not_share_link"));
    }
  }, [closeAll, profileUrl]);

  const onQuiet = useCallback(async () => {
    if (busy) return;
    setBusy("quiet");
    try {
      const res = await toggleMuteUser(userId, username);
      setMuted(res.muted);
      onMuted?.(res.muted);
      closeAll();
      showIslandSuccess(
        res.muted ? t("m.profile.quiet_mode_on") : t("m.profile.quiet_mode_off")
      );
    } catch (e) {
      showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.profile.could_not_update_quiet"));
    } finally {
      setBusy(null);
    }
  }, [busy, closeAll, onMuted, userId, username]);

  const runBlock = useCallback(() => {
    if (busy) return;
    setBusy("block");
    void (async () => {
      try {
        await blockAndReportUser({
          userId,
          username,
          reason: "OTHER",
          details: t("m.profile.blocked_from_profile"),
        });
        void removeFollowingDmUser(queryClient, userId);
        void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
        void queryClient.invalidateQueries({ queryKey: ["mobile-post"] });
        void queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
        closeAll();
        onBlocked?.();
        showIslandSuccess(t("m.common.done"), t("m.profile.username_was_blocked", { username: String(username) }));
      } catch (e) {
        showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.profile.could_not_block"));
      } finally {
        setBusy(null);
      }
    })();
  }, [busy, closeAll, onBlocked, queryClient, userId, username]);

  const onBlock = useCallback(() => {
    if (busy) return;
    setBlockConfirm(true);
  }, [busy]);

  const onSubmitReport = useCallback(async () => {
    if (busy) return;
    setBusy("report");
    setReportError("");
    try {
      await blockAndReportUser({
        userId,
        username,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      void removeFollowingDmUser(queryClient, userId);
      setReportOpen(false);
      closeAll();
      onBlocked?.();
      showIslandSuccess(
        t("m.common.done"),
        t("m.profile.report_submitted_and_user_blocked")
      );
    } catch (e) {
      setReportError(e instanceof Error ? e.message : t("m.common.could_not_submit_report"));
    } finally {
      setBusy(null);
    }
  }, [
    busy,
    closeAll,
    onBlocked,
    queryClient,
    reportDetails,
    reportReason,
    userId,
    username,
  ]);

  return (
    <>
      <Modal
        visible={visible && !reportOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAll}
      >
        <Pressable style={styles.scrim} onPress={closeAll}>
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{t("m.profile.profile_options")}</Text>
              <Pressable onPress={closeAll} hitSlop={10} accessibilityLabel={t("common.close")}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {blockConfirm ? (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmTitle}>{t("m.profile.block_user")}</Text>
                <Text style={styles.confirmBody}>
                  {t("m.profile.block_username_this_removes_mutual_follo", { username: String(username) })}
                </Text>
                <Pressable style={styles.row} onPress={runBlock} disabled={!!busy}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="ban-outline" size={18} color={colors.terracotta} />
                  </View>
                  <Text style={[styles.rowText, styles.dangerText]}>{t("m.common.block")}</Text>
                  {busy === "block" ? (
                    <ActivityIndicator size="small" color={colors.terracotta} />
                  ) : null}
                </Pressable>
                <Pressable style={styles.row} onPress={() => setBlockConfirm(false)}>
                  <Text style={styles.rowText}>{t("toast.cancel")}</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable style={styles.row} onPress={() => void onCopyLink()} disabled={!!busy || blockConfirm}>
              <View style={styles.iconCircle}>
                <Ionicons name="link-outline" size={18} color={colors.text} />
              </View>
              <Text style={styles.rowText}>{t("m.profile.copy_profile_link")}</Text>
            </Pressable>

            <Pressable style={styles.row} onPress={() => void onQuiet()} disabled={!!busy || blockConfirm}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={muted ? "volume-mute-outline" : "volume-high-outline"}
                  size={18}
                  color={colors.text}
                />
              </View>
              <Text style={styles.rowText}>{muted ? "Unquiet" : "Quiet"}</Text>
              {busy === "quiet" ? (
                <ActivityIndicator size="small" color={colors.cobalt} />
              ) : null}
            </Pressable>

            <Pressable style={styles.row} onPress={onBlock} disabled={!!busy || blockConfirm}>
              <View style={styles.iconCircle}>
                <Ionicons name="ban-outline" size={18} color={colors.terracotta} />
              </View>
              <Text style={[styles.rowText, styles.dangerText]}>
                {t("m.profile.block_username", { username: String(username) })}
              </Text>
              {busy === "block" ? (
                <ActivityIndicator size="small" color={colors.terracotta} />
              ) : null}
            </Pressable>

            <Pressable
              style={styles.row}
              onPress={() => setReportOpen(true)}
              disabled={!!busy}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="flag-outline" size={18} color={colors.terracotta} />
              </View>
              <Text style={[styles.rowText, styles.dangerText]}>
                {t("m.profile.report_username", { username: String(username) })}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={reportOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportOpen(false)}
      >
        <View
          style={[
            styles.reportRoot,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <Text style={styles.reportTitle}>{t("m.profile.report_username", { username: String(username) })}</Text>
          <Text style={styles.reportDesc}>{t("m.profile.we_block_this_user_after_you")}</Text>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t("m.profile.reason")}</Text>
            {REPORT_REASON_IDS.map((id) => (
              <Pressable
                key={id}
                style={[styles.reasonRow, reportReason === id && styles.reasonRowActive]}
                onPress={() => setReportReason(id)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    reportReason === id && styles.reasonTextActive,
                  ]}
                >
                  {reportReasonLabel(id, t)}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.fieldLabel}>{t("m.profile.details_optional")}</Text>
            <TextInput
              style={styles.details}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder={t("m.profile.additional_details")}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            {reportError ? <Text style={styles.error}>{reportError}</Text> : null}
          </ScrollView>
          <View style={styles.reportActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setReportOpen(false)}>
              <Text style={styles.cancelText}>{t("toast.cancel")}</Text>
            </Pressable>
            <Pressable
              style={styles.submitBtn}
              onPress={() => void onSubmitReport()}
              disabled={!!busy}
            >
              {busy === "report" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t("m.profile.report_block")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
      paddingHorizontal: spacing.md,
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.lg,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    title: { fontSize: 14, fontWeight: "800", color: colors.cobalt },
    confirmBlock: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    confirmTitle: {
      paddingHorizontal: spacing.md,
      paddingTop: 12,
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
    },
    confirmBody: {
      paddingHorizontal: spacing.md,
      paddingBottom: 4,
      fontSize: 13,
      fontWeight: "500",
      color: colors.textMuted,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    rowText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
    dangerText: { color: colors.terracotta },
    reportRoot: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
    },
    reportTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
    reportDesc: { marginTop: 6, color: colors.textMuted, fontWeight: "600" },
    fieldLabel: {
      marginTop: spacing.md,
      marginBottom: 8,
      fontWeight: "800",
      color: colors.text,
    },
    reasonRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: radii.md,
      marginBottom: 4,
    },
    reasonRowActive: { backgroundColor: colors.muted },
    reasonText: { color: colors.textMuted, fontWeight: "600" },
    reasonTextActive: { color: colors.text, fontWeight: "800" },
    details: {
      minHeight: 88,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      borderRadius: radii.md,
      padding: 12,
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
      textAlignVertical: "top",
    },
    error: { color: colors.danger, marginTop: 8, fontWeight: "600" },
    reportActions: { flexDirection: "row", gap: 10, marginTop: 12 },
    cancelBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: radii.md,
      backgroundColor: colors.muted,
    },
    cancelText: { fontWeight: "800", color: colors.text },
    submitBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: radii.md,
      backgroundColor: colors.terracotta,
      minHeight: 48,
    },
    submitText: { fontWeight: "800", color: "#fff" },
  });
}
