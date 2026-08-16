import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  blockAndReportUser,
  toggleMuteUser,
  togglePostProfileFeature,
  type ReportReasonId,
} from "@/api/social";
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
  postId: string;
  authorId: string;
  authorUsername: string;
  featuredOnProfile?: boolean;
  onFeaturedChange?: (featured: boolean) => void;
  onMuted?: (muted: boolean) => void;
  onBlocked?: () => void;
};

export function FeedPostOverflowMenu({
  visible,
  onClose,
  postId,
  authorId,
  authorUsername,
  featuredOnProfile = false,
  onFeaturedChange,
  onMuted,
  onBlocked,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [featured, setFeatured] = useState(featuredOnProfile);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReasonId>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");

  const closeAll = useCallback(() => {
    setReportOpen(false);
    setReportError("");
    onClose();
  }, [onClose]);

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

  const onMute = useCallback(async () => {
    if (busy) return;
    setBusy("mute");
    try {
      const res = await toggleMuteUser(authorId, authorUsername);
      setMuted(res.muted);
      onMuted?.(res.muted);
      closeAll();
      Alert.alert(res.muted ? "뮤트했습니다" : "뮤트를 해제했습니다");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "뮤트 처리에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [authorId, authorUsername, busy, closeAll, onMuted]);

  const onSubmitBlockReport = useCallback(async () => {
    if (busy) return;
    setBusy("report");
    setReportError("");
    try {
      await blockAndReportUser({
        userId: authorId,
        username: authorUsername,
        postId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
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
    authorId,
    authorUsername,
    busy,
    closeAll,
    onBlocked,
    postId,
    reportDetails,
    reportReason,
  ]);

  return (
    <>
      <Modal visible={visible && !reportOpen} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.scrim} onPress={closeAll}>
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
            onStartShouldSetResponder={() => true}
          >
            <Pressable style={styles.row} onPress={() => void onFeature()} disabled={!!busy}>
              <Ionicons name={featured ? "pin-outline" : "pin"} size={20} color={colors.text} />
              <Text style={styles.rowText}>
                {featured ? "프로필 메인에서 내리기" : "내 프로필 메인에 올리기"}
              </Text>
              {busy === "feature" ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
            </Pressable>
            <View style={styles.sep} />
            <Pressable style={styles.row} onPress={() => void onMute()} disabled={!!busy}>
              <Ionicons
                name={muted ? "volume-high-outline" : "volume-mute-outline"}
                size={20}
                color={colors.text}
              />
              <Text style={styles.rowText}>{muted ? "뮤트 해제" : "뮤트"}</Text>
              {busy === "mute" ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
            </Pressable>
            <View style={styles.sep} />
            <Pressable
              style={styles.row}
              onPress={() => {
                setReportOpen(true);
              }}
              disabled={!!busy}
            >
              <Ionicons name="ban-outline" size={20} color={colors.terracotta} />
              <Text style={[styles.rowText, styles.dangerText]}>차단 및 신고하기</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={closeAll}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View style={[styles.reportRoot, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.reportTitle}>차단 및 신고하기</Text>
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
            <Text style={styles.fieldLabel}>상세 내용 (선택)</Text>
            <TextInput
              style={styles.detailsInput}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="추가 설명을 입력해 주세요"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
            />
            {reportError ? <Text style={styles.errorText}>{reportError}</Text> : null}
          </ScrollView>
          <View style={styles.reportActions}>
            <Pressable style={styles.secondaryBtn} onPress={() => setReportOpen(false)}>
              <Text style={styles.secondaryBtnText}>취소</Text>
            </Pressable>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => void onSubmitBlockReport()}
              disabled={!!busy}
            >
              {busy === "report" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>차단 및 신고</Text>
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
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: 8,
      paddingHorizontal: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 16,
    },
    rowText: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    dangerText: { color: colors.terracotta },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
    cancelBtn: {
      marginTop: 8,
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelText: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
    reportRoot: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
    },
    reportTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 6 },
    reportDesc: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
    fieldLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      marginBottom: 8,
      marginTop: 12,
    },
    reasonRow: {
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    reasonRowActive: {
      borderColor: colors.cobalt,
      backgroundColor: colors.muted,
    },
    reasonText: { fontSize: 15, color: colors.text, fontWeight: "600" },
    reasonTextActive: { color: colors.cobalt },
    detailsInput: {
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radii.md,
      minHeight: 88,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      textAlignVertical: "top",
    },
    errorText: { color: colors.terracotta, marginTop: 8, fontSize: 13 },
    reportActions: { flexDirection: "row", gap: 10, marginTop: 12 },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radii.pill,
      paddingVertical: 14,
      alignItems: "center",
    },
    secondaryBtnText: { fontWeight: "700", color: colors.text },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.terracotta,
      borderRadius: radii.pill,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryBtnText: { fontWeight: "800", color: "#fff" },
  });
}
