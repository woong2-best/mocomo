import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import type { MobileAuthProvider } from "@/auth/oauth";
import {
  GoogleNativeCancelledError,
  GoogleNativeUnavailableError,
  prefetchGoogleNativeConfig,
  type GoogleNativeProfile,
} from "@/auth/google-native";
import { ApiError } from "@/api/client";
import { API_BASE_URL } from "@/config/env";
import { hasSeenNotificationPrompt } from "@/lib/onboarding-store";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { NotificationPermissionSheet } from "@/features/auth/NotificationPermissionSheet";
import { TermsConsentSheet } from "@/features/auth/TermsConsentSheet";
import { WelcomeConnectIllustration } from "@/features/auth/WelcomeConnectIllustration";
import { WelcomeSocialAuthRow } from "@/features/auth/WelcomeSocialAuthRow";
import { NativeCredentialsForm } from "@/features/auth/NativeCredentialsForm";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

const WEB = API_BASE_URL.replace(/\/$/, "");

const TAGLINES = [
  "More Connect Moments",
  "More Community Moments",
  "More Commercial Moments",
] as const;

type PendingGoogleSignup = {
  idToken: string;
  profile: GoogleNativeProfile;
};

function credentialsErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

/** MoCoMo welcome login — hero, social, then native credentials. */
export function LoginScreen() {
  const { colors } = useTheme();
  const {
    openWebAuth,
    signInWithCredentials,
    signInWithGoogleNative,
    refreshSavedAccounts,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardBottomInset();

  const [busyProvider, setBusyProvider] = useState<MobileAuthProvider | null>(null);
  const [credentialsBusy, setCredentialsBusy] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<PendingGoogleSignup | null>(null);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState("");

  const authLocked = credentialsBusy || busyProvider !== null;
  const keyboardOpen = keyboardHeight > 0;

  useEffect(() => {
    void refreshSavedAccounts();
    void hasSeenNotificationPrompt().then((seen) => {
      if (!seen) setShowNotification(true);
    });
    prefetchGoogleNativeConfig();
  }, [refreshSavedAccounts]);

  const scrollToForm = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (keyboardOpen) scrollToForm();
  }, [keyboardOpen, scrollToForm]);

  const runGoogleNative = useCallback(async () => {
    const result = await signInWithGoogleNative({ flow: "signin" });
    if (result.status === "needsSignup") {
      setPendingSignup({ idToken: result.idToken, profile: result.profile });
      setSignupError("");
    }
  }, [signInWithGoogleNative]);

  const runOAuth = useCallback(
    async (provider: MobileAuthProvider) => {
      Keyboard.dismiss();
      setCredentialsError("");
      setBusyProvider(provider);
      try {
        if (provider === "gmail") {
          try {
            await runGoogleNative();
            return;
          } catch (e) {
            if (e instanceof GoogleNativeCancelledError) return;
            if (!(e instanceof GoogleNativeUnavailableError)) throw e;
          }
        }
        await openWebAuth("signin", { provider });
      } catch (e) {
        setCredentialsError(credentialsErrorMessage(e, "인증을 완료하지 못했습니다."));
      } finally {
        setBusyProvider(null);
      }
    },
    [openWebAuth, runGoogleNative]
  );

  const confirmGoogleSignup = useCallback(async () => {
    if (!pendingSignup) return;
    setSignupBusy(true);
    setSignupError("");
    try {
      await signInWithGoogleNative({
        flow: "signup",
        idToken: pendingSignup.idToken,
      });
      setPendingSignup(null);
    } catch (e) {
      setSignupError(credentialsErrorMessage(e, "계정을 만들지 못했습니다."));
    } finally {
      setSignupBusy(false);
    }
  }, [pendingSignup, signInWithGoogleNative]);

  async function handleCredentials(loginId: string, password: string) {
    Keyboard.dismiss();
    setCredentialsError("");
    setCredentialsBusy(true);
    try {
      await signInWithCredentials(loginId, password);
    } catch (e) {
      setCredentialsError(credentialsErrorMessage(e, "로그인에 실패했습니다."));
    } finally {
      setCredentialsBusy(false);
    }
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (keyboardOpen ? 8 : 16),
            paddingBottom: Math.max(insets.bottom + 20, keyboardHeight + 20),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {!keyboardOpen ? (
          <View style={styles.hero}>
            <Image
              source={require("../../../assets/welcome-mascot.png")}
              style={styles.mascot}
              contentFit="contain"
            />
            <View style={styles.taglines}>
              {TAGLINES.map((line) => (
                <Text key={line} style={[styles.tagline, { color: colors.brand }]}>
                  {line}
                </Text>
              ))}
            </View>
            <View style={styles.illustrationWrap}>
              <WelcomeConnectIllustration color={colors.text} />
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          {!keyboardOpen ? (
            <WelcomeSocialAuthRow
              busyProvider={busyProvider}
              disabled={authLocked}
              onPress={(provider) => void runOAuth(provider)}
            />
          ) : null}

          {!keyboardOpen ? (
            <Text style={[styles.orText, { color: colors.textMuted }]}>또는</Text>
          ) : null}

          <NativeCredentialsForm
            busy={credentialsBusy}
            error={credentialsError}
            onSubmit={(loginId, password) => void handleCredentials(loginId, password)}
            onFieldFocus={scrollToForm}
          />

          <Text style={[styles.helperLinks, { color: colors.textMuted }]}>
            <Text
              style={{ color: colors.brand, fontWeight: "700" }}
              onPress={() => void Linking.openURL(`${WEB}/auth/email-verify?mode=reset`)}
            >
              비밀번호 재설정
            </Text>
            {" · "}
            <Text
              style={{ color: colors.brand, fontWeight: "700" }}
              onPress={() => void openWebAuth("signup")}
            >
              회원가입
            </Text>
          </Text>
        </View>
      </ScrollView>

      <TermsConsentSheet
        visible={pendingSignup !== null}
        account={pendingSignup?.profile ?? null}
        busy={signupBusy}
        error={signupError}
        onClose={() => setPendingSignup(null)}
        onAgree={() => void confirmGoogleSignup()}
      />

      <NotificationPermissionSheet
        visible={showNotification}
        onComplete={() => setShowNotification(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  hero: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  mascot: {
    width: 88,
    height: 88,
    marginBottom: 10,
  },
  taglines: { gap: 2, alignItems: "center", marginBottom: 8 },
  tagline: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  illustrationWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 18,
    opacity: 0.92,
  },
  actions: { gap: 14 },
  orText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 2,
  },
  helperLinks: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingTop: 2,
    paddingBottom: 8,
  },
});
