import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { createMarketplaceListingForUser } from "@/actions/marketplace";

const bodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(10_000),
  type: z.enum(["PHYSICAL", "CUSTOM_ORDER", "PREORDER"]),
  category: z.string().min(1).max(40),
  priceAmount: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).optional(),
  productionDays: z.coerce.number().int().min(1).optional(),
  coverUrl: z.string().max(2000).optional(),
  shipToCountries: z.array(z.string().length(2)).optional(),
  isNsfw: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-listing-create", 20);
  if (limited) return limited;

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

  const result = await createMarketplaceListingForUser(auth.user.id, {
    ...parsed.data,
    shippingMethods: ["KR_POST", "INTL_EMS"],
    shippingFeeType: "FIXED",
    shippingFeeFixed: 3000,
    shipToCountries: parsed.data.shipToCountries ?? ["KR"],
    publish: true,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
