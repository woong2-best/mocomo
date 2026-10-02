/** Cloudflare Turnstile — 봇·자동화 스크립트 차단 (X/Twitter 등과 유사한 CAPTCHA 대체) */

export function isTurnstileConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    process.env.TURNSTILE_SECRET_KEY?.trim()
  );
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string | undefined | null,
  options?: { widgetUnavailable?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTurnstileConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Security check isn't configured. Please try again shortly." };
    }
    return { ok: true };
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    if (options?.widgetUnavailable && process.env.NODE_ENV !== "production") {
      return { ok: true };
    }
    return { ok: false, error: "Complete the security check below (confirm you're not a robot)." };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY!.trim();
  const body = new URLSearchParams({
    secret,
    response: trimmed,
  });

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as TurnstileVerifyResponse;
    if (data.success) return { ok: true };
    console.warn("[turnstile] verify failed", data["error-codes"]);
    return { ok: false, error: "Security check failed. Refresh and try again." };
  } catch (e) {
    console.error("[turnstile]", e);
    return { ok: false, error: "Security check server error. Please try again shortly." };
  }
}
