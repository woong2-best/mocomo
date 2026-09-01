import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import { setTokens } from "@/auth/token-store";
import type { MobileAuthUser } from "@/auth/types";
import { API_BASE_URL } from "@/config/env";

WebBrowser.maybeCompleteAuthSession();

const WEB = API_BASE_URL.replace(/\/$/, "");

export type WebAuthMode = "signup" | "signin";

export type MobileAuthProvider = "gmail" | "naver" | "discord" | "twitter" | "line";

export type OpenWebAuthOptions = {
  /** Add another account without reusing the browser session cookie. */
  addAccount?: boolean;
  /** Jump straight to a provider (via /auth/mobile/oauth). */
  provider?: MobileAuthProvider;
};

/**
 * Open the website auth UI in an AuthSession browser.
 * On success the web redirects to mocomo://oauth?handoff=… with sealed tokens.
 */
export async function openWebAuthSession(
  mode: WebAuthMode,
  options: OpenWebAuthOptions = {}
): Promise<MobileAuthUser> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const redirectUri = Linking.createURL("oauth");
  const completePath =
    `/auth/mobile/oauth/complete?platform=${platform}&from=mobile`;

  const addQs = options.addAccount ? "&addAccount=1" : "";

  const startPath = options.provider
    ? `/auth/mobile/oauth?provider=${encodeURIComponent(options.provider)}` +
      `&mode=${mode}&platform=${platform}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}${addQs}`
    : mode === "signup"
      ? `/auth/signup/apply?from=mobile&platform=${platform}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}${addQs}`
      : `/auth/signin?from=mobile&platform=${platform}` +
        `&callbackUrl=${encodeURIComponent(completePath)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}${addQs}`;

  const result = await WebBrowser.openAuthSessionAsync(`${WEB}${startPath}`, redirectUri, {
    preferEphemeralSession: options.addAccount === true || !!options.provider,
    showInRecents: !options.addAccount && !options.provider,
  });

  if (result.type !== "success" || !result.url) {
    throw new Error(
      result.type === "cancel" || result.type === "dismiss"
        ? "로그인이 취소되었습니다."
        : "로그인을 완료하지 못했습니다."
    );
  }

  const handoff = extractHandoff(result.url);
  if (!handoff) {
    throw new Error("앱 연동 코드를 받지 못했습니다. 다시 시도해 주세요.");
  }

  const data = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: MobileAuthUser;
  }>(MobileApi.auth.oauthPkce, {
    method: "POST",
    auth: false,
    body: { handoff },
  });

  await setTokens(data.accessToken, data.refreshToken, data.user);
  return data.user;
}

function extractHandoff(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("handoff");
    if (fromQuery) return fromQuery;
    if (parsed.hash) {
      const hash = parsed.hash.replace(/^#/, "");
      const hp = new URLSearchParams(hash.startsWith("?") ? hash.slice(1) : hash);
      return hp.get("handoff");
    }
  } catch {
    const m = /[?&#]handoff=([^&]+)/.exec(url);
    if (m?.[1]) return decodeURIComponent(m[1]);
  }
  return null;
}
