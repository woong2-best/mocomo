import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCachedSession } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { createMobileUsedTradeRequest } from "@/lib/used-market-mobile";

const bodySchema = z.object({
  roomId: z.string().min(1).max(64),
  meetAt: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const limited = await rateLimitPublicApi(req, "used-trade-request-create", 30);
  if (limited) return limited;

  const { id: listingId } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await createMobileUsedTradeRequest(
    session.user.id,
    listingId,
    parsed.data.roomId,
    parsed.data.meetAt
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
