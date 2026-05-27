/** 클라이언트 전용 — NEXT_PUBLIC 키 노출 */

export function isTurnstileConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}
