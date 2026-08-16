/**
 * Active session tokens — backed by multi-account store.
 */
import {
  getActiveAccount,
  migrateLegacySingleToken,
  saveAccountSession,
  removeAccount,
  clearAllAccounts,
  type SavedMobileAccount,
} from "@/auth/account-store";
import type { MobileAuthUser } from "@/auth/types";

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
  user?: Pick<MobileAuthUser, "id" | "username" | "name" | "image">
): Promise<void> {
  if (user) {
    await saveAccountSession(user, access, refresh);
    return;
  }
  const active = await getActiveAccount();
  if (active) {
    await saveAccountSession(
      {
        id: active.userId,
        username: active.username,
        name: active.name,
        image: active.image,
      },
      access,
      refresh
    );
  }
}

export async function clearTokens(): Promise<void> {
  await clearAllAccounts();
}

export async function logoutCurrentAccount(): Promise<SavedMobileAccount | null> {
  const active = await getActiveAccount();
  if (!active) {
    await clearAllAccounts();
    return null;
  }
  return removeAccount(active.userId);
}
