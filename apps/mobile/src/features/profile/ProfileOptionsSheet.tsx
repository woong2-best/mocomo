import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

const REPORT_REASONS: { id: ReportReasonId; label: string }[] = [
  { id: "SPAM", label: "스팸·광고" },
  { id: "ABUSE", label: "욕설·괴롭힘" },
  { id: "HARASSMENT", label: "괴롭힘" },
  { id: "HATE", label: "혐오 표현" },
  { id: "FRAUD", label: "사기·불법 거래" },
  { id: "SEXUAL", label: "음란물" },
  { id: "IMPERSONATION", label: "사칭" },
  { id: "OTHER", label: "기타" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onMuted?: (muted: boolean) => void;
  onBlocked?: () => void;
};

export function ProfileOptionsSheet({
  visible,
  onClose,
  userId,
  username,
  onMuted,
  onBlocked,
}: Props) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReasonId>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");

  const profileUrl = `${API_BASE_URL.replace(/\/$/, "")}/u/${username}`;

  const closeAll = useCallback(() => {
    setReportOpen(false);
    setReportError("");
    onClose();
  }, [onClose]);

  const onCopyLink = useCallback(async () => {
    try {
      await Share.share({ message: profileUrl, url: profileUrl });
      closeAll();
    } catch {
      Alert.alert("오류", "링크를 공유하지 못했습니다.");
    }
  }, [closeAll, profileUrl]);

  const onMute = useCallback(async () => {
    if (busy) return;
    setBusy("mute");
    try {
      const res = await toggleMuteUser(userId, username);
      setMuted(res.muted);
      onMuted?.(res.muted);
      closeAll();
      Alert.alert(res.muted ? "뮤트했습니다" : "뮤트를 해제했습니다");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "뮤트 처리에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [busy, closeAll, onMuted, userId, username]);

  const onBlock = useCallback(() => {
    Alert.alert(
      "사용자 차단",
      `@${username} 님을 차단할까요? 차단하면 서로 팔로우가 해제됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "차단",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (busy) return;
              setBusy("block");
              try {
                await blockAndReportUser({
                  userId,
                  username,
                  reason: "OTHER",
                  details: "프로필에서 차단",
                });
                void removeFollowingDmUser(queryClient, userId);
                closeAll();
                onBlocked?.();
                Alert.alert("완료", `@${username} 님을 차단했습니다.`);
              } catch (e) {
                Alert.alert(
                  "오류",
                  e instanceof Error ? e.message : "차단에 실패했습니다."
                );
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ]
    );
  }, [busy, closeAll, onBlocked, queryClient, userId, username]);

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
      Alert.alert("완료", "신고가 접수되었고 사용자를 차단했습니다.");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "신고 처리에 실패했습니다.");
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
              <Text style={styles.title}>프로필 옵션</Text>
              <Pressable onPress={closeAll} hitSlop={10} accessibilityLabel="닫기">
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Pressable style={styles.row} onPress={() => void onCopyLink()} disabled={!!busy}>
              <View style={styles.iconCircle}>
                <Ionicons name="link-outline" size={18} color={colors.text} />
              </View>
              <Text style={styles.rowText}>프로필 링크 복사하기</Text>
            </Pressable>

            <Pressable style={styles.row} onPress={() => void onMute()} disabled={!!busy}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={muted ? "volume-high-outline" : "volume-mute-outline"}
                  size={18}
                  color={colors.text}
                />
              </View>
              <Text style={styles.rowText}>{muted ? "뮤트 해제" : "뮤트"}</Text>
              {busy === "mute" ? (
                <ActivityIndicator size="small" color={colors.cobalt} />
              ) : null}
            </Pressable>

            <Pressable style={styles.row} onPress={onBlock} disabled={!!busy}>
              <View style={styles.iconCircle}>
                <Ionicons name="ban-outline" size={18} color={colors.terracotta} />
              </View>
              <Text style={[styles.rowText, styles.dangerText]}>
                @{username} 님 차단하기
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
                @{username} 님 신고하기
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
          <Text style={styles.reportTitle}>@{username} 님 신고하기</Text>
          <Text style={styles.reportDesc}>신고 후 해당 사용자를 차단합니다.</Text>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>신고 사유</Text>
            {REPORT_REASONS.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.reasonRow, reportReason === item.id && styles.reasonRowActive]}
                onPress={() => setReportReason(item.id)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    reportReason === item.id && styles.reasonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.fieldLabel}>상세 (선택)</Text>
            <TextInput
              style={styles.details}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="추가 설명"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            {reportError ? <Text style={styles.error}>{reportError}</Text> : null}
          </ScrollView>
          <View style={styles.reportActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setReportOpen(false)}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable
              style={styles.submitBtn}
              onPress={() => void onSubmitReport()}
              disabled={!!busy}
            >
              {busy === "report" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>신고 · 차단</Text>
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
