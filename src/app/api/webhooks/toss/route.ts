import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";

/**
 * Toss Payments 웹훅 — 결제 완료 시 리다이렉트 없이도 정산 처리 (기업 표준)
 * 대시보드에서 URL 등록: https://your-domain.com/api/webhooks/toss
 * 시크릿: TOSS_WEBHOOK_SECRET (선택, 설정 시 Authorization 헤더 검증)
 */
export async function POST(req: Request) {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    eventType?: string;
    data?: {
      orderId?: string;
      paymentKey?: string;
      status?: string;
      totalAmount?: number;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.data?.status;
  if (status && status !== "DONE" && status !== "PAID") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const orderId = body.data?.orderId;
  const paymentKey = body.data?.paymentKey;
  const amount = body.data?.totalAmount;

  if (!orderId || !paymentKey || amount == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const intent = await db.paymentIntent.findUnique({ where: { id: orderId } });
  if (!intent) {
    return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  }
  if (intent.status === "PAID") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const result = await fulfillPaymentIntent(orderId, paymentKey, amount);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, type: result.type });
}
