import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import type { MobileAuthProvider } from "@/auth/oauth";
import {
  GoogleNativeCancelledError,
  GoogleNativeUnavailableError,
  isGoogleDeveloperError,
  prefetchGoogleNativeConfig,
  type GoogleNativeProfile,
} from "@/auth/google-native";
import { ApiError } from "@/api/client";
import { hasSeenNotificationPrompt } from "@/lib/onboarding-store";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { NotificationPermissionSheet } from "@/features/auth/NotificationPermissionSheet";
import { TermsConsentSheet } from "@/features/auth/TermsConsentSheet";
import { SignupOnboardingSheet } from "@/features/auth/SignupOnboardingSheet";
import { SignupCompleteCelebration } from "@/features/auth/SignupCompleteCelebration";
import { WelcomeSocialAuthRow } from "@/features/auth/WelcomeSocialAuthRow";
import { NativeCredentialsForm } from "@/features/auth/NativeCredentialsForm";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

/** Matches the cream sky fill of welcome-bg.jpg so letterbox edges never show. */
const BACKDROP = "#E8DFD0";
/** Intrinsic shape of welcome-bg.jpg (559×1024) and where the hero art clears for UI. */
const BACKDROP_ASPECT = 559 / 1024;
const BACKDROP_ART_END = 0.52;
/** Breathing room between the artwork and the first row of buttons. */
const ART_GAP = 20;

type PendingGoogleSignup = {
  idToken: string;
  profile: GoogleNativeProfile;
};

function credentialsErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

