import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import {
  checkSignupAvailability,
  registerAccount,
  verifySignupAndLogin,
} from "@/auth/signup";
import { ApiError } from "@/api/client";
import { API_BASE_URL } from "@/config/env";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";
import { AuthTextField } from "@/features/auth/AuthTextField";
import { TermsConsentSheet } from "@/features/auth/TermsConsentSheet";
import { SignupOnboardingSheet } from "@/features/auth/SignupOnboardingSheet";
import { SignupCompleteCelebration } from "@/features/auth/SignupCompleteCelebration";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import type { RootStackParamList } from "@/navigation/types";

const WEB = API_BASE_URL.replace(/\/$/, "");

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

function errMsg(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

type Step = "form" | "verify";

/** Native email signup — terms → birth → gallery avatar → verify → fireworks. */
export function SignupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [showTerms, setShowTerms] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingBirth, setPendingBirth] = useState<{
    birthYear: number;
    birthMonth: number;
    birthDay: number;
  } | null>(null);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);

  async function handleRegisterWithProfile(opts: {
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    localAvatarUri: string;
  }) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();

      const check = await checkSignupAvailability(
        normalizedEmail,
        normalizedUsername,
        name.trim() || undefined
      );
      if (!check.ok) {
        setError(check.error ?? "가입 정보를 확인해 주세요.");
        return;
      }

      const result = await registerAccount({
        email: normalizedEmail,
        username: normalizedUsername,
        password,
        name: name.trim() || undefined,
        birthYear: opts.birthYear,
        birthMonth: opts.birthMonth,
        birthDay: opts.birthDay,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setPendingBirth({
        birthYear: opts.birthYear,
        birthMonth: opts.birthMonth,
        birthDay: opts.birthDay,
      });
      setPendingAvatarUri(opts.localAvatarUri);
      setMessage("이메일로 인증 코드를 보냈습니다. 스팸함도 확인해 주세요.");
      setShowOnboarding(false);
      setStep("verify");
    } catch (e) {
      setError(errMsg(e, "회원가입에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError("");
    setBusy(true);
    try {
      await verifySignupAndLogin(email.trim().toLowerCase(), code.trim(), password);
      if (pendingAvatarUri && pendingBirth) {
        const { prepareProfileAvatar } = await import("@/lib/prepare-profile-media");
        const { uploadLocalFile } = await import("@/api/upload-file");
        const { patchProfile } = await import("@/api/profile");
        const prepared = await prepareProfileAvatar(pendingAvatarUri);
        const url = await uploadLocalFile({
          uri: prepared,
          filename: `profile-avatar-${Date.now()}.jpg`,
          contentType: "image/jpeg",
          category: "image",
        });
        await patchProfile({
          image: url,
          birthYear: pendingBirth.birthYear,
          birthMonth: pendingBirth.birthMonth,
          birthDay: pendingBirth.birthDay,
        });
      }
      await refreshMe();
      setShowCelebration(true);
    } catch (e) {
      setError(errMsg(e, "인증에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AuthScreenLayout
        title={step === "form" ? "회원가입" : "이메일 인증"}
        subtitle={
          step === "verify"
            ? `${email.trim()}로 보낸 6자리 코드를 입력하세요.`
            : "MoCoMo 계정을 만들어 보세요."
        }
        onBack={() => (step === "verify" ? setStep("form") : navigation.goBack())}
      >
        {step === "form" ? (
          <>
            <AuthTextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <AuthTextField
              label="닉네임"
              value={username}
              onChangeText={setUsername}
              placeholder="영문·숫자·_ 3~20자"
              prefix="@"
            />
            <AuthTextField
              label="표시 이름 (선택)"
              value={name}
              onChangeText={setName}
              placeholder="프로필에 표시될 이름"
              autoCapitalize="words"
            />
            <AuthTextField
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="8자 이상"
              secureTextEntry
            />

            <Text style={[styles.terms, { color: colors.textMuted }]}>
              다음 단계에서 약관 동의 · 생년월일 · 프로필 사진을 설정합니다.{" "}
              <Text
                style={{ color: colors.brand, fontWeight: "700" }}
                onPress={() => void Linking.openURL(`${WEB}/legal/terms`)}
              >
                이용약관
              </Text>
              {" · "}
              <Text
                style={{ color: colors.brand, fontWeight: "700" }}
                onPress={() => void Linking.openURL(`${WEB}/legal/privacy`)}
              >
                개인정보처리방침
              </Text>
            </Text>

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <FolkButton
              label="다음"
              loading={busy}
              disabled={!email.trim() || !username.trim() || password.length < 8}
              onPress={() => {
                setError("");
                setShowTerms(true);
              }}
            />

            <Text style={[styles.footer, { color: colors.textMuted }]}>
              이미 계정이 있으신가요?{" "}
              <Text
                style={{ color: colors.brand, fontWeight: "700" }}
                onPress={() => navigation.navigate("Login")}
              >
                로그인
              </Text>
            </Text>
          </>
        ) : (
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
            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
            <FolkButton
              label="인증 완료"
              loading={busy}
              disabled={code.trim().length < 4}
              onPress={() => void handleVerify()}
            />
          </>
        )}
      </AuthScreenLayout>

      <TermsConsentSheet
        visible={showTerms}
        busy={false}
        onClose={() => setShowTerms(false)}
        onAgree={() => {
          setShowTerms(false);
          setShowOnboarding(true);
        }}
      />

      <SignupOnboardingSheet
        visible={showOnboarding}
        mode="collectOnly"
        onClose={() => setShowOnboarding(false)}
        onFinished={(payload) => {
          if (!payload.localAvatarUri) {
            setError("프로필 사진을 선택해 주세요.");
            return;
          }
          void handleRegisterWithProfile({
            ...payload.birth,
            localAvatarUri: payload.localAvatarUri,
          });
        }}
      />

      <SignupCompleteCelebration
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
      />

      {busy && step === "form" ? <View style={styles.busyBlock} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  terms: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  error: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  message: { fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  footer: { fontSize: 14, textAlign: "center", marginTop: 8 },
  busyBlock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
