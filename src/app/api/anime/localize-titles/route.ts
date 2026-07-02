import { NextResponse } from "next/server";
import { z } from "zod";
import { LOCALES } from "@/lib/i18n/config";
import { resolveAnimeTitlesForLocale } from "@/lib/anime-title-auto-translate";

const bodySchema = z.object({
  locale: z.enum(LOCALES),
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        titleEn: z.string().nullable().optional(),
      })
    )
    .max(20),
});

/** 사이드바 인기 애니 — ja/zh 자동 번역 (캐시·AniList·AI) */
export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const { locale, items } = parsed.data;
    if (locale !== "ja" && locale !== "zh") {
      return NextResponse.json({ ok: true, titles: {} });
    }

    const titles = await resolveAnimeTitlesForLocale(items, locale);
    return NextResponse.json(
      { ok: true, titles },
      { headers: { "Cache-Control": "private, max-age=3600" } }
    );
  } catch (e) {
    console.error("[api/anime/localize-titles]", e);
    return NextResponse.json({ ok: false, titles: {} }, { status: 500 });
  }
}
