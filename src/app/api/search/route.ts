import { NextRequest, NextResponse } from "next/server";
import { runFastSearch } from "@/lib/search-fast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 빠른 통합 검색 (JSON) */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ error: "검색어는 2자 이상입니다." }, { status: 400 });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "검색어가 너무 깁니다." }, { status: 400 });
  }

  try {
    const data = await runFastSearch(q);
    return NextResponse.json({ ok: true, query: q, ...data });
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
