import Constants from "expo-constants";

type Extra = {
  apiBaseUrl?: string;
  socketUrl?: string;
  googleWebClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Production API host. Override via app.json `extra` or EXPO_PUBLIC_* later. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? "https://mocomo.net";

export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ?? extra.socketUrl ?? API_BASE_URL;

export const APP_PACKAGE_ID = "net.mocomo.app";

/** Same web OAuth client as server `AUTH_GOOGLE_ID` — offline fallback for native SDK. */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  extra.googleWebClientId ??
  null;
