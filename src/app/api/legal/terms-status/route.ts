import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { termsStatusForUserId } from "@/lib/legal/terms-agreement-http";

/** GET — whether the signed-in user must accept the latest Terms of Service. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "legal-terms-status", 60);
  if (limited) return limited;

  const session = await auth().catch(() => null);
  return termsStatusForUserId(session?.user?.id ?? null);
}
