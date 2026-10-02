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
  const categoryLabel = input.category ? usedCategoryLabel(input.category) : "Undecided";
  const productLabel = usedProductTypeLabel(input.productType) || "Undecided";
  const saleLabel =
    input.isFree ? "나눔(무료)" : input.saleType === "AUCTION" ? "경매" : "General sale";

  return [
    "You help write listings for a Korean used-market app (Karrot Market, MoCoMo).",
    "Using uploaded photos and notes, draft a trustworthy listing buyers can rely on.",
    "",
    "Rules:",
    "- title: 8–40 chars; include item, condition, series; no hype or clickbait",
    "- description: 3–6 paragraphs; be specific about condition, included items, defects, and meetup/shipping",
    "- if anime/goods/figure/cosplay context, naturally mention series and character names",
    "- don't guess; mark uncertain details as \"needs verification\"",
    "- use 0–2 emojis; friendly but polite tone",
    input.isFree
      ? "- 가격 제안은 null (나눔)"
      : "- suggestedPrice: reasonable KRW integer (market reference; null if unknown)",
    "",
    `카테고리: ${categoryLabel}`,
    `상품 종류: ${productLabel}`,
    `작품/IP: ${input.workTitle?.trim() || "Not entered"}`,
    `거래 지역: ${input.region?.trim() || "Not entered"}`,
    `판매 방식: ${saleLabel}`,
    input.partialTitle?.trim() ? `사용자 제목 메모: ${input.partialTitle.trim()}` : "",
    input.partialDescription?.trim()
      ? `사용자 설명 메모: ${input.partialDescription.trim()}`
      : "",
    "",
    'Return JSON only: {"title":"...","description":"...","suggestedPrice": number or null}',
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
  if (!key) return { error: "GEMINI_API_KEY missing" };

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
    return { error: "Couldn't load photos. Try again after uploads finish." };
  }

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
  ];
  let lastError = "AI draft generation failed. Please try again shortly.";
  let lastErrorIsGeneric = true;

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
                : "AI draft generation failed. Please try again shortly.";
        if (nextError && (res.status === 429 || res.status === 403 || lastErrorIsGeneric)) {
          lastError = nextError;
          lastErrorIsGeneric = res.status !== 429 && res.status !== 403;
        }
        continue;
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
      if (!content) {
        lastError = "The AI response was empty.";
        lastErrorIsGeneric = false;
        continue;
      }

      const draft = parseDraft(content);
      if (!draft) {
        lastError = "Couldn't parse the AI response.";
        lastErrorIsGeneric = false;
        continue;
      }

      if (input.isFree) draft.suggestedPrice = null;
      return { draft };
    } catch (e) {
      console.warn("[used-listing-ai] gemini", model, e);
      lastError = "The AI request timed out.";
      lastErrorIsGeneric = false;
    }
  }

  return { error: lastError };
}

async function generateWithOpenAI(
  input: UsedListingAiInput,
  images: string[]
): Promise<{ draft?: UsedListingAiDraft; error?: string }> {
  const key = openaiKey();
  if (!key) return { error: "OPENAI_API_KEY missing" };

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
              "Write only a used-market listing draft. Output exactly one valid JSON object.",
          },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      return { error: "AI draft generation failed. Please try again shortly." };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { error: "The AI response was empty." };

    const draft = parseDraft(content);
    if (!draft) return { error: "Couldn't parse the AI response." };
    if (input.isFree) draft.suggestedPrice = null;
    return { draft };
  } catch {
    return { error: "The AI request timed out." };
  }
}

export async function generateUsedListingDraft(
  input: UsedListingAiInput
): Promise<{ draft?: UsedListingAiDraft; error?: string }> {
  if (!isUsedListingAiConfigured()) {
    return {
      error:
        "No AI key configured. Add GEMINI_API_KEY (free) on Vercel — get one at aistudio.google.com/apikey",
    };
  }

  const images = input.images
    .filter((u) => typeof u === "string" && u.startsWith("https://"))
    .slice(0, 4);

  if (images.length === 0) {
    return { error: "AI writing requires at least one uploaded photo." };
  }

  if (geminiKey()) {
    const gemini = await generateWithGemini(input, images);
    if (gemini.draft || !openaiKey()) return gemini;
  }

  if (openaiKey()) {
    return generateWithOpenAI(input, images);
  }

  return { error: "Check your AI settings." };
}
