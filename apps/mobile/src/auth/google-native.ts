import { Platform } from "react-native";
import { ApiError, apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import { GOOGLE_WEB_CLIENT_ID } from "@/config/env";
import type { MobileAuthUser } from "@/auth/types";

type GoogleConfig = {
  enabled: boolean;
  webClientId: string | null;
  androidClientId?: string | null;
  iosClientId: string | null;
};

export type GoogleNativeProfile = {
  email: string | null;
  name: string | null;
  image: string | null;
};

export type GoogleNativeAuthResult =
  | {
      status: "signedIn";
      created: boolean;
      user: MobileAuthUser;
      accessToken: string;
      refreshToken: string;
    }
  | { status: "needsSignup"; profile: GoogleNativeProfile };

/** Thrown when the device cannot run the native SDK — caller falls back to web. */
export class GoogleNativeUnavailableError extends Error {
  constructor(message = "이 기기에서는 Google 네이티브 로그인을 사용할 수 없습니다.") {
    super(message);
    this.name = "GoogleNativeUnavailableError";
  }
}

export class GoogleNativeCancelledError extends Error {
  constructor() {
    super("로그인이 취소되었습니다.");
    this.name = "GoogleNativeCancelledError";
  }
}

/** Play App Signing SHA-1 missing from Firebase — native SDK cannot authenticate. */
export function isGoogleDeveloperError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return msg.includes("DEVELOPER_ERROR");
}

function googleNativeFailureMessage(e: unknown): string {
  if (isGoogleDeveloperError(e)) {
    return "Google 로그인 설정 오류입니다. Play Store 설치본은 Firebase에 앱 서명 키 SHA-1이 등록되어 있어야 합니다.";
  }
  return e instanceof Error ? e.message : "Google 로그인에 실패했습니다.";
}

type GoogleSigninModule =
  typeof import("@react-native-google-signin/google-signin");

let modulePromise: Promise<GoogleSigninModule> | null = null;
let configuredFor: string | null = null;
let configPromise: Promise<GoogleConfig> | null = null;

async function loadModule(): Promise<GoogleSigninModule> {
  try {
    // The package reads native constants while its module body evaluates, so a
    // missing/mismatched TurboModule throws *synchronously* out of `import()`.
    // Keeping the call inside this try block is what turns that into a
    // recoverable "unavailable" signal rather than a raw TypeError.
    if (!modulePromise) {
      modulePromise = Promise.resolve(
        import("@react-native-google-signin/google-signin")
      );
    }
    const mod = await modulePromise;
    if (
      typeof mod?.GoogleSignin?.configure !== "function" ||
      typeof mod?.GoogleSignin?.signIn !== "function"
    ) {
      throw new Error("RNGoogleSignin is not registered on this build");
    }
    return mod;
  } catch (e) {
    modulePromise = null;
    throw new GoogleNativeUnavailableError(
      e instanceof Error ? e.message : undefined
    );
  }
}

async function loadConfig(): Promise<GoogleConfig> {
  if (!configPromise) {
    configPromise = apiRequest<GoogleConfig>(MobileApi.auth.googleConfig, {
      auth: false,
    }).catch(() => {
      configPromise = null;
      if (GOOGLE_WEB_CLIENT_ID) {
        return {
          enabled: true,
          webClientId: GOOGLE_WEB_CLIENT_ID,
          iosClientId: null,
        };
      }
      return { enabled: false, webClientId: null, iosClientId: null };
    });
  }
  return configPromise;
}

/** Warm the module + server client ids so the first tap opens instantly. */
export function prefetchGoogleNativeConfig(): void {
  void loadConfig().catch(() => undefined);
}

