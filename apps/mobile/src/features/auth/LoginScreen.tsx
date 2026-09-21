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
import * as Haptics from "expo-haptics";
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
import {
  SignupRoleFollowUpSheet,
  type SignupRole,
} from "@/features/auth/SignupRoleFollowUpSheet";
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

type PendingSignup =
  | {
      kind: "google";
      idToken: string;
      profile: GoogleNativeProfile;
    }
  | {
      kind: "handoff";
      handoff: string;
      provider: string;
      profile: { email: string | null; name: string | null; image: string | null };
    };

function credentialsErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

/** MoCoMo welcome login — Google + native credentials. */
export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const {
    openWebAuth,
    signInWithCredentials,
    signInWithGoogleNative,
    completeOAuthSignupHandoff,
    refreshSavedAccounts,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const window = useWindowDimensions();
  const relaxedHeightRef = useRef(window.height);

  const backdropHeight = Math.max(
    window.height,
    window.width / BACKDROP_ASPECT
  );
  const artOffset = backdropHeight * BACKDROP_ART_END;

  const [busyProvider, setBusyProvider] = useState<MobileAuthProvider | null>(null);
  const [credentialsBusy, setCredentialsBusy] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [showSignupOnboarding, setShowSignupOnboarding] = useState(false);
  const [showRoleFollowUp, setShowRoleFollowUp] = useState(false);
  const [pendingRole, setPendingRole] = useState<SignupRole | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const authLocked = credentialsBusy || busyProvider !== null;
  const keyboardOpen = keyboardHeight > 0;

  if (!keyboardOpen) {
    relaxedHeightRef.current = window.height;
  }

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
      setPendingSignup({
        kind: "google",
        idToken: result.idToken,
        profile: result.profile,
      });
      setSignupError("");
    }
  }, [signInWithGoogleNative]);

  const runOAuth = useCallback(
    async (provider: MobileAuthProvider) => {
      if (provider !== "gmail") return;
      Keyboard.dismiss();
      setCredentialsError("");
      setBusyProvider("gmail");
      try {
        try {
          await runGoogleNative();
          return;
        } catch (e) {
          if (e instanceof GoogleNativeCancelledError) return;
          if (isGoogleDeveloperError(e)) {
            const web = await openWebAuth("signin", { provider: "gmail" });
            if (web.status === "needsSignup") {
              setPendingSignup({
                kind: "handoff",
                handoff: web.handoff,
                provider: web.provider,
                profile: web.profile,
              });
              setSignupError("");
            }
            return;
          }
          const msg =
            e instanceof GoogleNativeUnavailableError
              ? e.message
              : e instanceof ApiError
                ? e.message
                : "Google 로그인에 실패했습니다. 앱을 업데이트한 뒤 다시 시도해 주세요.";
          setCredentialsError(msg);
        }
      } catch (e) {
        setCredentialsError(credentialsErrorMessage(e, "인증을 완료하지 못했습니다."));
      } finally {
        setBusyProvider(null);
      }
    },
    [openWebAuth, runGoogleNative]
  );

  const confirmSignupTerms = useCallback(() => {
    setShowSignupOnboarding(true);
  }, []);

  const finishSignupOnboarding = useCallback(
    async (payload: {
      birth: { birthYear: number; birthMonth: number; birthDay: number };
      localAvatarUri: string | null;
      role: SignupRole;
    }) => {
      if (!pendingSignup || !payload.localAvatarUri) return;
      setSignupBusy(true);
      setSignupError("");
      setShowSignupOnboarding(false);
      const snapshot = pendingSignup;
      const chosenRole = payload.role;
      try {
        if (snapshot.kind === "google") {
          await signInWithGoogleNative({
            flow: "signup",
            idToken: snapshot.idToken,
          });
        } else {
          await completeOAuthSignupHandoff(snapshot.handoff);
        }

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
        setPendingRole(chosenRole);
        setShowRoleFollowUp(true);
      } catch (e) {
        setSignupError(credentialsErrorMessage(e, "계정을 만들지 못했습니다."));
        setPendingSignup(snapshot);
      } finally {
        setSignupBusy(false);
      }
    },
    [pendingSignup, signInWithGoogleNative, completeOAuthSignupHandoff]
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
        <View
          pointerEvents="box-none"
          style={[styles.socialDock, { top: socialTop }]}
        >
          <WelcomeSocialAuthRow
            busyProvider={busyProvider}
            disabled={authLocked}
            onPress={(provider) => void runOAuth(provider)}
          />
        </View>

        <View style={[styles.formDock, { bottom: formBottomInset }]}>
          <NativeCredentialsForm
            busy={credentialsBusy}
            error={credentialsError}
            onSubmit={(loginId, password) => void handleCredentials(loginId, password)}
          />

          <Text
            style={styles.resetLink}
            onPress={() => {
              void Haptics.selectionAsync();
              navigation.navigate("PasswordReset");
            }}
          >
            비밀번호 재설정
          </Text>
        </View>
      </View>

      <TermsConsentSheet
        visible={pendingSignup !== null && !showSignupOnboarding && !showRoleFollowUp && !showCelebration}
        account={pendingSignup?.profile ?? null}
        busy={signupBusy}
        error={signupError}
        onClose={() => setPendingSignup(null)}
        onAgree={() => void confirmSignupTerms()}
      />

      <SignupOnboardingSheet
        visible={showSignupOnboarding}
        mode="collectOnly"
        onClose={() => setShowSignupOnboarding(false)}
        onFinished={(payload) => {
          void finishSignupOnboarding({
            birth: payload.birth,
            localAvatarUri: payload.localAvatarUri,
            role: payload.role,
          });
        }}
      />

      <SignupRoleFollowUpSheet
        visible={showRoleFollowUp}
        role={pendingRole}
        onClose={() => {
          setShowRoleFollowUp(false);
          setPendingRole(null);
          setShowCelebration(true);
        }}
        onFinished={() => {
          setShowRoleFollowUp(false);
          setPendingRole(null);
          setShowCelebration(true);
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
  resetLink: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    color: "#FFFFFF",
    lineHeight: 20,
    paddingTop: 2,
    paddingBottom: 8,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
