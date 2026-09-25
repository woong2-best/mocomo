import { Platform } from "react-native";
import Constants from "expo-constants";
import { ApiError, apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { MobileAuthUser } from "@/auth/types";

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
  constructor(message = "이 기기에서는 네이티브 로그인을 사용할 수 없습니다.") {
    super(message);
    this.name = "NativeOAuthUnavailableError";
  }
}

export class NativeOAuthCancelledError extends Error {
  constructor() {
    super("로그인이 취소되었습니다.");
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
      throw new NativeOAuthUnavailableError("네이버 네이티브 로그인이 설정되지 않았습니다.");
    }
    try {
      const mod = await import("@package-kr/react-native-naver-signin");
      const token = await mod.login();
      accessToken =
        typeof token === "string"
          ? token
          : (token as { accessToken?: string })?.accessToken;
      if (!accessToken) {
        throw new NativeOAuthUnavailableError("네이버 토큰을 받지 못했습니다.");
      }
    } catch (e) {
      if (e instanceof NativeOAuthCancelledError) throw e;
      if (e instanceof NativeOAuthUnavailableError) throw e;
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/cancel/i.test(msg)) throw new NativeOAuthCancelledError();
      throw new NativeOAuthUnavailableError(
        msg || "네이버 네이티브 로그인을 사용할 수 없습니다."
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
      throw new NativeOAuthUnavailableError("LINE 네이티브 로그인이 설정되지 않았습니다.");
    }
    try {
      const Line = await import("@xmartlabs/react-native-line");
      await Line.setup({ channelId });
      const result = await Line.login({ scopes: ["profile"] });
      accessToken =
        result?.accessToken?.accessToken ??
        (result as { accessToken?: string })?.accessToken;
      if (!accessToken) {
        throw new NativeOAuthUnavailableError("LINE 토큰을 받지 못했습니다.");
      }
    } catch (e) {
      if (e instanceof NativeOAuthCancelledError) throw e;
      if (e instanceof NativeOAuthUnavailableError) throw e;
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/cancel/i.test(msg)) throw new NativeOAuthCancelledError();
      throw new NativeOAuthUnavailableError(
        msg || "LINE 네이티브 로그인을 사용할 수 없습니다."
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
