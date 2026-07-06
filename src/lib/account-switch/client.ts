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
  switchToken: string;
  savedAt: number;
};

export type AccountExportPayload = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  switchToken: string;
};

function readRaw(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNT_SWITCH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(accounts: SavedAccount[]) {
  localStorage.setItem(ACCOUNT_SWITCH_STORAGE_KEY, JSON.stringify(accounts));
}

export function listSavedAccounts(): SavedAccount[] {
  return readRaw().sort((a, b) => b.savedAt - a.savedAt);
}

export function upsertSavedAccount(account: AccountExportPayload) {
  const next: SavedAccount = {
    ...account,
    savedAt: Date.now(),
  };
  const rest = readRaw().filter((a) => a.userId !== account.userId);
  const merged = [next, ...rest].slice(0, MAX_SAVED_ACCOUNTS);
  writeRaw(merged);
}

export function removeSavedAccount(userId: string) {
  writeRaw(readRaw().filter((a) => a.userId !== userId));
}

export async function exportCurrentAccount(): Promise<AccountExportPayload | null> {
  const res = await fetch("/api/auth/accounts/export", { method: "GET", credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as AccountExportPayload & { ok?: boolean };
  if (!data.userId || !data.switchToken) return null;
  upsertSavedAccount(data);
  return data;
}

export async function switchToAccount(account: SavedAccount): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/accounts/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userId: account.userId,
      switchToken: account.switchToken,
    }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    switchToken?: string;
    user?: { id: string; username: string; name: string | null; image: string | null };
  };
  if (!res.ok || !data.ok) {
    if (data.error === "INVALID_TOKEN" || data.error === "USER_MISMATCH") {
      removeSavedAccount(account.userId);
    }
    return { ok: false, error: data.error ?? "SWITCH_FAILED" };
  }
  upsertSavedAccount({
    userId: account.userId,
    username: data.user?.username ?? account.username,
    name: data.user?.name ?? account.name,
    image: data.user?.image ?? account.image,
    switchToken: data.switchToken ?? account.switchToken,
  });
  return { ok: true };
}
