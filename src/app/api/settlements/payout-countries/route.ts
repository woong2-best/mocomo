import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  DEFAULT_EXPRESS_PAYOUT_COUNTRY,
  listExpressPayoutCountries,
} from "@/lib/marketplace/stripe-supported-countries";

/** Stripe Connect Express 셀프서브 정산 국가. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlements-payout-countries", 60);
  if (limited) return limited;

  const countries = listExpressPayoutCountries().map((country) => ({
    code: country.code,
    name: country.name,
  }));

  return NextResponse.json({
    defaultCountry: DEFAULT_EXPRESS_PAYOUT_COUNTRY,
    countries,
  });
}
