import { usedCategoryLabel } from "@/lib/used-market";
import { usedProductTypeLabel } from "@/lib/used-catalog";

export type UsedListingAiInput = {
  images: string[];
  category?: string;
  productType?: string;
  workTitle?: string;
  region?: string;
  saleType?: "FIXED" | "AUCTION";
  isFree?: boolean;
  partialTitle?: string;
  partialDescription?: string;
};

export type UsedListingAiDraft = {
  title: string;
  description: string;
  suggestedPrice: number | null;
};

function geminiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ""
  );
}

function openaiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

export function isUsedListingAiConfigured() {
  return !!(geminiKey() || openaiKey());
}

function buildPrompt(input: UsedListingAiInput): string {
  const categoryLabel = input.category ? usedCategoryLabel(input.category) : "미정";
  const productLabel = usedProductTypeLabel(input.productType) || "미정";
  const saleLabel =
    input.isFree ? "나눔(무료)" : input.saleType === "AUCTION" ? "경매" : "일반 판매";

  return [
    "당신은 한국 중고거래 앱(당근마켓·MoCoMo)의 판매 글 작성 도우미입니다.",
    "업로드된 사진과 메모를 바탕으로 구매자가 신뢰할 수 있는 판매 글 초안을 작성하세요.",
    "",
    "규칙:",
    "- 제목: 8~40자, 핵심 품목·상태·작품명 포함, 과장·클릭베이트 금지",
    "- 설명: 3~6문단, 상태/구성품/하자/거래 방식(직거래·택배)을 구체적으로",
    "- 애니·굿즈·피규어·코스프레 맥락이면 작품명·캐릭터를 자연스럽게 반영",
    "- 확실하지 않은 정보는 추측하지 말고 「확인 필요」로 표기",
    "- 이모지는 0~2개만, 친근하지만 정중한 말투",
    input.isFree
      ? "- 가격 제안은 null (나눔)"
      : "- suggestedPrice: 합리적인 원화 정수 (시장가 참고, 없으면 null)",
    "",
    `카테고리: ${categoryLabel}`,
    `상품 종류: ${productLabel}`,
    `작품/IP: ${input.workTitle?.trim() || "미입력"}`,
    `거래 지역: ${input.region?.trim() || "미입력"}`,
    `판매 방식: ${saleLabel}`,
    input.partialTitle?.trim() ? `사용자 제목 메모: ${input.partialTitle.trim()}` : "",
    input.partialDescription?.trim()
      ? `사용자 설명 메모: ${input.partialDescription.trim()}`
      : "",
    "",
    'JSON만 반환: {"title":"...","description":"...","suggestedPrice":숫자 또는 null}',
  ]
    .filter(Boolean)
    .join("\n");
}

function parseDraft(raw: string): UsedListingAiDraft | null {
  const trimmed = raw.trim();
  const jsonBlock = trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonBlock) return null;
  try {
    const data = JSON.parse(jsonBlock) as {
      title?: unknown;
      description?: unknown;
      suggestedPrice?: unknown;
    };
    const title = typeof data.title === "string" ? data.title.trim().slice(0, 80) : "";
    const description =
      typeof data.description === "string" ? data.description.trim().slice(0, 2000) : "";
    if (!title || !description) return null;

    let suggestedPrice: number | null = null;
    if (typeof data.suggestedPrice === "number" && Number.isFinite(data.suggestedPrice)) {
      suggestedPrice = Math.max(0, Math.round(data.suggestedPrice));
    }

    return { title, description, suggestedPrice };
  } catch {
    return null;
  }
}

async function fetchImageInline(
  url: string
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) return null;
    return { mimeType, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

/** Google Gemini — AI Studio 무료 키 (카드 없이 발급 가능) */
async function generateWithGemini(
  input: UsedListingAiInput,
  images: string[]
): Promise<{ draft?: UsedListingAiDraft; error?: string }> {
  const key = geminiKey();
  if (!key) return { error: "GEMINI_API_KEY 없음" };

  const prompt = buildPrompt(input);
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: prompt },
  ];

  for (const url of images) {
    const inline = await fetchImageInline(url);
    if (inline) {
      parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.data } });
    }
  }

  if (parts.length < 2) {
    return { error: "사진을 불러오지 못했습니다. 업로드가 끝난 뒤 다시 시도해 주세요." };
  }

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
  ];
  let lastError = "AI 글 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 900,
              responseMimeType: "application/json",
            },
            contents: [{ role: "user", parts }],
          }),
          signal: AbortSignal.timeout(45_000),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("[used-listing-ai] gemini", model, res.status, errText.slice(0, 200));
        const nextError =
          res.status === 429
            ? "무료 AI 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
            : res.status === 403
              ? "Gemini API 키가 유효하지 않습니다. Vercel GEMINI_API_KEY를 확인해 주세요."
              : res.status === 404
                ? null
                : "AI 글 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        if (nextError && (res.status === 429 || res.status === 403 || lastError.includes("실패"))) {
          lastError = nextError;
        }
        continue;
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
      if (!content) {
        lastError = "AI 응답이 비어 있습니다.";
        continue;
      }

      const draft = parseDraft(content);
      if (!draft) {
        lastError = "AI 응답을 해석하지 못했습니다.";
        continue;
      }

      if (input.isFree) draft.suggestedPrice = null;
      return { draft };
    } catch (e) {
      console.warn("[used-listing-ai] gemini", model, e);
      lastError = "AI 요청 시간이 초과되었습니다.";
    }
  }

  return { error: lastError };
}

async function generateWithOpenAI(
  input: UsedListingAiInput,
  images: string[]
): Promise<{ draft?: UsedListingAiDraft; error?: string }> {
  const key = openaiKey();
  if (!key) return { error: "OPENAI_API_KEY 없음" };

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" } }
  > = [{ type: "text", text: buildPrompt(input) }];

  for (const url of images) {
    userContent.push({
      type: "image_url",
      image_url: { url, detail: "low" },
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "중고거래 판매 글 초안만 작성합니다. 반드시 유효한 JSON 객체 하나만 출력합니다.",
          },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      return { error: "AI 글 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { error: "AI 응답이 비어 있습니다." };

    const draft = parseDraft(content);
    if (!draft) return { error: "AI 응답을 해석하지 못했습니다." };
    if (input.isFree) draft.suggestedPrice = null;
    return { draft };
  } catch {
    return { error: "AI 요청 시간이 초과되었습니다." };
  }
}

export async function generateUsedListingDraft(
  input: UsedListingAiInput
): Promise<{ draft?: UsedListingAiDraft; error?: string }> {
  if (!isUsedListingAiConfigured()) {
    return {
      error:
        "AI 키가 없습니다. Vercel에 GEMINI_API_KEY(무료)를 추가해 주세요. aistudio.google.com/apikey 에서 발급",
    };
  }

  const images = input.images
    .filter((u) => typeof u === "string" && u.startsWith("https://"))
    .slice(0, 4);

  if (images.length === 0) {
    return { error: "AI 글쓰기는 업로드된 사진이 1장 이상 필요합니다." };
  }

  if (geminiKey()) {
    const gemini = await generateWithGemini(input, images);
    if (gemini.draft || !openaiKey()) return gemini;
  }

  if (openaiKey()) {
    return generateWithOpenAI(input, images);
  }

  return { error: "AI 설정을 확인해 주세요." };
}
