import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getSellerOnboardingStateForUserId } from "@/lib/marketplace/seller-onboarding-user";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-seller-onboarding", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "notification" });
  if ("error" in auth) return auth.error;

  const state = await getSellerOnboardingStateForUserId(auth.user.id);
  return NextResponse.json(state);
}
