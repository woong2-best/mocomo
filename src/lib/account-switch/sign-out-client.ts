"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { exportCurrentAccount, listSavedAccounts } from "@/lib/account-switch/client";
import { clearAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";

function signOutLandingPath(userId?: string): string {
  const saved = listSavedAccounts();
  const hasSaved = saved.length > 0 || Boolean(userId);
  if (!hasSaved) return "/auth/signin";
  const params = new URLSearchParams({ pickAccount: "1" });
  if (userId) params.set("loggedOut", userId);
  return `/auth/signin?${params.toString()}`;
}

async function purgeServerSession() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("LOGOUT_FAILED");
}

async function confirmLoggedOut(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) return true;
    const data = (await res.json()) as { user?: unknown };
    return !data.user;
  } catch {
    return true;
  }
}

/**
 * Web logout — export account for picker, purge server cookies, sync client session, hard navigate.
 * Keeps saved accounts (logged-out account stays in the list) and lands on the account picker.
 */
export async function performWebSignOut(options?: {
  callbackUrl?: string;
  userId?: string;
}) {
  const callbackUrl = options?.callbackUrl ?? signOutLandingPath(options?.userId);

  clearAddAccountFlowCookie();

  // Save switch token before session is destroyed so the account stays switchable.
  try {
    await exportCurrentAccount();
  } catch {
    // Continue — account may already be in localStorage.
  }

  try {
    await purgeServerSession();
  } catch {
    // Retry once; client signOut + hard navigation still run.
    try {
      await purgeServerSession();
    } catch {
      // Best-effort server purge.
    }
  }

  try {
    await nextAuthSignOut({ redirect: false });
  } catch {
    // Hard navigation below is the source of truth for logged-out UI.
  }

  if (!(await confirmLoggedOut())) {
    try {
      await purgeServerSession();
      await nextAuthSignOut({ redirect: false });
    } catch {
      // Proceed with hard navigation.
    }
  }

  window.location.replace(callbackUrl);
}

/**
 * Sign out current session while preserving add-account flow cookies.
 * Do not call /api/auth/logout — that route clears the add-account cookie.
 */
export async function signOutForAddAccount() {
  const { setAddAccountFlowCookie } = await import("@/lib/account-switch/add-account-flow");
  setAddAccountFlowCookie();

  try {
    await fetch("/api/auth/logout?preserveAddAccount=1", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Client signOut below still clears the React session snapshot.
  }

  try {
    await nextAuthSignOut({ redirect: false });
  } catch {
    // OAuth kickoff also clears server session cookies when addAccount=1.
  }
}
