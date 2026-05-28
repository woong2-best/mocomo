/** 회원가입 사람 확인 — Site Key·Secret이 있으면 별도 `/auth/signup/verify` 페이지 사용 */

export function isSignupHumanVerifyRequired(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    process.env.TURNSTILE_SECRET_KEY?.trim()
  );
}

/** @deprecated use isSignupHumanVerifyRequired */
export function isSignupTurnstileRequired(): boolean {
  return isSignupHumanVerifyRequired();
}
