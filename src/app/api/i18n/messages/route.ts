import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { isLocale, normalizeLocale } from "@/lib/i18n/config";

/** Public static UI messages for mobile / clients (no auth). */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("locale");
  const locale = normalizeLocale(raw, "en");
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }

  const file = path.join(process.cwd(), "src/lib/i18n/locales", `${locale}.json`);
  try {
    const messages = JSON.parse(fs.readFileSync(file, "utf8"));
    return NextResponse.json(
      { locale, messages },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch {
    const en = path.join(process.cwd(), "src/lib/i18n/locales/en.json");
    const messages = JSON.parse(fs.readFileSync(en, "utf8"));
    return NextResponse.json({ locale: "en", messages });
  }
}
