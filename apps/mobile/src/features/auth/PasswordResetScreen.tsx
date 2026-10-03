import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import { completePasswordReset, sendEmailAuthCode } from "@/auth/signup";
import { ApiError } from "@/api/client";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";
import { AuthTextField } from "@/features/auth/AuthTextField";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

type Props = NativeStackScreenProps<RootStackParamList, "PasswordReset">;
type Step = "email" | "code" | "done";

function errMsg(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

/** Native password reset — email code + new password, no web redirect. */
export function PasswordResetScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { signInWithCredentials, refreshMe } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSendCode() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await sendEmailAuthCode(email.trim().toLowerCase(), "reset");
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? t("m.auth.we_sent_a_verification_code"));
      setStep("code");
    } catch (e) {
      setError(errMsg(e, t("m.auth.could_not_send_the_code")));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (newPassword !== confirmPassword) {
      setError(t("m.auth.passwords_do_not_match"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      const result = await completePasswordReset(
        email.trim().toLowerCase(),
        code.trim(),
        newPassword
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.user) {
        await refreshMe();
        return;
      }
      await signInWithCredentials(email.trim().toLowerCase(), newPassword);
      setMessage(result.message ?? t("m.auth.your_password_was_changed"));
      setStep("done");
    } catch (e) {
      setError(errMsg(e, t("m.auth.password_reset_failed")));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "email"
      ? t("m.auth.reset_password")
      : step === "code"
        ? t("m.auth.new_password")
        : t("m.common.done");

  return (
    <AuthScreenLayout
      title={title}
      subtitle={
        step === "email"
          ? t("m.auth.we_will_send_a_verification_code")
          : step === "code"
            ? t("m.auth.enter_the_code_we_sent_to", { email: String(email.trim()) })
            : t("m.auth.you_are_signed_in_with_your")
      }
      onBack={() => {
        if (step === "code") setStep("email");
        else navigation.goBack();
      }}
    >
      {step === "email" ? (
        <>
          <AuthTextField
            label={t("m.auth.email")}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <FolkButton
            label={t("m.auth.send_verification_code")}
            loading={busy}
            disabled={!email.trim()}
            onPress={() => void handleSendCode()}
          />
        </>
      ) : null}

      {step === "code" ? (
        <>
          {message ? (
            <Text style={[styles.message, { color: colors.brand }]}>{message}</Text>
          ) : null}
          <AuthTextField
            label={t("m.auth.verification_code")}
            value={code}
            onChangeText={setCode}
            placeholder={t("m.common.6_digit_code")}
            keyboardType="number-pad"
            maxLength={6}
          />
          <AuthTextField
            label={t("m.auth.new_password")}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("m.auth.8_characters")}
            secureTextEntry
          />
          <AuthTextField
            label={t("m.auth.confirm_password")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("m.auth.re_enter")}
            secureTextEntry
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <FolkButton
            label={t("m.auth.change_password")}
            loading={busy}
            disabled={code.trim().length < 4 || newPassword.length < 8}
            onPress={() => void handleReset()}
          />
        </>
      ) : null}

      {step === "done" ? (
        <>
          {message ? (
            <Text style={[styles.message, { color: colors.brand }]}>{message}</Text>
          ) : null}
          <FolkButton label={t("m.auth.go_to_sign_in")} onPress={() => navigation.navigate("Login")} />
        </>
      ) : null}

      {step !== "done" ? (
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          <Text
            style={{ color: colors.brand, fontWeight: "700" }}
            onPress={() => navigation.navigate("Login")}
          >
            {t("m.auth.back_to_sign_in")}
          </Text>
        </Text>
      ) : null}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  message: { fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  footer: { fontSize: 14, textAlign: "center", marginTop: 8 },
});
