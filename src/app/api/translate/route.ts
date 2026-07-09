import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { translatePostContent } from "@/lib/content-translate";
import { getRequestLocale } from "@/lib/i18n/server";
import { detectTextLanguage } from "@/lib/text-language";

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "translate", 30);
  if (limited) return limited;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const { text } = parsed.data;
    /** Always translate to the viewer's UI language (ko / en / ja / zh). */
    const targetLocale = await getRequestLocale();
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
