"use client";

import { adminLogoutMfaAction } from "@/actions/admin-security";
import { performWebSignOut } from "@/lib/account-switch/sign-out-client";

/** 관리자 세션·MFA·콜백을 지우고 로그인 화면만 남긴다. 자동 재로그인 없음. */
export async function performAdminWebSignOut(reason: "manual" | "expired" = "manual") {
  try {
    await adminLogoutMfaAction();
  } catch {
    /* 이미 만료됐을 수 있다 */
  }
  await performWebSignOut({
    callbackUrl:
      reason === "expired" ? "/auth/signin?error=SessionExpired" : "/auth/signin",
  });
}
