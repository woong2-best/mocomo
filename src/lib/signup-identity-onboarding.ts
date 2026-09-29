import { cookies } from "next/headers";

export const NEEDS_SIGNUP_IDENTITY_COOKIE = "mocomo_needs_signup_identity";

export async function markSignupNeedsIdentity() {
  const jar = await cookies();
  jar.set(NEEDS_SIGNUP_IDENTITY_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60,
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function clearSignupNeedsIdentity() {
  const jar = await cookies();
  jar.delete(NEEDS_SIGNUP_IDENTITY_COOKIE);
}

export async function hasSignupNeedsIdentityCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(NEEDS_SIGNUP_IDENTITY_COOKIE)?.value === "1";
}

export function signupIdentityEntryPath(dest?: string | null): string {
  const path = dest?.trim() ?? "";
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/auth/complete-profile?dest=${encodeURIComponent(safe)}`;
}

export function signupPasswordEntryPath(dest?: string | null): string {
  const path = dest?.trim() ?? "";
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/auth/complete-password?dest=${encodeURIComponent(safe)}`;
}

export function signupIdentityContinuePath(dest?: string | null): string {
  const path = dest?.trim() ?? "";
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/auth/complete-avatar?dest=${encodeURIComponent(safe)}`;
}
