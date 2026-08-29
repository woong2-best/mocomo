import {
  ADD_ACCOUNT_COOKIE,
  ADD_ACCOUNT_SOURCE_USER_COOKIE,
} from "@/lib/account-switch/constants";

export { ADD_ACCOUNT_COOKIE, ADD_ACCOUNT_SOURCE_USER_COOKIE };

const ADD_ACCOUNT_COOKIE_OPTS = "path=/; max-age=3600; samesite=lax";

export function setAddAccountFlowCookie(sourceUserId?: string | null) {
  if (typeof document === "undefined") return;
  document.cookie = `${ADD_ACCOUNT_COOKIE}=1; ${ADD_ACCOUNT_COOKIE_OPTS}`;
  if (sourceUserId) {
    document.cookie = `${ADD_ACCOUNT_SOURCE_USER_COOKIE}=${encodeURIComponent(sourceUserId)}; ${ADD_ACCOUNT_COOKIE_OPTS}`;
  }
}

export function clearAddAccountFlowCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${ADD_ACCOUNT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${ADD_ACCOUNT_SOURCE_USER_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function hasAddAccountFlowCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim() === `${ADD_ACCOUNT_COOKIE}=1`);
}

export function readAddAccountSourceUserIdClient(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${ADD_ACCOUNT_SOURCE_USER_COOKIE}=`;
  const match = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(prefix.length)).trim() || null;
  } catch {
    return null;
  }
}

export async function readAddAccountSourceUserIdServer(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const raw = jar.get(ADD_ACCOUNT_SOURCE_USER_COOKIE)?.value?.trim();
  return raw || null;
}

export function isAddAccountFlow(searchParams?: URLSearchParams | { get(name: string): string | null }) {
  if (searchParams?.get("addAccount") === "1") return true;
  return hasAddAccountFlowCookie();
}

/** Append addAccount=1 (and optional reason) to an auth path. */
export function withAddAccountQuery(path: string, addAccount: boolean, extra?: Record<string, string>): string {
  if (!addAccount && !extra) return path;
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  if (addAccount) params.set("addAccount", "1");
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function isStaleAddAccountSignupSession(
  sessionUserId: string | null | undefined,
  sourceUserId: string | null | undefined
): boolean {
  if (!sessionUserId || !sourceUserId) return false;
  return sessionUserId === sourceUserId;
}

export async function finishAddAccountFlow() {
  if (!hasAddAccountFlowCookie()) return false;
  const { exportCurrentAccount } = await import("@/lib/account-switch/client");
  await exportCurrentAccount();
  clearAddAccountFlowCookie();
  return true;
}

/**
 * Start "create new account" from the account switcher — export, mark flow, sign out, navigate.
 */
export async function beginCreateAccountFlow(sourceUserId?: string | null) {
  const { exportCurrentAccount } = await import("@/lib/account-switch/client");
  const { signOutForAddAccount } = await import("@/lib/account-switch/sign-out-client");

  try {
    await exportCurrentAccount();
  } catch {
    // Continue — account may already be in localStorage.
  }

  setAddAccountFlowCookie(sourceUserId);
  await signOutForAddAccount(sourceUserId);
  window.location.href = withAddAccountQuery("/auth/signup/apply", true);
}

/**
 * Start "add existing account" — export, mark flow, sign out, navigate to sign-in.
 */
export async function beginAddExistingAccountFlow(sourceUserId?: string | null) {
  const { exportCurrentAccount } = await import("@/lib/account-switch/client");
  const { signOutForAddAccount } = await import("@/lib/account-switch/sign-out-client");

  try {
    await exportCurrentAccount();
  } catch {
    // Continue — account may already be in localStorage.
  }

  setAddAccountFlowCookie(sourceUserId);
  await signOutForAddAccount(sourceUserId);
  window.location.href = withAddAccountQuery("/auth/signin", true);
}
