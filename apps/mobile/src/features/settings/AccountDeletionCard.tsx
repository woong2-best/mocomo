import { useMemo, useState } from "react";
import {
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
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { translate } from "@/i18n/runtime";

const RECOVERY_DAYS = 30;

type Props = {
  username: string;
  hasPassword: boolean;
};

export function AccountDeletionCard({ username, hasPassword }: Props) {
  const { t } = useI18n();
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
      showIslandSuccess(t("m.settings.deletion_requested"), result.message);
      void signOut();
    } catch (e) {
      showIslandError(t("m.settings.deletion_failed"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <FolkCard style={{ borderColor: "rgba(196, 92, 62, 0.35)" }}>
        <Text style={[styles.title, { color: colors.terracotta }]}>{t("m.settings.delete_account")}</Text>
        <Text style={styles.desc}>
          {t("m.settings.deleting_your_account_immediately_remove")}{" "}
          {t("m.settings.account_deletion_recovery_desc", { days: String(RECOVERY_DAYS) })}
        </Text>
        <FolkButton
          label={t("m.settings.delete_account")}
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
              <Text style={styles.sheetTitle}>{t("m.settings.delete_your_account")}</Text>
              <Text style={styles.sheetDesc}>
                {t("m.settings.account_deletion_recovery_sheet", { days: String(RECOVERY_DAYS) })}
              </Text>

              <Text style={styles.label}>{t("m.settings.confirm_your_id")}</Text>
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
                  <Text style={styles.label}>{t("auth.passwordSimple")}</Text>
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
                  {t("m.settings.accounts_created_with_google_discord_or")}
                </Text>
              )}

              <Text style={styles.label}>
                {t("m.settings.type_confirm_to_proceed", { text: ACCOUNT_DELETE_CONFIRM_TEXT })}
              </Text>
              <TextInput
                style={styles.input}
                value={confirmDelete}
                onChangeText={setConfirmDelete}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={ACCOUNT_DELETE_CONFIRM_TEXT}
                editable={!busy}
              />

              <Text style={styles.label}>{t("m.settings.reason_for_leaving_optional")}</Text>
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
                  <Text style={[styles.cancelText, { color: colors.cobalt }]}>{t("toast.cancel")}</Text>
                </Pressable>
                <FolkButton
                  label={t("m.settings.delete_account")}
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
  return translate("m.settings.could_not_delete_the_account");
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
