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
  token: string | undefined | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTurnstileConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[turnstile] Production without TURNSTILE keys — email rate limits only");
    }
    return { ok: true };
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    return { ok: false, error: "아래 보안 확인(로봇이 아님)을 완료해 주세요." };
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
    return { ok: false, error: "보안 확인에 실패했습니다. 새로고침 후 다시 시도해 주세요." };
  } catch (e) {
    console.error("[turnstile]", e);
    return { ok: false, error: "보안 확인 서버 오류입니다. 잠시 후 다시 시도해 주세요." };
  }
}
