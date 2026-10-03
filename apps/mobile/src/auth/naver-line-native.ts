import { Platform } from "react-native";
import Constants from "expo-constants";
import { ApiError, apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { MobileAuthUser } from "@/auth/types";
import { translate } from "@/i18n/runtime";

export type NativeOAuthProfile = {
  email: string | null;
  name: string | null;
  image: string | null;
};

export type NativeOAuthResult =
  | {
      status: "signedIn";
      created: boolean;
      user: MobileAuthUser;
      accessToken: string;
      refreshToken: string;
    }
  | { status: "needsSignup"; profile: NativeOAuthProfile };

export class NativeOAuthUnavailableError extends Error {
  constructor(message = translate("m.auth.native_sign_in_unavailable_on_device")) {
    super(message);
    this.name = "NativeOAuthUnavailableError";
  }
}

export class NativeOAuthCancelledError extends Error {
  constructor() {
    super(translate("m.auth.sign_in_was_canceled"));
    this.name = "NativeOAuthCancelledError";
  }
}

type Extra = {
  naverClientId?: string;
  naverClientSecret?: string;
  naverUrlScheme?: string;
  lineChannelId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function naverClientId(): string | null {
  return (
    process.env.EXPO_PUBLIC_NAVER_CLIENT_ID?.trim() ||
    extra.naverClientId?.trim() ||
    null
  );
}

function lineChannelId(): string | null {
  return (
    process.env.EXPO_PUBLIC_LINE_CHANNEL_ID?.trim() ||
    extra.lineChannelId?.trim() ||
    null
  );
}

export type NativeOAuthSignupConsent = {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

async function exchangeAccessToken(
  path: string,
  accessToken: string,
  flow: "signin" | "signup",
  consent?: NativeOAuthSignupConsent
): Promise<NativeOAuthResult & { accessToken: string }> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  try {
    const data = await apiRequest<NativeOAuthResult>(path, {
      method: "POST",
      auth: false,
      body: { accessToken, flow, platform, ...consent },
    });
    return { ...data, accessToken };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status >= 500)) {
      throw new NativeOAuthUnavailableError();
    }
    throw e;
  }
}

/** Native Naver Login SDK → server token exchange. Falls back via UnavailableError. */
export async function authenticateWithNaverNative(opts: {
  flow: "signin" | "signup";
  accessToken?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}): Promise<NativeOAuthResult & { accessToken: string }> {
  let accessToken = opts.accessToken;
  if (!accessToken) {
    const clientId = naverClientId();
    if (!clientId) {
      throw new NativeOAuthUnavailableError(translate("m.auth.naver_native_sign_in_is_not"));
    }
    try {
      const mod = await import("@package-kr/react-native-naver-signin");
      const token = await mod.login();
      accessToken =
        typeof token === "string"
          ? token
          : (token as { accessToken?: string })?.accessToken;
      if (!accessToken) {
        throw new NativeOAuthUnavailableError(translate("m.auth.could_not_get_a_naver_token"));
      }
    } catch (e) {
      if (e instanceof NativeOAuthCancelledError) throw e;
      if (e instanceof NativeOAuthUnavailableError) throw e;
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/cancel/i.test(msg)) throw new NativeOAuthCancelledError();
      throw new NativeOAuthUnavailableError(
        msg || translate("m.auth.naver_native_sign_in_is_unavailable")
      );
    }
  }
  return exchangeAccessToken(
    MobileApi.auth.naver,
    accessToken,
    opts.flow,
    opts.flow === "signup" && opts.birthYear
      ? {
          birthYear: opts.birthYear,
          birthMonth: opts.birthMonth ?? 0,
          birthDay: opts.birthDay ?? 0,
          termsAccepted: opts.termsAccepted === true,
          privacyAccepted: opts.privacyAccepted === true,
        }
      : undefined
  );
}

/** Native LINE Login SDK → server token exchange. */
export async function authenticateWithLineNative(opts: {
  flow: "signin" | "signup";
  accessToken?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}): Promise<NativeOAuthResult & { accessToken: string }> {
  let accessToken = opts.accessToken;
  if (!accessToken) {
    const channelId = lineChannelId();
    if (!channelId) {
      throw new NativeOAuthUnavailableError(translate("m.auth.line_native_sign_in_is_not"));
    }
    try {
      const Line = await import("@xmartlabs/react-native-line");
      await Line.setup({ channelId });
      const result = await Line.login({ scopes: ["profile"] });
      const tokenField = result?.accessToken;
      accessToken =
        typeof tokenField === "string"
          ? tokenField
          : tokenField && typeof tokenField === "object"
            ? tokenField.accessToken
            : undefined;
      if (!accessToken) {
        throw new NativeOAuthUnavailableError(translate("m.auth.could_not_get_a_line_token"));
      }
    } catch (e) {
      if (e instanceof NativeOAuthCancelledError) throw e;
      if (e instanceof NativeOAuthUnavailableError) throw e;
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/cancel/i.test(msg)) throw new NativeOAuthCancelledError();
      throw new NativeOAuthUnavailableError(
        msg || translate("m.auth.line_native_sign_in_is_unavailable")
      );
    }
  }
  return exchangeAccessToken(
    MobileApi.auth.line,
    accessToken,
    opts.flow,
    opts.flow === "signup" && opts.birthYear
      ? {
          birthYear: opts.birthYear,
          birthMonth: opts.birthMonth ?? 0,
          birthDay: opts.birthDay ?? 0,
          termsAccepted: opts.termsAccepted === true,
          privacyAccepted: opts.privacyAccepted === true,
        }
      : undefined
  );
}
