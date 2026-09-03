import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestMarketplaceRefund, sellerRespondMarketplaceRefund } from "@/actions/marketplace-checkout";
import { computeRefundQuote } from "@/lib/marketplace/refund-policy";

const postSchema = z.object({
  reason: z.string().min(1).max(2000),
  deductReturnShipping: z.boolean().optional(),
});

const patchSchema = z.object({
  refundId: z.string().min(1),
  approve: z.boolean(),
});

/** POST — 환불 요청 (Stripe 정책 기반 금액 산정) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "market-order-refund", 15);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: orderId } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "환불 사유를 입력해 주세요." }, { status: 400 });
  }

  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { shipment: true },
  });
  if (!order || order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const quote = computeRefundQuote({
    order,
    shipment: order.shipment,
    deductReturnShipping: parsed.data.deductReturnShipping,
  });
  if (quote.phase === "NOT_REFUNDABLE" || quote.refundAmount <= 0) {
    return NextResponse.json({ error: quote.policyLabel }, { status: 422 });
  }

  const result = await requestMarketplaceRefund(orderId, parsed.data.reason, quote.refundAmount);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ success: true, quote });
}

/** PATCH — 판매자 환불 승인/거절 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "market-order-refund-respond", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: orderId } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const refund = await db.marketplaceRefund.findUnique({
    where: { id: parsed.data.refundId },
    include: { order: true },
  });
  if (!refund || refund.orderId !== orderId || refund.order.sellerId !== session.user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const result = await sellerRespondMarketplaceRefund(parsed.data.refundId, parsed.data.approve);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
