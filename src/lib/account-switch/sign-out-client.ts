"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { removeSavedAccount } from "@/lib/account-switch/client";
import { clearAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

/**
 * Web logout — purge server cookies (incl. legacy/chunks), sync client session, hard navigate.
 * next-auth/react signOut alone can leave stale session cookies that restore login on refresh.
 */
export async function performWebSignOut(options?: {
  callbackUrl?: string;
  userId?: string;
}) {
  const callbackUrl = options?.callbackUrl ?? DEFAULT_LANDING_PATH;

  if (options?.userId) {
    removeSavedAccount(options.userId);
  }

  clearAddAccountFlowCookie();

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Best-effort server purge; client signOut + navigation still run.
  }

  try {
    await nextAuthSignOut({ redirect: false });
  } catch {
    // Hard navigation below is the source of truth for logged-out UI.
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
