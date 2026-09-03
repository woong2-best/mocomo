import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { syncStripeSupportedCountriesFromApi } from "@/lib/marketplace/stripe-supported-countries.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Weekly Stripe country_specs sync — independent from OFAC lists */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncStripeSupportedCountriesFromApi();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }
  return NextResponse.json(result);
}
