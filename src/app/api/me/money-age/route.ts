import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMoneyAgeStatus, toPublicMoneyAge } from "@/lib/money-age-gate";

/** GET — logged-in money feature age gate (birth date + 18+). */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "me-money-age", 60);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const status = await getMoneyAgeStatus(session.user.id);
  return NextResponse.json(toPublicMoneyAge(status));
}
