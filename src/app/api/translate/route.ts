import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { translatePostContent } from "@/lib/content-translate";
import type { Locale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { detectTextLanguage } from "@/lib/text-language";
import { isTextWorthTranslating } from "@/lib/translate-text-filter";

/** UI locale is English-only. Post translation still targets the viewer's language. */
const TRANSLATE_LOCALES = ["en", "ko", "ja", "zh", "zh-TW", "pt-BR"] as const;
type TranslateLocale = (typeof TRANSLATE_LOCALES)[number];

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  targetLocale: z.enum(TRANSLATE_LOCALES).optional(),
});

function resolveTargetLocale(requested: TranslateLocale | undefined, viewer: Locale): TranslateLocale {
  if (requested) return requested;
  return (TRANSLATE_LOCALES as readonly string[]).includes(viewer) ? (viewer as TranslateLocale) : "en";
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "translate", 30);
  if (limited) return limited;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const { text, targetLocale: requestedTarget } = parsed.data;
    const targetLocale = resolveTargetLocale(requestedTarget, await getRequestLocale());

    if (!isTextWorthTranslating(text)) {
      return NextResponse.json(
        { ok: true, translated: text, sourceLang: null },
        { headers: { "Cache-Control": "private, max-age=3600" } }
      );
    }

    const sourceLang = detectTextLanguage(text);

    if (!sourceLang || sourceLang === targetLocale) {
      return NextResponse.json(
        { ok: true, translated: text, sourceLang },
        { headers: { "Cache-Control": "private, max-age=3600" } }
      );
    }

    const translated = await translatePostContent(text, targetLocale);
    if (!translated) {
      return NextResponse.json(
        { ok: false, error: "Translation unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { ok: true, translated, sourceLang },
      { headers: { "Cache-Control": "private, max-age=86400" } }
    );
  } catch (e) {
    console.error("[api/translate]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