/** MoCoMo welcome login — hero, social, then native credentials. */
export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const {
    openWebAuth,
    signInWithCredentials,
    signInWithGoogleNative,
    refreshSavedAccounts,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const window = useWindowDimensions();
  const relaxedHeightRef = useRef(window.height);

  // `cover` anchors the artwork to the top of the screen, so the baseline of
  // the line art lands at a fixed fraction of the displayed image height.
  const backdropHeight = Math.max(
    window.height,
    window.width / BACKDROP_ASPECT
  );
  const artOffset = backdropHeight * BACKDROP_ART_END;

  const [busyProvider, setBusyProvider] = useState<MobileAuthProvider | null>(null);
  const [credentialsBusy, setCredentialsBusy] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<PendingGoogleSignup | null>(null);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState("");
  /** After terms: collect birth + local avatar, then create account. */
  const [showSignupOnboarding, setShowSignupOnboarding] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const authLocked = credentialsBusy || busyProvider !== null;
  const keyboardOpen = keyboardHeight > 0;

  if (!keyboardOpen) {
    relaxedHeightRef.current = window.height;
  }

  // Android `softwareKeyboardLayoutMode: resize` shrinks the window; iOS keeps
  // the frame and reports keyboard height instead — never apply both.
  const windowResizedForKeyboard =
    Platform.OS === "android" &&
    keyboardOpen &&
    relaxedHeightRef.current - window.height > 80;

  const formBottomInset = windowResizedForKeyboard
    ? insets.bottom + 16
    : keyboardOpen
      ? keyboardHeight + insets.bottom + 16
      : insets.bottom + 20;

  const socialTop =
    insets.top +
    12 +
    Math.max(16, artOffset + ART_GAP - insets.top - 12);

  useEffect(() => {
    void refreshSavedAccounts();
    void hasSeenNotificationPrompt().then((seen) => {
      if (!seen) setShowNotification(true);
    });
    prefetchGoogleNativeConfig();
  }, [refreshSavedAccounts]);

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
            // Play-distributed builds need Play App Signing SHA-1 in Firebase.
            // Fall back to the in-app browser flow until that is registered.
            if (isGoogleDeveloperError(e)) {
              await openWebAuth("signin", { provider: "gmail" });
              return;
            }
            const msg =
              e instanceof GoogleNativeUnavailableError
                ? e.message
                : e instanceof ApiError
                  ? e.message
                  : "Google 로그인에 실패했습니다. 앱을 업데이트한 뒤 다시 시도해 주세요.";
            setCredentialsError(msg);
            return;
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

  const confirmGoogleSignup = useCallback(() => {
    // Terms agreed → collect birth + gallery avatar before creating the account.
    setShowSignupOnboarding(true);
  }, []);

  const finishGoogleSignupOnboarding = useCallback(
    async (payload: {
      birth: { birthYear: number; birthMonth: number; birthDay: number };
      localAvatarUri: string | null;
    }) => {
      if (!pendingSignup || !payload.localAvatarUri) return;
      setSignupBusy(true);
      setSignupError("");
      setShowSignupOnboarding(false);
      try {
        await signInWithGoogleNative({
          flow: "signup",
          idToken: pendingSignup.idToken,
        });
        const { prepareProfileAvatar } = await import("@/lib/prepare-profile-media");
        const { uploadLocalFile } = await import("@/api/upload-file");
        const { patchProfile } = await import("@/api/profile");
        const prepared = await prepareProfileAvatar(payload.localAvatarUri);
        const url = await uploadLocalFile({
          uri: prepared,
          filename: `profile-avatar-${Date.now()}.jpg`,
          contentType: "image/jpeg",
          category: "image",
        });
        await patchProfile({
          image: url,
          birthYear: payload.birth.birthYear,
          birthMonth: payload.birth.birthMonth,
          birthDay: payload.birth.birthDay,
        });
        setPendingSignup(null);
        setShowCelebration(true);
      } catch (e) {
        setSignupError(credentialsErrorMessage(e, "계정을 만들지 못했습니다."));
        setPendingSignup(pendingSignup);
      } finally {
        setSignupBusy(false);
      }
    },
    [pendingSignup, signInWithGoogleNative]
  );

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
    <View style={[styles.flex, { backgroundColor: BACKDROP }]}>
      <Image
        source={require("../../../assets/welcome-bg.jpg")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top center"
        allowDownscaling={false}
        priority="high"
        cachePolicy="memory-disk"
      />

      <View style={[styles.flex, styles.overlay]} pointerEvents="box-none">
        {/* Social tiles — absolute, never moves when the keyboard opens. */}
        <View
          pointerEvents="box-none"
          style={[styles.socialDock, { top: socialTop }]}
        >
          <WelcomeSocialAuthRow
            busyProvider={busyProvider}
            disabled={authLocked}
            onPress={(provider) => void runOAuth(provider)}
          />
          <Text style={[styles.orText, { color: colors.textMuted }]}>또는</Text>
        </View>

        {/* ID / password / login — absolute bottom, lifts above the keyboard. */}
        <View style={[styles.formDock, { bottom: formBottomInset }]}>
          <NativeCredentialsForm
            busy={credentialsBusy}
            error={credentialsError}
            onSubmit={(loginId, password) => void handleCredentials(loginId, password)}
          />

          <Text style={[styles.helperLinks, { color: colors.textMuted }]}>
            <Text
              style={{ color: colors.brand, fontWeight: "700" }}
              onPress={() => navigation.navigate("PasswordReset")}
            >
              비밀번호 재설정
            </Text>
            {" · "}
            <Text
              style={{ color: colors.brand, fontWeight: "700" }}
              onPress={() => navigation.navigate("Signup")}
            >
              회원가입
            </Text>
          </Text>
        </View>
      </View>

      <TermsConsentSheet
        visible={pendingSignup !== null && !showSignupOnboarding && !showCelebration}
        account={pendingSignup?.profile ?? null}
        busy={signupBusy}
        error={signupError}
        onClose={() => setPendingSignup(null)}
        onAgree={() => void confirmGoogleSignup()}
      />

      <SignupOnboardingSheet
        visible={showSignupOnboarding}
        mode="collectOnly"
        onClose={() => setShowSignupOnboarding(false)}
        onFinished={(payload) => {
          void finishGoogleSignupOnboarding({
            birth: payload.birth,
            localAvatarUri: payload.localAvatarUri,
          });
        }}
      />

      <SignupCompleteCelebration
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
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
  overlay: { zIndex: 1 },
  socialDock: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  formDock: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    gap: 14,
  },
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
