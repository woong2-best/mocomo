import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assertOverlayBroadcastAccess } from "@/lib/live-external/overlay-access";
import { listOverlayAlerts } from "@/lib/live-external/overlay-alerts";

export const dynamic = "force-dynamic";

/** OBS browser source — chat tips, cheers, and chat alerts. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "overlay-alerts", 60);
  if (limited) return limited;

  const { channelId } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const since = req.nextUrl.searchParams.get("since");

  const verified = verifyOverlayToken(token, { channelId, kind: "donation" });
  if (!verified.ok) {
    return NextResponse.json({ error: errorText(verified.error) }, { status: 401 });
  }

  const broadcastAccess = await assertOverlayBroadcastAccess(channelId, verified.payload);
  if (!broadcastAccess.ok) {
    return NextResponse.json(
      { error: errorText(broadcastAccess.error) },
      { status: broadcastAccess.status }
    );
  }

  const listed = await listOverlayAlerts(channelId, since);
  if (!listed.ok) {
    return NextResponse.json({ error: errorText(listed.error) }, { status: listed.status });
  }
  return NextResponse.json({ alerts: listed.alerts });
}
