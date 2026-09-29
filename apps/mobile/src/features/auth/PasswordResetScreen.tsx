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
  const { u } = useI18n();
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
      setMessage(result.message ?? u("인증 코드를 보냈습니다.", "We sent a verification code."));
      setStep("code");
    } catch (e) {
      setError(errMsg(e, u("코드 발송에 실패했습니다.", "Could not send the code.")));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (newPassword !== confirmPassword) {
      setError(u("비밀번호가 일치하지 않습니다.", "Passwords do not match."));
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
      setMessage(result.message ?? u("비밀번호가 변경되었습니다.", "Your password was changed."));
      setStep("done");
    } catch (e) {
      setError(errMsg(e, u("비밀번호 재설정에 실패했습니다.", "Password reset failed.")));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "email"
      ? u("비밀번호 재설정", "Reset password")
      : step === "code"
        ? u("새 비밀번호", "New password")
        : u("완료", "Done");

  return (
    <AuthScreenLayout
      title={title}
      subtitle={
        step === "email"
          ? u("가입한 이메일로 인증 코드를 보내드립니다.", "We will send a verification code to your sign-up email.")
          : step === "code"
            ? u(`${email.trim()}로 보낸 코드를 입력하세요.`, `Enter the code we sent to ${email.trim()}.`)
            : u("새 비밀번호로 로그인되었습니다.", "You are signed in with your new password.")
      }
      onBack={() => {
        if (step === "code") setStep("email");
        else navigation.goBack();
      }}
    >
      {step === "email" ? (
        <>
          <AuthTextField
            label={u("이메일", "Email")}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <FolkButton
            label={u("인증 코드 받기", "Send verification code")}
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
            label={u("인증 코드", "Verification code")}
            value={code}
            onChangeText={setCode}
            placeholder={u("6자리 코드", "6-digit code")}
            keyboardType="number-pad"
            maxLength={6}
          />
          <AuthTextField
            label={u("새 비밀번호", "New password")}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={u("8자 이상", "8+ characters")}
            secureTextEntry
          />
          <AuthTextField
            label={u("비밀번호 확인", "Confirm password")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={u("다시 입력", "Re-enter")}
            secureTextEntry
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <FolkButton
            label={u("비밀번호 변경", "Change password")}
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
          <FolkButton label={u("로그인으로", "Go to sign in")} onPress={() => navigation.navigate("Login")} />
        </>
      ) : null}

      {step !== "done" ? (
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          <Text
            style={{ color: colors.brand, fontWeight: "700" }}
            onPress={() => navigation.navigate("Login")}
          >
            {u("로그인으로 돌아가기", "Back to sign in")}
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
