/** 회원가입 2단계 — 자체 퀴즈(무료). Cloudflare Turnstile과 분리 */

export function isSignupHumanVerifyRequired(): boolean {
  return true;
}

/** @deprecated Turnstile은 회원가입에서 사용하지 않음 */
export function isSignupTurnstileRequired(): boolean {
  return false;
}
