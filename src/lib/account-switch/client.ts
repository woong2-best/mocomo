"use client";

import {
  ACCOUNT_SWITCH_STORAGE_KEY,
  MAX_SAVED_ACCOUNTS,
} from "@/lib/account-switch/constants";

export type SavedAccount = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  savedAt: number;
};

export type AccountExportPayload = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
};

type LegacySavedAccount = SavedAccount & { switchToken?: string };

function readRaw(): LegacySavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNT_SWITCH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacySavedAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(accounts: SavedAccount[]) {
  localStorage.setItem(ACCOUNT_SWITCH_STORAGE_KEY, JSON.stringify(accounts));
}

function stripLegacyToken(account: LegacySavedAccount): SavedAccount {
  return {
    userId: account.userId,
    username: account.username,
    name: account.name,
    image: account.image,
    savedAt: account.savedAt,
  };
}

let legacyImportStarted = false;

function importLegacyTokensOnce() {
  if (typeof window === "undefined" || legacyImportStarted) return;
  const raw = readRaw();
  const withTokens = raw.filter((a) => typeof a.switchToken === "string" && a.switchToken.length > 0);
  if (withTokens.length === 0) return;
  legacyImportStarted = true;
  writeRaw(raw.map(stripLegacyToken));
  void fetch("/api/auth/accounts/import-legacy", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accounts: withTokens.map((a) => ({ userId: a.userId, switchToken: a.switchToken })),
    }),
  }).catch(() => undefined);
}

export function listSavedAccounts(): SavedAccount[] {
  importLegacyTokensOnce();
  return readRaw().map(stripLegacyToken).sort((a, b) => b.savedAt - a.savedAt);
}

export function upsertSavedAccount(account: AccountExportPayload) {
  const next: SavedAccount = {
    ...account,
    savedAt: Date.now(),
  };
  const rest = readRaw().filter((a) => a.userId !== account.userId).map(stripLegacyToken);
  writeRaw([next, ...rest].slice(0, MAX_SAVED_ACCOUNTS));
}

export function removeSavedAccount(userId: string) {
  writeRaw(readRaw().filter((a) => a.userId !== userId).map(stripLegacyToken));
}

export function replaceSavedAccounts(accounts: SavedAccount[]) {
  writeRaw(accounts.slice(0, MAX_SAVED_ACCOUNTS));
}

export async function syncSavedAccountsFromServer(): Promise<SavedAccount[]> {
  importLegacyTokensOnce();
  try {
    const res = await fetch("/api/auth/accounts", { credentials: "include" });
    if (!res.ok) return listSavedAccounts();
    const data = (await res.json()) as { accounts?: SavedAccount[] };
    if (!Array.isArray(data.accounts)) return listSavedAccounts();
    replaceSavedAccounts(data.accounts);
    return data.accounts;
  } catch {
    return listSavedAccounts();
  }
}

export async function exportCurrentAccount(): Promise<AccountExportPayload | null> {
  const res = await fetch("/api/auth/accounts/export", { method: "GET", credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as AccountExportPayload & { ok?: boolean };
  if (!data.userId) return null;
  upsertSavedAccount(data);
  return data;
}

export async function switchToAccount(account: SavedAccount): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/accounts/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId: account.userId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    user?: { id: string; username: string; name: string | null; image: string | null };
  };
  if (!res.ok || !data.ok) {
    if (data.error === "NOT_PARKED" || data.error === "OPERATOR") {
      removeSavedAccount(account.userId);
    }
    return { ok: false, error: data.error ?? "SWITCH_FAILED" };
  }
  upsertSavedAccount({
    userId: account.userId,
    username: data.user?.username ?? account.username,
    name: data.user?.name ?? account.name,
    image: data.user?.image ?? account.image,
  });
  return { ok: true };
}

export async function removeAccountFromDevice(userId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/accounts/remove", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return false;
    removeSavedAccount(userId);
    return true;
  } catch {
    return false;
  }
}
