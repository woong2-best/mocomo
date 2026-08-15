import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { confirmSetupCheckoutSession } from "@/lib/stripe-payment-methods";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-payment-methods-confirm", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;
  if (!body?.sessionId) {
    return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
  }

  const res = await confirmSetupCheckoutSession(auth.user.id, body.sessionId);
  if ("error" in res && res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, methods: res.methods });
}
