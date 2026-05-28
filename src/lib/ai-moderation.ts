/**
 * 라이브 채팅 AI 검열 (OpenAI Moderation API).
 * OPENAI_API_KEY 없으면 로컬 필터만 사용합니다.
 */

export async function moderateChatWithAi(text: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
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
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn("[ai-moderation] API", res.status);
      return { ok: true };
    }

    const data = (await res.json()) as {
      results?: { flagged?: boolean; categories?: Record<string, boolean> }[];
    };
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
  } catch (e) {
    console.warn("[ai-moderation]", e);
    return { ok: true };
  }
}
