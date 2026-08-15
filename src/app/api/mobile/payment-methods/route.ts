import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  confirmSetupCheckoutSession,
  createSetupCheckoutSession,
  detachPaymentMethod,
  listSavedPaymentMethods,
  setDefaultPaymentMethod,
} from "@/lib/stripe-payment-methods";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-payment-methods", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const methods = await listSavedPaymentMethods(auth.user.id);
  return NextResponse.json({ methods });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-payment-methods-setup", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const res = await createSetupCheckoutSession({
    userId: auth.user.id,
    platform: "mobile",
  });
  if ("error" in res && res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ checkoutUrl: res.checkoutUrl, sessionId: res.sessionId });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-payment-methods-delete", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const res = await detachPaymentMethod(auth.user.id, body.id);
  if ("error" in res && res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, methods: res.methods });
}

export async function PATCH(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-payment-methods-default", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const res = await setDefaultPaymentMethod(auth.user.id, body.id);
  if ("error" in res && res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, methods: res.methods });
}
