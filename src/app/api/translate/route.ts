import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { translatePostContent } from "@/lib/content-translate";
import { isLanguageCode } from "@/lib/client-translate/opus-mt-pairs";
import { getRequestLocale } from "@/lib/i18n/server";
import { detectTextLanguage } from "@/lib/text-language";
import { isTextWorthTranslating } from "@/lib/translate-text-filter";

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  targetLocale: z
    .string()
    .regex(/^[a-z]{2,3}$/)
    .optional(),
});

function resolveTargetLocale(requested: string | undefined, viewer: string): string {
  if (requested && isLanguageCode(requested)) return requested;
  const primary = viewer.toLowerCase().split("-")[0] ?? "";
  return isLanguageCode(primary) ? primary : "en";
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

    if (sourceLang && sourceLang === targetLocale) {
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
