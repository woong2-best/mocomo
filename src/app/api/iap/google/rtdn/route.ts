import { NextResponse } from "next/server";
import { handleIapVoidOrRefund } from "@/lib/apt/economy/iap/iap-refund-service";
import { listVoidedGooglePurchases } from "@/lib/apt/economy/iap/google-play-verifier";
import { verifyGooglePubSubPush } from "@/lib/google-pubsub-auth";

export const runtime = "nodejs";

type RtdnMessage = {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  oneTimeProductNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    sku?: string;
  };
  voidedPurchaseNotification?: {
    purchaseToken?: string;
    orderId?: string;
    productType?: number;
    refundType?: number;
  };
};

function decodePubSubData(data: string): RtdnMessage | null {
  try {
    const json = Buffer.from(data, "base64").toString("utf8");
    return JSON.parse(json) as RtdnMessage;
  } catch {
    return null;
  }
}

/**
 * Google Play RTDN (Real-time Developer Notifications)
 * Pub/Sub push subscription endpoint
 */
export async function POST(req: Request) {
  if (!(await verifyGooglePubSubPush(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let envelope: { message?: { data?: string } };
  try {
    envelope = (await req.json()) as { message?: { data?: string } };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = envelope.message?.data;
  if (!data) {
    return NextResponse.json({ ok: true, skipped: "no data" });
  }

  const msg = decodePubSubData(data);
  if (!msg) {
    return NextResponse.json({ error: "Invalid RTDN payload" }, { status: 400 });
  }

  if (msg.voidedPurchaseNotification) {
    const v = msg.voidedPurchaseNotification;
    await handleIapVoidOrRefund({
      orderId: v.orderId,
      purchaseToken: v.purchaseToken,
      reason: "Google RTDN voided purchase",
    });
    return NextResponse.json({ ok: true, handled: "voided" });
  }

  if (msg.oneTimeProductNotification) {
    const n = msg.oneTimeProductNotification;
    if (n.notificationType === 2 && n.purchaseToken) {
      await handleIapVoidOrRefund({
        purchaseToken: n.purchaseToken,
        reason: "Google RTDN one-time product canceled",
      });
      return NextResponse.json({ ok: true, handled: "canceled" });
    }
  }

  return NextResponse.json({ ok: true, ignored: true });
}

/** 수동 voided purchase 폴링 (cron) */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await listVoidedGooglePurchases({
    startTimeMs: Date.now() - 24 * 60 * 60 * 1000,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  let handled = 0;
  for (const v of result.voided) {
    const r = await handleIapVoidOrRefund({
      orderId: v.orderId,
      purchaseToken: v.purchaseToken,
      reason: "Voided purchase poll",
    });
    if ("ok" in r) handled++;
  }

  return NextResponse.json({ ok: true, voided: result.voided.length, handled });
}
