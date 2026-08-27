import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveJitsiCommunityRoom } from "@/lib/jitsi-community-room";

/** GET /api/mobile/jitsi/community-room?channelId= — Bearer auth for mobile Jitsi join */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `mobile-jitsi:${auth.user.id}`, 30);
  if (limited) return limited;

  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  const result = await resolveJitsiCommunityRoom(
    channelId,
    auth.user.id,
    auth.user.username || auth.user.id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const joinUrl = buildJitsiJoinUrl(
    result.domain,
    result.roomName,
    result.displayName,
    result.config,
    result.jwt
  );

  return NextResponse.json({
    domain: result.domain,
    roomName: result.roomName,
    displayName: result.displayName,
    config: result.config,
    ...(result.jwt ? { jwt: result.jwt } : {}),
    joinUrl,
  });
}

function buildJitsiJoinUrl(
  domain: string,
  roomName: string,
  displayName: string,
  config: {
    startWithAudioMuted: boolean;
    startWithVideoMuted: boolean;
    disableScreenSharing: boolean;
  },
  jwt?: string
) {
  const hash = new URLSearchParams();
  hash.set("config.prejoinPageEnabled", "false");
  hash.set("config.startWithAudioMuted", String(config.startWithAudioMuted));
  hash.set("config.startWithVideoMuted", String(config.startWithVideoMuted));
  if (config.disableScreenSharing) {
    hash.set("config.disableScreensharing", "true");
  }
  hash.set("userInfo.displayName", displayName);
  const query = jwt ? `?jwt=${encodeURIComponent(jwt)}` : "";
  return `https://${domain}/${roomName}${query}#${hash.toString()}`;
}
