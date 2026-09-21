import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import {
  getMarketplaceCartCheckoutSummaryForUser,
  type MarketplaceCartLine,
} from "@/actions/marketplace-cart-checkout";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        listingId: z.string().min(1).max(64),
        quantity: z.number().int().positive(),
      })
    )
    .min(1)
    .max(40),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-cart-summary", 60);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "장바구니 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const userId = await getMobileUserId(req);
  const result = await getMarketplaceCartCheckoutSummaryForUser(
    parsed.data.items as MarketplaceCartLine[],
    { userId, headers: req.headers }
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
