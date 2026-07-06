import { NextResponse } from "next/server";
import { z } from "zod";
import { LOCALES } from "@/lib/i18n/config";
import { translatePostContent } from "@/lib/content-translate";
import { detectTextLanguage } from "@/lib/text-language";

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  targetLocale: z.enum(LOCALES),
});

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const { text, targetLocale } = parsed.data;
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
