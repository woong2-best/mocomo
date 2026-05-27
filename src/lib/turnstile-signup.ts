/** 회원가입 Turnstile — Vercel에 `NEXT_PUBLIC_TURNSTILE_SIGNUP_ENABLED=1` 일 때만 필수 */

export function isSignupTurnstileRequired(): boolean {
  return process.env.NEXT_PUBLIC_TURNSTILE_SIGNUP_ENABLED === "1";
}
