import { unstable_cache } from "next/cache";
import {
  beginPrimaryOrFallback,
  fallbackAfterQuota,
  isQuotaFailure,
  workersAiChat,
} from "@/lib/ai-fallback";
import { targetLanguageForLocale } from "@/lib/i18n/target-language";

const MAX_CHARS = 2000;

/** Shut down 2026-06-01. A leftover GEMINI_MODEL value must not block translation. */
const RETIRED_GEMINI_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
]);

function geminiModels(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = [preferred, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  const live: string[] = [];
  for (const model of models) {
    if (!model || RETIRED_GEMINI_MODELS.has(model) || live.includes(model)) continue;
    live.push(model);
  }
  return live;
}

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

function buildPrompt(text: string, targetLocale: string): string {
  const target = targetLanguageForLocale(targetLocale);
  return `Translate this social media post to natural ${target}. Keep hashtags (#word), @mentions, URLs, and line breaks exactly as in the original. Return ONLY the translated text with no quotes or explanation.

${text}`;
}

type TranslateAttempt = { text: string } | { quota: true; status: number } | null;

async function translateWithWorkersAi(text: string, targetLocale: string): Promise<string | null> {
  return workersAiChat({
    user: buildPrompt(text, targetLocale),
    temperature: 0.2,
    maxTokens: 2048,
    timeoutMs: 20_000,
  });
}

async function translateWithGemini(text: string, targetLocale: string): Promise<TranslateAttempt> {
  const key = geminiKey();
  if (!key) return null;

  for (const model of geminiModels()) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(text, targetLocale) }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (isQuotaFailure(res.status, body)) return { quota: true, status: res.status };
        continue;
      }
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      const translated = parts
        .map((part) => part.text?.trim() ?? "")
        .filter((part) => part.length > 0)
        .join("")
        .trim();
      if (translated) return { text: translated };
    } catch {
      continue;
    }
  }
  return null;
}

async function translateWithOpenAI(text: string, targetLocale: string): Promise<TranslateAttempt> {
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
        temperature: 0.2,
        max_tokens: 2048,
        messages: [{ role: "user", content: buildPrompt(text, targetLocale) }],
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
    const translated = json.choices?.[0]?.message?.content?.trim() || "";
    return translated ? { text: translated } : null;
  } catch {
    return null;
  }
}

async function translateWithProviders(text: string, targetLocale: string): Promise<string | null> {
  if (geminiKey()) {
    if (beginPrimaryOrFallback("gemini", "post-translate") === "fallback") {
      return translateWithWorkersAi(text, targetLocale);
    }
    const gemini = await translateWithGemini(text, targetLocale);
    if (gemini && "text" in gemini) return gemini.text;
    if (gemini && "quota" in gemini && fallbackAfterQuota("gemini", "post-translate", gemini.status)) {
      return translateWithWorkersAi(text, targetLocale);
    }
  }

  if (openaiKey()) {
    if (beginPrimaryOrFallback("openai", "post-translate") === "fallback") {
      return translateWithWorkersAi(text, targetLocale);
    }
    const openai = await translateWithOpenAI(text, targetLocale);
    if (openai && "text" in openai) return openai.text;
    if (openai && "quota" in openai && fallbackAfterQuota("openai", "post-translate", openai.status)) {
      return translateWithWorkersAi(text, targetLocale);
    }
  }

  return null;
}

const cachedTranslate = unstable_cache(
  async (text: string, targetLocale: string) => translateWithProviders(text, targetLocale),
  ["post-content-translate"],
  { revalidate: 604800 }
);

export async function translatePostContent(
  text: string,
  targetLocale: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const slice = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;
  return cachedTranslate(slice, targetLocale);
}
