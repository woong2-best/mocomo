import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { currentOfficialDonation } from "@/lib/ai-live/donation-now";
import { idolById } from "@/lib/ai-live/idols";

export const dynamic = "force-dynamic";

/** Public clock for one idol room. Other channel ids are not accepted. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ member: string }> }) {
  const limited = await rateLimitPublicApi(req, "live-idol-donations", 90);
  if (limited) return limited;

  const { member } = await params;
  const idol = idolById(member);
  if (!idol) return NextResponse.json({ current: null }, { status: 404 });

  try {
    const current = await currentOfficialDonation(idol.channelId);
    return NextResponse.json({ current });
  } catch {
    return NextResponse.json({ current: null });
  }
}
