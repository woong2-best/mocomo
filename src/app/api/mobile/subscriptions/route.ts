import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getMyCreatorSubscriptions, cancelMyCreatorSubscription } from "@/actions/subscriptions";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-subscriptions", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const subs = await getMyCreatorSubscriptions();
  return NextResponse.json({ subscriptions: subs });
}

const checkoutSchema = z.object({
  action: z.literal("checkout"),
  creatorId: z.string().min(1),
  username: z.string().min(1),
  amount: z.number().int().positive(),
  purchaseTermsAccepted: z.literal(true),
  recurringDonationTermsAccepted: z.literal(true),
});

const cancelSchema = z.object({
  action: z.literal("cancel"),
  creatorId: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("action", [checkoutSchema, cancelSchema]);

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-subscriptions-write", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  if (parsed.data.action === "checkout") {
    return NextResponse.json(
      { error: "Creator subscriptions have been discontinued." },
      { status: 410 }
    );
  }

  if (parsed.data.action === "cancel") {
    const result = await cancelMyCreatorSubscription(parsed.data.creatorId);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: errorText(result.error) }, { status: 422 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
