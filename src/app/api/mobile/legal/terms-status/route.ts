import { NextRequest } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { termsStatusForUserId } from "@/lib/legal/terms-agreement-http";

/** GET — mobile: whether the signed-in user must accept the latest Terms of Service. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-legal-terms-status", 60);
  if (limited) return limited;

  const userId = await getMobileUserId(req);
  return termsStatusForUserId(userId);
}
