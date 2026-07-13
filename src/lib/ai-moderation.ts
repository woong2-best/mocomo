/**
 * 라이브 채팅 AI 검열 (OpenAI Moderation API).
 * OPENAI_API_KEY 없으면 로컬 필터만 사용합니다.
 */

export type ModerationCategories = Record<string, boolean>;

export type ModerationResult =
  | { ok: true; categories?: ModerationCategories }
  | { ok: false; error: string; categories?: ModerationCategories };

function parseModerationResult(data: {
  results?: { flagged?: boolean; categories?: Record<string, boolean> }[];
}): ModerationResult {
  const result = data.results?.[0];
  const categories = result?.categories ?? {};
  if (!result?.flagged) return { ok: true, categories };

  if (categories.sexual || categories["sexual/minors"]) {
    return { ok: false, error: "음란·선정적 표현이 감지되어 전송할 수 없습니다.", categories };
  }
  if (categories.harassment || categories["harassment/threatening"]) {
    return { ok: false, error: "괴롭힘·욕설이 감지되어 전송할 수 없습니다.", categories };
  }
  if (categories.hate) {
    return { ok: false, error: "혐오 표현이 감지되어 전송할 수 없습니다.", categories };
  }
  if (categories.violence || categories["violence/graphic"]) {
    return { ok: false, error: "폭력적 표현이 감지되어 전송할 수 없습니다.", categories };
  }
  return { ok: false, error: "부적절한 내용이 감지되어 전송할 수 없습니다.", categories };
}

async function callModerationApi(text: string, timeoutMs: number): Promise<ModerationResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: true };

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
      return { ok: true };
    }

    const data = (await res.json()) as {
      results?: { flagged?: boolean; categories?: Record<string, boolean> }[];
    };
    return parseModerationResult(data);
  } catch (e) {
    console.warn("[ai-moderation]", e);
    return { ok: true };
  }
}

export async function moderateChatWithAi(text: string): Promise<ModerationResult> {
  return callModerationApi(text, 8000);
}

/** 라이브 채팅 — 1.2초 이내 응답 (느리면 통과) */
export async function moderateLiveChatFast(text: string): Promise<ModerationResult> {
  return callModerationApi(text, 1200);
}
