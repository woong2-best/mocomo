import { NextResponse } from "next/server";

/** @deprecated Creator payouts are manual. This route does not create a Stripe account. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Creator payouts are sent manually. Upload a W-9 or W-8BEN and a Payoneer, Wise, or bank destination in your wallet.",
      code: "CONNECT_PAYOUT_RETIRED",
    },
    { status: 410 }
  );
}
