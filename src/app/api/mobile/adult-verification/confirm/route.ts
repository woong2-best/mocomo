import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi, getClientIpFromRequest } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { confirmPortOneAdultVerification } from "@/lib/adult-verification/confirm-portone";

const bodySchema = z.object({
  identityVerificationId: z.string().min(8).max(128),
  scope: z.enum(["DM_PAID", "USED_MARKET", "GLOBAL"]).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-adult-verification-confirm", 10);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await confirmPortOneAdultVerification({
    userId: authResult.user.id,
    identityVerificationId: parsed.data.identityVerificationId,
    scope: parsed.data.scope,
    ip: getClientIpFromRequest(req),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    isAdult: result.isAdult,
    alreadyVerified: "alreadyVerified" in result ? result.alreadyVerified : false,
  });
}
