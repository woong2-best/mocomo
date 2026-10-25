import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveWikiLinks } from "@/lib/wiki/resolve-links";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "anime-links", 40);
  if (limited) return limited;

  let titles: unknown;
  try {
    const body = (await req.json()) as { titles?: unknown };
    titles = body.titles;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const list = Array.isArray(titles)
    ? titles.filter((item): item is string => typeof item === "string").slice(0, 80)
    : [];

  const links = await resolveWikiLinks(list);
  return NextResponse.json({ links });
}
