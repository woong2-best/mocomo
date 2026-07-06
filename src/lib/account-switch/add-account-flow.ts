import { ADD_ACCOUNT_COOKIE } from "@/lib/account-switch/constants";

export { ADD_ACCOUNT_COOKIE };

export function setAddAccountFlowCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${ADD_ACCOUNT_COOKIE}=1; path=/; max-age=3600; samesite=lax`;
}

export function clearAddAccountFlowCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${ADD_ACCOUNT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function hasAddAccountFlowCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim() === `${ADD_ACCOUNT_COOKIE}=1`);
}

export function isAddAccountFlow(searchParams?: URLSearchParams | { get(name: string): string | null }) {
  if (searchParams?.get("addAccount") === "1") return true;
  return hasAddAccountFlowCookie();
}

export async function finishAddAccountFlow() {
  if (!hasAddAccountFlowCookie()) return false;
  const { exportCurrentAccount } = await import("@/lib/account-switch/client");
  await exportCurrentAccount();
  clearAddAccountFlowCookie();
  return true;
}
