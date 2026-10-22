import Constants from "expo-constants";

type Extra = {
  apiBaseUrl?: string;
  socketUrl?: string;
  googleWebClientId?: string;
  facebookAppId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Production API host. Override via app.json `extra` or EXPO_PUBLIC_* later. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? "https://mocomo.net";

const SOCKET_FALLBACK_URL = "https://mocomo-socket.onrender.com";

const SITE_SOCKET_HOSTS = new Set([
  "mocomo.net",
  "www.mocomo.net",
  "app.mocomo.net",
  "studio.mocomo.net",
]);

/** Site hosts do not run Socket.IO. Match the web client and use the Render server. */
function resolveSocketUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const host = new URL(trimmed).hostname;
    if (SITE_SOCKET_HOSTS.has(host)) return SOCKET_FALLBACK_URL;
  } catch {
    return trimmed;
  }
  return trimmed;
}

export const SOCKET_URL = resolveSocketUrl(
  process.env.EXPO_PUBLIC_SOCKET_URL ?? extra.socketUrl ?? API_BASE_URL
);

export const APP_PACKAGE_ID = "net.mocomo.app";

/** Same web OAuth client as server `AUTH_GOOGLE_ID` — offline fallback for native SDK. */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  extra.googleWebClientId ??
  null;

/** Meta app id for Instagram Stories attribution. Falls back to the package id. */
export const FACEBOOK_APP_ID =
  (process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? extra.facebookAppId ?? "").trim() ||
  APP_PACKAGE_ID;
