import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveDonateApiUser } from "@/lib/moco-donation/api-auth";
import { skipMocoDonation } from "@/lib/moco-donation/service";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "v1-donation-skip", 60);
  if (limited) return limited;

  const userResult = await resolveDonateApiUser(req);
  if (!userResult.ok) return userResult.response;

  let body: { donation_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const donationId = body.donation_id?.trim();
  if (!donationId) {
    return NextResponse.json({ success: false, error: "donation_id가 필요합니다." }, { status: 400 });
  }

  const result = await skipMocoDonation({
    hostUserId: userResult.userId,
    donationId,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
