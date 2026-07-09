import { unstable_cache } from "next/cache";
import type { Locale } from "@/lib/i18n/config";

const MAX_CHARS = 2000;

const TARGET_LANGUAGE: Record<Locale, string> = {
  ko: "Korean",
  en: "American English",
  ja: "Japanese",
  zh: "Simplified Chinese",
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

function buildPrompt(text: string, targetLocale: Locale): string {
  const target = TARGET_LANGUAGE[targetLocale];
  return `Translate this social media post to natural ${target}. Keep hashtags (#word), @mentions, URLs, and line breaks exactly as in the original. Return ONLY the translated text with no quotes or explanation.

${text}`;
}

async function translateWithGemini(text: string, targetLocale: Locale): Promise<string | null> {
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
          contents: [{ parts: [{ text: buildPrompt(text, targetLocale) }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

async function translateWithOpenAI(text: string, targetLocale: Locale): Promise<string | null> {
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
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

const cachedTranslate = unstable_cache(
  async (text: string, targetLocale: Locale) => {
    const gemini = await translateWithGemini(text, targetLocale);
    if (gemini) return gemini;
    const openai = await translateWithOpenAI(text, targetLocale);
    return openai;
  },
  ["post-content-translate"],
  { revalidate: 604800 }
);

export async function translatePostContent(
  text: string,
  targetLocale: Locale
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const slice = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;
  return cachedTranslate(slice, targetLocale);
}
