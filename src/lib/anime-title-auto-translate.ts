import { unstable_cache } from "next/cache";
import type { Locale } from "@/lib/i18n/config";
import {
  beginPrimaryOrFallback,
  fallbackAfterQuota,
  isQuotaFailure,
  workersAiChat,
} from "@/lib/ai-fallback";
import { lookupAnimeTitleCatalog, type AnimeTitleFields } from "@/lib/anime-title-catalog";
import { lookupJapaneseAnimeTitle } from "@/lib/anime-title-anilist";

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

type TranslateAttempt = { text: string } | { quota: true; status: number } | null;

function titlePrompt(text: string, locale: "ja" | "zh"): string {
  const target = locale === "ja" ? "Japanese" : "Simplified Chinese";
  return `Translate this anime title to official ${target}. Return ONLY the translated title, no quotes or explanation.\n\n${text}`;
}

async function translateWithWorkersAi(text: string, locale: "ja" | "zh"): Promise<string | null> {
  return workersAiChat({
    user: titlePrompt(text, locale),
    temperature: 0.1,
    maxTokens: 64,
    timeoutMs: 12_000,
  });
}

async function translateWithGemini(text: string, locale: "ja" | "zh"): Promise<TranslateAttempt> {
  const key = geminiKey();
  if (!key) return null;
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: titlePrompt(text, locale) }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 64 },
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (isQuotaFailure(res.status, body)) return { quota: true, status: res.status };
      return null;
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const out = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return out ? { text: out } : null;
  } catch {
    return null;
  }
}

async function translateWithOpenAI(text: string, locale: "ja" | "zh"): Promise<TranslateAttempt> {
  const key = openaiKey();
  if (!key) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 64,
        messages: [{ role: "user", content: titlePrompt(text, locale) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (isQuotaFailure(res.status, body)) return { quota: true, status: res.status };
      return null;
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const out = json.choices?.[0]?.message?.content?.trim() || "";
    return out ? { text: out } : null;
  } catch {
    return null;
  }
}

async function translateWithProviders(source: string, locale: "ja" | "zh"): Promise<string | null> {
  if (geminiKey()) {
    if (beginPrimaryOrFallback("gemini", "anime-title") === "fallback") {
      return translateWithWorkersAi(source, locale);
    }
    const gemini = await translateWithGemini(source, locale);
    if (gemini && "text" in gemini) return gemini.text;
    if (gemini && "quota" in gemini && fallbackAfterQuota("gemini", "anime-title", gemini.status)) {
      return translateWithWorkersAi(source, locale);
    }
  }

  if (openaiKey()) {
    if (beginPrimaryOrFallback("openai", "anime-title") === "fallback") {
      return translateWithWorkersAi(source, locale);
    }
    const openai = await translateWithOpenAI(source, locale);
    if (openai && "text" in openai) return openai.text;
    if (openai && "quota" in openai && fallbackAfterQuota("openai", "anime-title", openai.status)) {
      return translateWithWorkersAi(source, locale);
    }
  }

  return null;
}

const cachedAiTranslate = unstable_cache(
  async (source: string, locale: "ja" | "zh") => translateWithProviders(source, locale),
  ["anime-title-ai-translate"],
  { revalidate: 604800 }
);

export async function resolveAnimeTitleForLocale(
  anime: AnimeTitleFields,
  locale: Locale
): Promise<string> {
  const catalog = lookupAnimeTitleCatalog(anime, locale);
  if (catalog) return catalog;

  if (locale === "ko") return anime.title;
  if (locale === "en") return anime.titleEn?.trim() || anime.title;

  if (locale === "ja") {
    const ja = await lookupJapaneseAnimeTitle(anime.title, anime.titleEn);
    if (ja) return ja;
    const source = anime.titleEn?.trim() || anime.title;
    const ai = await cachedAiTranslate(source, "ja");
    return ai || source;
  }

  if (locale === "zh") {
    const source = anime.titleEn?.trim() || anime.title;
    const ai = await cachedAiTranslate(source, "zh");
    return ai || source;
  }

  return anime.title;
}

export async function resolveAnimeTitlesForLocale(
  animes: AnimeTitleFields[],
  locale: Locale
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    animes.map(async (anime) => {
      out[anime.slug] = await resolveAnimeTitleForLocale(anime, locale);
    })
  );
  return out;
}
