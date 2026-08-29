import * as SecureStore from "expo-secure-store";
import type { MobileAuthUser } from "@/auth/types";

const LEGACY_ACCESS_KEY = "mocomo.access_token";
const LEGACY_REFRESH_KEY = "mocomo.refresh_token";
const ACCOUNTS_KEY = "mocomo.saved_accounts_v1";
const ACTIVE_USER_KEY = "mocomo.active_account_id";
export const MAX_SAVED_ACCOUNTS = 10;

export type SavedMobileAccount = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  accessToken: string;
  refreshToken: string;
  savedAt: number;
};

export type SavedMobileAccountPublic = Omit<
  SavedMobileAccount,
  "accessToken" | "refreshToken"
>;

let accountsCache: SavedMobileAccount[] | undefined;
let activeUserIdCache: string | null | undefined;

function stripTokens(account: SavedMobileAccount): SavedMobileAccountPublic {
  const { accessToken: _a, refreshToken: _r, ...rest } = account;
  return rest;
}

async function readAccountsRaw(): Promise<SavedMobileAccount[]> {
  if (accountsCache !== undefined) return accountsCache;
  try {
    const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY);
    if (!raw) {
      accountsCache = [];
      return accountsCache;
    }
    const parsed = JSON.parse(raw) as SavedMobileAccount[];
    accountsCache = Array.isArray(parsed) ? parsed : [];
    return accountsCache;
  } catch {
    accountsCache = [];
    return accountsCache;
  }
}

async function writeAccountsRaw(accounts: SavedMobileAccount[]): Promise<void> {
  accountsCache = accounts;
  await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function readActiveUserIdRaw(): Promise<string | null> {
  if (activeUserIdCache !== undefined) return activeUserIdCache;
  activeUserIdCache = (await SecureStore.getItemAsync(ACTIVE_USER_KEY)) ?? null;
  return activeUserIdCache;
}

async function writeActiveUserIdRaw(userId: string | null): Promise<void> {
  activeUserIdCache = userId;
  if (userId) {
    await SecureStore.setItemAsync(ACTIVE_USER_KEY, userId);
  } else {
    await SecureStore.deleteItemAsync(ACTIVE_USER_KEY);
  }
}

/** One-time migration from single-token storage. */
export async function migrateLegacySingleToken(): Promise<void> {
  const existing = await readAccountsRaw();
  if (existing.length > 0) return;

  const access = await SecureStore.getItemAsync(LEGACY_ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(LEGACY_REFRESH_KEY);
  if (!access || !refresh) return;

  const account: SavedMobileAccount = {
    userId: "legacy",
    username: "user",
    name: null,
    image: null,
    accessToken: access,
    refreshToken: refresh,
    savedAt: Date.now(),
  };
  await writeAccountsRaw([account]);
  await writeActiveUserIdRaw("legacy");
}

export async function listSavedAccountsPublic(): Promise<SavedMobileAccountPublic[]> {
  const accounts = await readAccountsRaw();
  return accounts
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .map(stripTokens);
}

export async function getActiveAccount(): Promise<SavedMobileAccount | null> {
  const accounts = await readAccountsRaw();
  if (accounts.length === 0) return null;

  const activeId = await readActiveUserIdRaw();
  if (activeId) {
    const hit = accounts.find((a) => a.userId === activeId);
    if (hit) return hit;
  }
  return accounts[0] ?? null;
}

export async function saveAccountSession(
  user: Pick<MobileAuthUser, "id" | "username" | "name" | "image">,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const accounts = await readAccountsRaw();
  const next: SavedMobileAccount = {
    userId: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    accessToken,
    refreshToken,
    savedAt: Date.now(),
  };
  const rest = accounts.filter((a) => a.userId !== user.id);
  const merged = [next, ...rest].slice(0, MAX_SAVED_ACCOUNTS);
  await writeAccountsRaw(merged);
  await writeActiveUserIdRaw(user.id);

  await SecureStore.deleteItemAsync(LEGACY_ACCESS_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(LEGACY_REFRESH_KEY).catch(() => undefined);
}

export async function activateAccount(userId: string): Promise<SavedMobileAccount | null> {
  const accounts = await readAccountsRaw();
  const hit = accounts.find((a) => a.userId === userId);
  if (!hit) return null;
  await writeActiveUserIdRaw(userId);
  const bumped = accounts.map((a) =>
    a.userId === userId ? { ...a, savedAt: Date.now() } : a
  );
  await writeAccountsRaw(bumped);
  return hit;
}

export async function removeAccount(userId: string): Promise<SavedMobileAccount | null> {
  const accounts = await readAccountsRaw();
  const activeId = await readActiveUserIdRaw();
  const next = accounts.filter((a) => a.userId !== userId);
  await writeAccountsRaw(next);

  if (activeId === userId) {
    const fallback = next[0]?.userId ?? null;
    await writeActiveUserIdRaw(fallback);
    return next[0] ?? null;
  }
  return (await getActiveAccount()) ?? null;
}

export async function clearAllAccounts(): Promise<void> {
  accountsCache = [];
  activeUserIdCache = null;
  await SecureStore.deleteItemAsync(ACCOUNTS_KEY);
  await SecureStore.deleteItemAsync(ACTIVE_USER_KEY);
  await SecureStore.deleteItemAsync(LEGACY_ACCESS_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(LEGACY_REFRESH_KEY).catch(() => undefined);
}

/** Instant avatar on cold start — full profile arrives from /me shortly after. */
export function savedAccountToCachedUser(
  account: SavedMobileAccount
): MobileAuthUser {
  return {
    id: account.userId,
    username: account.username,
    name: account.name,
    image: account.image,
  };
}

export async function getCachedActiveUser(): Promise<MobileAuthUser | null> {
  const active = await getActiveAccount();
  if (!active || active.userId === "legacy") return null;
  return savedAccountToCachedUser(active);
}

export async function patchActiveAccountProfile(
  user: Pick<MobileAuthUser, "id" | "username" | "name" | "image">
): Promise<void> {
  const accounts = await readAccountsRaw();
  const idx = accounts.findIndex((a) => a.userId === user.id);
  if (idx < 0) return;
  accounts[idx] = {
    ...accounts[idx]!,
    username: user.username,
    name: user.name,
    image: user.image,
    savedAt: Date.now(),
  };
  await writeAccountsRaw(accounts);
}
