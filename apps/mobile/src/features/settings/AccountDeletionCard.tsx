import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ACCOUNT_DELETE_CONFIRM_TEXT } from "@/constants/account-deletion";
import { requestAccountDeletion } from "@/api/account";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const RECOVERY_DAYS = 30;

type Props = {
  username: string;
  hasPassword: boolean;
};

export function AccountDeletionCard({ username, hasPassword }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setConfirmUsername("");
    setPassword("");
    setConfirmDelete("");
    setReason("");
  }

  const canSubmit =
    confirmUsername.trim().length > 0 &&
    confirmDelete.trim() === ACCOUNT_DELETE_CONFIRM_TEXT &&
    (!hasPassword || password.trim().length > 0);

  async function handleDelete() {
    setBusy(true);
    try {
      const result = await requestAccountDeletion({
        confirmUsername,
        confirmDelete,
        password: hasPassword ? password : undefined,
        reason: reason.trim() || undefined,
      });
      setOpen(false);
      resetForm();
      Alert.alert("탈퇴 접수", result.message, [
        { text: "확인", onPress: () => void signOut() },
      ]);
    } catch (e) {
      Alert.alert("탈퇴 실패", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <FolkCard style={{ borderColor: "rgba(196, 92, 62, 0.35)" }}>
        <Text style={[styles.title, { color: colors.terracotta }]}>회원 탈퇴</Text>
        <Text style={styles.desc}>
          탈퇴하면 게시물·댓글·좋아요 등 공개 흔적이 즉시 사라집니다. DM은 상대방 화면에
          &quot;탈퇴한 사용자&quot;로 남을 수 있습니다. {RECOVERY_DAYS}일 이내 로그인하면 탈퇴를
          취소할 수 있습니다.
        </Text>
        <FolkButton
          label="회원 탈퇴"
          variant="secondary"
          onPress={() => {
            resetForm();
            setOpen(true);
          }}
        />
      </FolkCard>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>정말 탈퇴하시겠습니까?</Text>
              <Text style={styles.sheetDesc}>
                {RECOVERY_DAYS}일 이내 로그인하면 탈퇴를 취소할 수 있습니다. 기간이 지나면 계정과
                데이터가 영구 삭제됩니다.
              </Text>

              <Text style={styles.label}>아이디 확인</Text>
              <Text style={styles.hint}>@{username}</Text>
              <TextInput
                style={styles.input}
                value={confirmUsername}
                onChangeText={setConfirmUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={username}
                editable={!busy}
              />

              {hasPassword ? (
                <>
                  <Text style={styles.label}>비밀번호</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!busy}
                  />
                </>
              ) : (
                <Text style={styles.hint}>
                  Google·Discord 등 소셜 가입 계정은 비밀번호 없이 진행됩니다.
                </Text>
              )}

              <Text style={styles.label}>{ACCOUNT_DELETE_CONFIRM_TEXT} 입력</Text>
              <TextInput
                style={styles.input}
                value={confirmDelete}
                onChangeText={setConfirmDelete}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={ACCOUNT_DELETE_CONFIRM_TEXT}
                editable={!busy}
              />

              <Text style={styles.label}>탈퇴 사유 (선택)</Text>
              <TextInput
                style={[styles.input, styles.reasonInput]}
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
                editable={!busy}
              />

              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)} disabled={busy}>
                  <Text style={[styles.cancelText, { color: colors.cobalt }]}>취소</Text>
                </Pressable>
                <FolkButton
                  label="탈퇴하기"
                  loading={busy}
                  disabled={!canSubmit}
                  onPress={() => void handleDelete()}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return "탈퇴 처리에 실패했습니다.";
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
    desc: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "92%",
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.md,
      paddingBottom: spacing.lg,
    },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.brand, marginBottom: 8 },
    sheetDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 16 },
    label: { fontWeight: "800", color: colors.cobalt, marginTop: 8, marginBottom: 6 },
    hint: { color: colors.textMuted, fontSize: 12, marginBottom: 6, lineHeight: 17 },
    input: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      color: colors.text,
      fontWeight: "600",
      marginBottom: 4,
    },
    reasonInput: { minHeight: 72, textAlignVertical: "top" },
    actions: { gap: 10, marginTop: 16 },
    cancelBtn: { alignItems: "center", paddingVertical: 10 },
    cancelText: { fontWeight: "800", fontSize: 14 },
  });
}
