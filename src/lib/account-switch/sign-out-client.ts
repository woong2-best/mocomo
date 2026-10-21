"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { clearAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";
import { replaceSavedAccounts } from "@/lib/account-switch/client";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

function clearClientOAuthCookies() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const expire = `Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `mocomo_oauth_flow=; ${expire}`;
  document.cookie = `authjs.callback-url=; ${expire}`;
  document.cookie = `__Secure-authjs.callback-url=; ${expire}`;
  document.cookie = `next-auth.callback-url=; ${expire}`;
  document.cookie = `__Secure-next-auth.callback-url=; ${expire}`;
  try {
    sessionStorage.removeItem("mocomo_oauth_signup_continued");
    sessionStorage.removeItem("mocomo_mobile_oauth_signup_continued");
  } catch {
    // ignore
  }
}

/**
 * Web logout.
 * - scope "this": end this account only. If another parked session exists, switch to it and land home.
 * - scope "device": wipe every parked session on this device and go to a clean sign-in.
 */
export async function performWebSignOut(options?: {
  callbackUrl?: string;
  userId?: string;
  scope?: "this" | "device";
  autoSwitch?: boolean;
}) {
  const scope = options?.scope ?? "this";
  const autoSwitch = options?.autoSwitch ?? true;

  clearAddAccountFlowCookie();
  clearClientOAuthCookies();

  let switched = false;
  try {
    const res = await fetch("/api/auth/accounts/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, autoSwitch }),
    });
    if (res.ok) {
      const data = (await res.json()) as { switched?: boolean };
      switched = data.switched === true;
    }
  } catch {
    // Client signOut + hard navigation still run.
  }

  if (scope === "device") {
    replaceSavedAccounts([]);
  }

  if (switched) {
    window.location.replace(DEFAULT_LANDING_PATH);
    return;
  }

  try {
    await nextAuthSignOut({ redirect: false });
  } catch {
    // Hard navigation below is the source of truth for logged-out UI.
  }

  window.location.replace(options?.callbackUrl ?? "/auth/signin");
}
