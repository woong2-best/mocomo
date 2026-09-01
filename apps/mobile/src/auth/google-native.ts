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

/**
 * Open the system Google account chooser and return a fresh ID token.
 * Signs out of the SDK first so the picker always appears instead of silently
 * reusing the last account.
 */
async function requestGoogleIdToken(): Promise<string> {
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

  // Drop the cached session so the account chooser always appears.
  try {
    await GoogleSignin.signOut();
  } catch {
    /* nothing cached */
  }

  try {
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
  } catch (e) {
    if (e instanceof GoogleNativeCancelledError) throw e;
    if (e instanceof GoogleNativeUnavailableError) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleNativeCancelledError();
    }
    // Anything else here is a device/console configuration problem
    // (DEVELOPER_ERROR from a SHA-1 mismatch, missing Play services, ...).
    // Report it as unavailable so the caller can use the web flow.
    throw new GoogleNativeUnavailableError(
      e instanceof Error ? e.message : undefined
    );
  }
}

/** Sign in (or, with `flow: "signup"`, register) using a native Google account. */
export async function authenticateWithGoogleNative(opts: {
  flow: "signin" | "signup";
  idToken?: string;
}): Promise<GoogleNativeAuthResult & { idToken: string }> {
  const idToken = opts.idToken ?? (await requestGoogleIdToken());
  const platform = Platform.OS === "ios" ? "ios" : "android";

  try {
    const data = await apiRequest<GoogleNativeAuthResult>(MobileApi.auth.google, {
      method: "POST",
      auth: false,
      body: { idToken, flow: opts.flow, platform },
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
