import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { listOnboardingCosplayers } from "@/lib/signup-role-onboarding";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-onboarding-cosplayers", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "24") || 24, 40);
  const items = await listOnboardingCosplayers({
    take,
    viewerId: authResult.user.id,
  });

  return NextResponse.json({ items });
}
