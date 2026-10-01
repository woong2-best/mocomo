import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { getMobileUsedTradeRequest } from "@/lib/used-market-mobile";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ requestId: string }> }
) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { requestId } = await ctx.params;
  const result = await getMobileUsedTradeRequest(session.user.id, requestId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, request: result.request });
}
