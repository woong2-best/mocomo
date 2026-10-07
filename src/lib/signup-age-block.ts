import { cookies } from "next/headers";
import { ageFromBirthDate } from "@/lib/adult-verification/is-verified";

export const SIGNUP_AGE_BLOCK_COOKIE = "mocomo_signup_age_block";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 10;

export const SIGNUP_AGE_BLOCKED_MESSAGE = "This feature is not available.";

export function isUnder13(birthDate: Date, at = new Date()): boolean {
  return ageFromBirthDate(birthDate, at) < 13;
}

export async function isSignupAgeBlocked(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(SIGNUP_AGE_BLOCK_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

export async function persistSignupAgeBlock(): Promise<void> {
  const jar = await cookies();
  jar.set(SIGNUP_AGE_BLOCK_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  });
}

export async function assertSignupAgeAllowed(birthDate: Date): Promise<{ error: string } | null> {
  if (await isSignupAgeBlocked()) {
    return { error: SIGNUP_AGE_BLOCKED_MESSAGE };
  }
  if (isUnder13(birthDate)) {
    await persistSignupAgeBlock();
    return { error: SIGNUP_AGE_BLOCKED_MESSAGE };
  }
  return null;
}
