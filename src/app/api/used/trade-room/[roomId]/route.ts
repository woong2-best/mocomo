import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { getMobileUsedTradeRoomContext } from "@/lib/used-market-mobile";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  const usedTrade = await getMobileUsedTradeRoomContext(session.user.id, roomId);
  return NextResponse.json({ ok: true, usedTrade });
}
