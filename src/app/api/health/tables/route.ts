import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** STAR·리트윗·댓글에 필요한 DB 테이블 존재 여부 (운영 점검용) */
export async function GET() {
  const result = {
    bookmark: { ok: false, hint: "STAR 저장 (원래부터 있음)" },
    repost: { ok: false, hint: "리트윗 — Repost 테이블 + SQL 필요" },
    comment: { ok: false, hint: "댓글 — Comment 테이블" },
  };

  try {
    await db.bookmark.findFirst({ select: { id: true } });
    result.bookmark.ok = true;
  } catch (e) {
    result.bookmark.hint += ` · ${e instanceof Error ? e.message : "error"}`;
  }

  try {
    await db.repost.findFirst({ select: { id: true } });
    result.repost.ok = true;
  } catch (e) {
    result.repost.hint += ` · ${e instanceof Error ? e.message : "error"}`;
  }

  try {
    await db.comment.findFirst({ select: { id: true } });
    result.comment.ok = true;
  } catch (e) {
    result.comment.hint += ` · ${e instanceof Error ? e.message : "error"}`;
  }

  const allOk = result.bookmark.ok && result.repost.ok && result.comment.ok;
  return NextResponse.json(result, { status: allOk ? 200 : 503 });
}
