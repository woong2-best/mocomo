/**
 * Active session tokens — backed by multi-account store.
 */
import {
  getActiveAccount,
  migrateLegacySingleToken,
  saveAccountSession,
  removeAccount,
  clearAllAccounts,
} from "@/auth/account-store";
import type { MobileAuthUser } from "@/auth/types";

let authEpoch = 0;

/** Bumped on logout so an in-flight refresh cannot write the session back. */
export function currentAuthEpoch(): number {
  return authEpoch;
}

export function invalidateAuthSession(): void {
  authEpoch += 1;
}

export async function getAccessToken(): Promise<string | null> {
  await migrateLegacySingleToken();
  const active = await getActiveAccount();
  return active?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  await migrateLegacySingleToken();
  const active = await getActiveAccount();
  return active?.refreshToken ?? null;
}

export async function setTokens(
  access: string,
  refresh: string,
  user?: Pick<MobileAuthUser, "id" | "username" | "name" | "image">,
  epoch: number = currentAuthEpoch()
): Promise<void> {
  const allow = () => epoch === authEpoch;
  if (!allow()) return;
  if (user) {
    await saveAccountSession(user, access, refresh, allow);
    return;
  }
  const active = await getActiveAccount();
  if (!allow() || !active) return;
  await saveAccountSession(
    {
      id: active.userId,
      username: active.username,
      name: active.name,
      image: active.image,
    },
    access,
    refresh,
    allow
  );
}

export async function clearTokens(): Promise<void> {
  await clearAllAccounts();
}

export async function logoutCurrentAccount(): Promise<void> {
  const active = await getActiveAccount();
  if (!active) return;
  await removeAccount(active.userId);
}
