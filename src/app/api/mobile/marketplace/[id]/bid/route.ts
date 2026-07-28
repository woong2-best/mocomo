import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { placeMobileUsedAuctionBid } from "@/lib/used-market-mobile";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-bid", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let amount = 0;
  try {
    const body = (await req.json()) as { amount?: number };
    amount = Number(body.amount);
  } catch {
    return NextResponse.json({ error: "입찰가를 입력해 주세요." }, { status: 400 });
  }

  const result = await placeMobileUsedAuctionBid(auth.user.id, id, amount);
  if ("error" in result && result.error) {
    const status = "needsAdultVerify" in result && result.needsAdultVerify ? 403 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
