import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assertOverlayBroadcastAccess } from "@/lib/live-external/overlay-access";
import { listOverlayAlerts } from "@/lib/live-external/overlay-alerts";
import { authorizeStudioOverlay } from "@/lib/live-external/studio-obs-url";

export const dynamic = "force-dynamic";

/** Live Studio OBS chat tips. Follows the host's current broadcast. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "overlay-studio-alerts", 60);
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const auth = await authorizeStudioOverlay(token, "donation");
  if (!auth.ok) {
    return NextResponse.json({ error: errorText(auth.error) }, { status: 401 });
  }
  if (!auth.channel) return NextResponse.json({ alerts: [] });

  const access = await assertOverlayBroadcastAccess(auth.channel.id, auth.payload);
  if (!access.ok) return NextResponse.json({ alerts: [] });

  const listed = await listOverlayAlerts(auth.channel.id, req.nextUrl.searchParams.get("since"));
  if (!listed.ok) {
    return NextResponse.json({ error: errorText(listed.error) }, { status: listed.status });
  }
  return NextResponse.json({ alerts: listed.alerts });
}
