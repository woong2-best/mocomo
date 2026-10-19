import { NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

/** Retired custom amount payout. Wallet Request payout cashes out the current Reward tier. */
export async function POST(req: Request) {
  const limited = await rateLimitPublicApi(req as import("next/server").NextRequest, "mobile-wallet-payout", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req as import("next/server").NextRequest, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  return NextResponse.json(
    {
      error:
        "Use Request payout in your wallet. It cashes out your current Reward tier and leaves the rest of your earned MOCO.",
    },
    { status: 410 }
  );
}
