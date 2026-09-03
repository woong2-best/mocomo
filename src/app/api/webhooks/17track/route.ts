import { NextResponse } from "next/server";
import { applyMarketplaceTrackingUpdate } from "@/lib/marketplace/delivery-pipeline";
import {
  get17TrackApiKey,
  parse17TrackMainStatus,
  verify17TrackWebhookSignature,
} from "@/lib/marketplace/tracking/providers/17track";
import { safeLogInfo, safeLogWarn } from "@/lib/safe-log";

export const runtime = "nodejs";

/**
 * 17TRACK webhook — TRACKING_UPDATED → delivery pipeline → dispute window → auto-confirm cron.
 * Configure URL in 17TRACK API dashboard. Always return 200 to avoid retry storms.
 */
export async function POST(req: Request) {
  if (!get17TrackApiKey()) {
    return NextResponse.json({ received: true, ignored: "not_configured" });
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("sign") ??
    req.headers.get("Sign") ??
    null;

  if (!verify17TrackWebhookSignature(rawBody, signature)) {
    safeLogWarn("17track-webhook", { reason: "invalid_signature" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ received: true, ignored: "invalid_json" });
  }

  const parsed = parse17TrackMainStatus(payload);
  if (!parsed) {
    return NextResponse.json({ received: true, ignored: "no_tracking_update" });
  }

  const result = await applyMarketplaceTrackingUpdate({
    trackingNumber: parsed.trackingNumber,
    orderTag: parsed.tag,
    mainStatus: parsed.mainStatus,
    subStatus: parsed.subStatus,
    source: "17track",
  });

  if (result && "error" in result) {
    safeLogWarn("17track-webhook", {
      tracking: parsed.trackingNumber.slice(0, 6) + "…",
      error: result.error,
    });
  } else if (result?.delivered) {
    safeLogInfo("17track-webhook", {
      tracking: parsed.trackingNumber.slice(0, 6) + "…",
      delivered: true,
      tag: parsed.tag?.slice(0, 8),
    });
  }

  return NextResponse.json({ received: true });
}
