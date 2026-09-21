import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { checkoutMarketplaceCartForSellerMobile } from "@/actions/marketplace-cart-checkout";
import { isPaymentsConfigured } from "@/lib/payments";

const bodySchema = z.object({
  sellerId: z.string().min(1).max(64),
  items: z
    .array(
      z.object({
        listingId: z.string().min(1).max(64),
        quantity: z.number().int().positive(),
      })
    )
    .min(1)
    .max(40),
  shipName: z.string().max(80).optional(),
  shipCountry: z.string().max(8).optional(),
  shipPostal: z.string().max(32).optional(),
  shipAddress1: z.string().max(200).optional(),
  shipAddress2: z.string().max(200).optional(),
  shipPhone: z.string().max(32).optional(),
  buyerNote: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-cart-checkout", 20);
  if (limited) return limited;

  if (!isPaymentsConfigured()) {
    return NextResponse.json({ error: "결제가 설정되지 않았습니다." }, { status: 503 });
  }

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, countryCode: true },
  });

  const { sellerId, ...input } = parsed.data;
  const result = await checkoutMarketplaceCartForSellerMobile(sellerId, input, {
    userId: auth.user.id,
    email: dbUser?.email,
    countryCode: dbUser?.countryCode,
    headers: req.headers,
  });

  if ("error" in result && result.error) {
    const status = "checkoutMode" in result && result.checkoutMode === "BLOCKED" ? 403 : 422;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
