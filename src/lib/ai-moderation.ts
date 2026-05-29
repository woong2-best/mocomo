/**
 * 라이브 채팅 AI 검열 (OpenAI Moderation API).
 * OPENAI_API_KEY 없으면 로컬 필터만 사용합니다.
 */

function parseModerationResult(data: {
  results?: { flagged?: boolean; categories?: Record<string, boolean> }[];
}): { ok: true } | { ok: false; error: string } {
  const result = data.results?.[0];
  if (!result?.flagged) return { ok: true };

  const cats = result.categories ?? {};
  if (cats.sexual || cats["sexual/minors"]) {
    return { ok: false, error: "음란·선정적 표현이 감지되어 전송할 수 없습니다." };
  }
  if (cats.harassment || cats["harassment/threatening"]) {
    return { ok: false, error: "괴롭힘·욕설이 감지되어 전송할 수 없습니다." };
  }
  if (cats.hate) {
    return { ok: false, error: "혐오 표현이 감지되어 전송할 수 없습니다." };
  }
  if (cats.violence || cats["violence/graphic"]) {
    return { ok: false, error: "폭력적 표현이 감지되어 전송할 수 없습니다." };
  }
  return { ok: false, error: "부적절한 내용이 감지되어 전송할 수 없습니다." };
}

async function callModerationApi(text: string, timeoutMs: number) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: true as const };

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      console.warn("[ai-moderation] API", res.status);
      return { ok: true as const };
    }

    const data = (await res.json()) as {
      results?: { flagged?: boolean; categories?: Record<string, boolean> }[];
    };
    return parseModerationResult(data);
  } catch (e) {
    console.warn("[ai-moderation]", e);
    return { ok: true as const };
  }
}

export async function moderateChatWithAi(text: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  return callModerationApi(text, 8000);
}

/** 라이브 채팅 — 1.2초 이내 응답 (느리면 통과) */
export async function moderateLiveChatFast(text: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  return callModerationApi(text, 1200);
}
