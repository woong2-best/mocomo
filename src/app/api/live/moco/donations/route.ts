import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { currentOfficialDonation } from "@/lib/ai-live/donation-now";

export const dynamic = "force-dynamic";

/** Public clock for the official room. Same donation rows a normal live overlay plays. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "moco-official-donations", 90);
  if (limited) return limited;
  try {
    const current = await currentOfficialDonation();
    return NextResponse.json({ current });
  } catch {
    return NextResponse.json({ current: null });
  }
}
