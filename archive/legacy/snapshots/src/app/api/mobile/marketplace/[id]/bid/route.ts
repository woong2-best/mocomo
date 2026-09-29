import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { placeMobileUsedAuctionBid } from "@/lib/used-market-mobile";
import {
  confirmUsedAuctionBidHold,
  payUsedAuctionBidHoldWithSavedCard,
  prepareUsedAuctionBidHoldWithMethods,
} from "@/lib/used-auction-bid-hold";

type RouteCtx = { params: Promise<{ id: string }> };

/** POST: 입찰 | prepare(홀드 PI) | confirm(홀드 검증) | pay(저장 카드 hold) */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-bid", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { id: listingId } = await ctx.params;
  if (!listingId || listingId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let body: {
    amount?: number;
    termsAccepted?: boolean;
    paymentIntentDbId?: string;
    paymentMethodId?: string;
    mode?: "bid" | "prepare" | "confirm" | "pay";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode ?? "bid";
  const userId = auth.user.id;

  if (mode === "prepare") {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const result = await prepareUsedAuctionBidHoldWithMethods({
      userId,
      listingId,
      bidAmount: amount,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error, mode: result.mode }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (mode === "confirm") {
    const paymentIntentDbId = body.paymentIntentDbId?.trim();
    if (!paymentIntentDbId) {
      return NextResponse.json({ error: "paymentIntentDbId required" }, { status: 400 });
    }
    const result = await confirmUsedAuctionBidHold(userId, listingId, paymentIntentDbId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (mode === "pay") {
    const paymentIntentDbId = body.paymentIntentDbId?.trim();
    const paymentMethodId = body.paymentMethodId?.trim();
    if (!paymentIntentDbId || !paymentMethodId) {
      return NextResponse.json({ error: "paymentIntentDbId and paymentMethodId required" }, { status: 400 });
    }
    const result = await payUsedAuctionBidHoldWithSavedCard(
      userId,
      paymentIntentDbId,
      paymentMethodId
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!body.termsAccepted) {
    return NextResponse.json({ error: "Terms must be accepted" }, { status: 400 });
  }

  const result = await placeMobileUsedAuctionBid(userId, listingId, amount, body.termsAccepted, {
    paymentIntentDbId: body.paymentIntentDbId?.trim() || undefined,
  });

  if ("error" in result && result.error) {
    return NextResponse.json(
      {
        error: result.error,
        needsAdultVerify: "needsAdultVerify" in result ? result.needsAdultVerify : undefined,
        needsBidHold: "needsBidHold" in result ? result.needsBidHold : undefined,
        holdMode: "holdMode" in result ? result.holdMode : undefined,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
