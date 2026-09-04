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
import type { AuthStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "PasswordReset">;
type Step = "email" | "code" | "done";

function errMsg(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

/** Native password reset — email code + new password, no web redirect. */
export function PasswordResetScreen({ navigation }: Props) {
  const { colors } = useTheme();
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
      setMessage(result.message ?? "인증 코드를 보냈습니다.");
      setStep("code");
    } catch (e) {
      setError(errMsg(e, "코드 발송에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
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
      setMessage(result.message ?? "비밀번호가 변경되었습니다.");
      setStep("done");
    } catch (e) {
      setError(errMsg(e, "비밀번호 재설정에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "email" ? "비밀번호 재설정" : step === "code" ? "새 비밀번호" : "완료";

  return (
    <AuthScreenLayout
      title={title}
      subtitle={
        step === "email"
          ? "가입한 이메일로 인증 코드를 보내드립니다."
          : step === "code"
            ? `${email.trim()}로 보낸 코드를 입력하세요.`
            : "새 비밀번호로 로그인되었습니다."
      }
      onBack={() => {
        if (step === "code") setStep("email");
        else navigation.goBack();
      }}
    >
      {step === "email" ? (
        <>
          <AuthTextField
            label="이메일"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <FolkButton
            label="인증 코드 받기"
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
            label="인증 코드"
            value={code}
            onChangeText={setCode}
            placeholder="6자리 코드"
            keyboardType="number-pad"
            maxLength={6}
          />
          <AuthTextField
            label="새 비밀번호"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="8자 이상"
            secureTextEntry
          />
          <AuthTextField
            label="비밀번호 확인"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="다시 입력"
            secureTextEntry
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <FolkButton
            label="비밀번호 변경"
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
          <FolkButton label="로그인으로" onPress={() => navigation.navigate("Login")} />
        </>
      ) : null}

      {step !== "done" ? (
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          <Text
            style={{ color: colors.brand, fontWeight: "700" }}
            onPress={() => navigation.navigate("Login")}
          >
            로그인으로 돌아가기
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
