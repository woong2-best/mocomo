import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { auth } from "@/lib/auth";
import { getMarketplaceCheckoutEligibility } from "@/lib/marketplace/checkout-eligibility";
import { isLocale, type Locale } from "@/lib/i18n/config";

const querySchema = z.object({
  listingId: z.string().min(1).max(64),
  shipCountry: z.string().max(8).optional(),
  locale: z
    .string()
    .optional()
    .transform((v) => (v && isLocale(v) ? (v as Locale) : undefined)),
});

/** 상품 상세·주문서 — 구매자 국가별 Stripe 결제 자격 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "market-checkout-mode", 120);
  if (limited) return limited;

  const parsed = querySchema.safeParse({
    listingId: req.nextUrl.searchParams.get("listingId"),
    shipCountry: req.nextUrl.searchParams.get("shipCountry") ?? undefined,
    locale: req.nextUrl.searchParams.get("locale") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const session = await auth();
  const result = await getMarketplaceCheckoutEligibility({
    listingId: parsed.data.listingId,
    userId: session?.user?.id,
    shipCountry: parsed.data.shipCountry,
    headers: req.headers,
    locale: parsed.data.locale,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result);
}
