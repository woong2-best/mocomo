import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { currentOfficialDonation } from "@/lib/ai-live/donation-now";
import { isAlwaysOnLiveChannel } from "@/lib/ai-live/official-channel-id";

export const dynamic = "force-dynamic";

/** Shared now-playing clock for avatar rooms — same rows the web overlay plays. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-now", 90);
  if (limited) return limited;

  const { id } = await params;
  if (!isAlwaysOnLiveChannel(id)) {
    return NextResponse.json({ current: null });
  }

  try {
    const current = await currentOfficialDonation(id);
    return NextResponse.json({ current });
  } catch {
    return NextResponse.json({ current: null });
  }
}
