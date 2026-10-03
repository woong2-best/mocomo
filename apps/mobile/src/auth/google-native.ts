import { Platform, TurboModuleRegistry } from "react-native";
import { ApiError, apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import { GOOGLE_WEB_CLIENT_ID } from "@/config/env";
import type { MobileAuthUser } from "@/auth/types";
import { translate } from "@/i18n/runtime";

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
  constructor(message = translate("m.auth.google_native_sign_in_unavailable_on_device")) {
    super(message);
    this.name = "GoogleNativeUnavailableError";
  }
}

export class GoogleNativeCancelledError extends Error {
  constructor() {
    super(translate("m.auth.sign_in_was_canceled"));
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
    return translate("m.auth.google_sign_in_is_misconfigured_play");
  }
  return e instanceof Error ? e.message : translate("m.auth.google_sign_in_failed");
}

type GoogleSigninModule =
  typeof import("@react-native-google-signin/google-signin");

let modulePromise: Promise<GoogleSigninModule> | null = null;
let configPromise: Promise<GoogleConfig> | null = null;

type GoogleClientOptions = {
  webClientId: string;
  iosClientId?: string;
  scopes: string[];
  offlineAccess: false;
};

type RNGoogleSigninNative = {
  configure: (params: GoogleClientOptions) => Promise<unknown>;
};

function googleClientOptions(config: GoogleConfig): GoogleClientOptions | null {
  if (!config.webClientId) return null;
  return {
    webClientId: config.webClientId,
    ...(config.iosClientId ? { iosClientId: config.iosClientId } : {}),
    scopes: ["profile", "email"],
    offlineAccess: false,
  };
}

/**
 * `GoogleSignin.configure()` does not return its promise, and `signOut()`
 * does not wait for it. A sign-out that runs first is a no-op, then Android
 * `getSignInIntent()` returns the last account and never shows the chooser.
 */
async function applyGoogleClient(options: GoogleClientOptions): Promise<void> {
  try {
    const native = TurboModuleRegistry.getEnforcing(
      "RNGoogleSignin"
    ) as RNGoogleSigninNative;
    await native.configure(options);
  } catch (e) {
    if (e instanceof GoogleNativeUnavailableError) throw e;
    throw new GoogleNativeUnavailableError(
      e instanceof Error ? e.message : undefined
    );
  }
}

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

async function ensureConfigured(): Promise<{
  mod: GoogleSigninModule;
  options: GoogleClientOptions;
}> {
  const config = await loadConfig();
  const options = googleClientOptions(config);
  if (!config.enabled || !options) {
    throw new GoogleNativeUnavailableError(
      translate("m.auth.google_sign_in_is_not_configured")
    );
  }

  const mod = await loadModule();
  return { mod, options };
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

let googleChooser: Promise<string> | null = null;

/**
 * Open the system Google account chooser and return a fresh ID token.
 * Always signs the SDK out first. Android `getSignInIntent()` otherwise
 * returns the last account immediately and the account list never appears.
 * `forcePicker` is kept for callers; every interactive sign-in shows the chooser.
 */
async function requestGoogleIdToken(_forcePicker: boolean): Promise<string> {
  if (googleChooser) {
    throw new GoogleNativeCancelledError();
  }
  const run = openGoogleAccountChooser();
  googleChooser = run;
  try {
    return await run;
  } finally {
    if (googleChooser === run) googleChooser = null;
  }
}

async function openGoogleAccountChooser(): Promise<string> {
  const { mod, options } = await ensureConfigured();
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
        translate("m.auth.google_play_services_are_unavailable")
      );
    }
  }

  await applyGoogleClient(options);
  try {
    await GoogleSignin.signOut();
  } catch {
    /* nothing cached — still show the chooser */
  }
  // New client after sign-out. getSignInIntent() on the client that just
  // signed out can still return the previous account and skip the chooser.
  await applyGoogleClient(options);

  try {
    const result = await GoogleSignin.signIn();
    if (result.type !== "success") throw new GoogleNativeCancelledError();

    const idToken =
      result.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
    if (!idToken) {
      throw new GoogleNativeUnavailableError(
        translate("m.auth.could_not_get_a_google_auth")
      );
    }
    return idToken;
  } catch (e) {
    if (e instanceof GoogleNativeCancelledError) throw e;
    if (e instanceof GoogleNativeUnavailableError) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleNativeCancelledError();
    }
    if (isInProgressError(e)) {
      throw new GoogleNativeCancelledError();
    }
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GoogleNativeUnavailableError(
        translate("m.auth.google_play_services_are_unavailable")
      );
    }
    if (isGoogleDeveloperError(e)) {
      throw new GoogleNativeUnavailableError(googleNativeFailureMessage(e));
    }
    throw e instanceof Error ? e : new Error(googleNativeFailureMessage(e));
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
  username?: string;
  name?: string;
  password?: string;
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
        username: opts.username,
        name: opts.name,
        password: opts.password,
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
    const { mod, options } = await ensureConfigured();
    await applyGoogleClient(options);
    await mod.GoogleSignin.signOut();
  } catch {
    /* SDK unavailable — nothing to clear */
  }
}
