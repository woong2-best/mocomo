/**
 * Secure token storage for mobile Bearer auth (Phase 1 backend).
 * Cookie sessions are web-only — never rely on WebView cookies here.
 *
 * In-memory cache avoids repeated SecureStore bridge round-trips on every API call
 * (cold start used to hit SecureStore twice before first feed request).
 */
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "mocomo.access_token";
const REFRESH_KEY = "mocomo.refresh_token";

/** `undefined` = not hydrated from SecureStore yet */
let accessCache: string | null | undefined;
let refreshCache: string | null | undefined;

export async function getAccessToken(): Promise<string | null> {
  if (accessCache !== undefined) return accessCache;
  accessCache = await SecureStore.getItemAsync(ACCESS_KEY);
  return accessCache;
}

export async function getRefreshToken(): Promise<string | null> {
  if (refreshCache !== undefined) return refreshCache;
  refreshCache = await SecureStore.getItemAsync(REFRESH_KEY);
  return refreshCache;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  accessCache = access;
  refreshCache = refresh;
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  accessCache = null;
  refreshCache = null;
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
