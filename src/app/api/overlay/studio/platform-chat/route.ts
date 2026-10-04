import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assertOverlayBroadcastAccess } from "@/lib/live-external/overlay-access";
import { handlePlatformChatRequest } from "@/lib/live-external/platform-chat/handler";
import { authorizeStudioOverlay } from "@/lib/live-external/studio-obs-url";

export const dynamic = "force-dynamic";

/** Live Studio OBS platform chat session. Follows the host's current broadcast. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "overlay-studio-platform-chat", 120);
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const auth = await authorizeStudioOverlay(token, "chat");
  if (!auth.ok) {
    return NextResponse.json({ error: errorText(auth.error) }, { status: 401 });
  }
  if (!auth.channel) return NextResponse.json({ error: "This broadcast is not active." }, { status: 410 });

  const access = await assertOverlayBroadcastAccess(auth.channel.id, auth.payload);
  if (!access.ok) {
    return NextResponse.json({ error: errorText(access.error) }, { status: access.status });
  }
  const channel = access.channel;
  if (!channel.externalProvider || !channel.externalId) {
    return NextResponse.json({ error: "Not an external broadcast." }, { status: 400 });
  }

  const result = await handlePlatformChatRequest(
    {
      externalProvider: channel.externalProvider,
      externalId: channel.externalId,
      externalChannelId: channel.externalChannelId,
      connectedStreamingAccountId: channel.connectedStreamingAccountId,
    },
    {
      pageToken: req.nextUrl.searchParams.get("pageToken"),
      liveChatId: req.nextUrl.searchParams.get("liveChatId"),
      kind: req.nextUrl.searchParams.get("kind"),
    }
  );
  if (!result.ok) {
    return NextResponse.json({ error: errorText(result.error) }, { status: result.status });
  }

  const { ok: _ok, session, ...body } = result;
  return NextResponse.json({
    ok: true,
    live: true,
    ...body,
    session: session
      ? {
          chatChannelId: session.chatChannelId,
          accessToken: session.accessToken,
          wsServerId: session.wsServerId,
        }
      : null,
  });
}