async function ensureConfigured(): Promise<GoogleSigninModule> {
  const config = await loadConfig();
  if (!config.enabled || !config.webClientId) {
    throw new GoogleNativeUnavailableError(
      "Google 로그인이 서버에 설정되지 않았습니다."
    );
  }

  const mod = await loadModule();
  if (configuredFor !== config.webClientId) {
    try {
      mod.GoogleSignin.configure({
        webClientId: config.webClientId,
        ...(config.iosClientId ? { iosClientId: config.iosClientId } : {}),
        scopes: ["profile", "email"],
        offlineAccess: false,
      });
    } catch (e) {
      throw new GoogleNativeUnavailableError(
        e instanceof Error ? e.message : undefined
      );
    }
    configuredFor = config.webClientId;
  }
  return mod;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInProgressError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string"
      ? (e as { code: string }).code
      : "";
  if (code === "IN_PROGRESS" || code === "ASYNC_OP_IN_PROGRESS") return true;
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return msg.includes("IN_PROGRESS") || msg.includes("previous promise did not settle");
}

/**
 * Open the system Google account chooser and return a fresh ID token.
 * `forcePicker` signs the SDK out first so add-account can pick a different Google user.
 */
async function requestGoogleIdToken(forcePicker: boolean): Promise<string> {
  const mod = await ensureConfigured();
  const { GoogleSignin, isErrorWithCode, statusCodes } = mod;

  if (Platform.OS === "android") {
    let hasPlay = false;
    try {
      hasPlay = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    } catch {
      hasPlay = false;
    }
    if (!hasPlay) {
      throw new GoogleNativeUnavailableError(
        "Google Play 서비스를 사용할 수 없습니다."
      );
    }
  }

  if (forcePicker) {
    try {
      await GoogleSignin.signOut();
    } catch {
      /* nothing cached */
    }
    await sleep(180);
  }

  const attemptSignIn = async (): Promise<string> => {
    const result = await GoogleSignin.signIn();
    if (result.type !== "success") throw new GoogleNativeCancelledError();

    const idToken =
      result.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
    if (!idToken) {
      throw new GoogleNativeUnavailableError(
        "Google 인증 토큰을 받지 못했습니다."
      );
    }
    return idToken;
  };

  const mapNativeError = (e: unknown): never => {
    if (e instanceof GoogleNativeCancelledError) throw e;
    if (e instanceof GoogleNativeUnavailableError) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleNativeCancelledError();
    }
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GoogleNativeUnavailableError(
        "Google Play 서비스를 사용할 수 없습니다."
      );
    }
    if (isGoogleDeveloperError(e)) {
      throw new GoogleNativeUnavailableError(googleNativeFailureMessage(e));
    }
    throw e instanceof Error ? e : new Error(googleNativeFailureMessage(e));
  };

  try {
    return await attemptSignIn();
  } catch (e) {
    if (isInProgressError(e)) {
      await sleep(450);
      try {
        return await attemptSignIn();
      } catch (retryErr) {
        return mapNativeError(retryErr);
      }
    }
    return mapNativeError(e);
  }
}

/** Sign in (or, with `flow: "signup"`, register) using a native Google account. */
export async function authenticateWithGoogleNative(opts: {
  flow: "signin" | "signup";
  idToken?: string;
  forcePicker?: boolean;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}): Promise<GoogleNativeAuthResult & { idToken: string }> {
  const idToken = opts.idToken ?? (await requestGoogleIdToken(opts.forcePicker === true));
  const platform = Platform.OS === "ios" ? "ios" : "android";

  try {
    const data = await apiRequest<GoogleNativeAuthResult>(MobileApi.auth.google, {
      method: "POST",
      auth: false,
      body: {
        idToken,
        flow: opts.flow,
        platform,
        birthYear: opts.birthYear,
        birthMonth: opts.birthMonth,
        birthDay: opts.birthDay,
        termsAccepted: opts.termsAccepted,
        privacyAccepted: opts.privacyAccepted,
      },
    });
    return { ...data, idToken };
  } catch (e) {
    // Server route not deployed yet — let LoginScreen fall back to browser OAuth.
    if (e instanceof ApiError && (e.status === 404 || e.status >= 500)) {
      throw new GoogleNativeUnavailableError();
    }
    throw e;
  }
}

/** Drop the cached Google session so the next sign-in shows the picker. */
export async function clearGoogleNativeSession(): Promise<void> {
  try {
    const mod = await loadModule();
    await mod.GoogleSignin.signOut();
  } catch {
    /* SDK unavailable — nothing to clear */
  }
}
