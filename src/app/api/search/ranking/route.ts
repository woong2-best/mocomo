import { NextResponse } from "next/server";
import { getSidebarSearchRanking } from "@/lib/scoped-search-rank";

/** Contextual top search rankings for the header search focus dropdown. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pathname = searchParams.get("pathname") ?? "/";
    const { scope, items } = await getSidebarSearchRanking(pathname);
    return NextResponse.json(
      { ok: true, scope, items },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (e) {
    console.error("[api/search/ranking]", e);
    return NextResponse.json({ ok: true, scope: "global", items: [] });
  }
}
