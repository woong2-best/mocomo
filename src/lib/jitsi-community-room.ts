import { db } from "@/lib/db";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";
import {
  buildJitsiRoomName,
  getJitsiDomain,
  isJaasDeployment,
  isJitsiConfigured,
  isJitsiJwtConfigured,
  isPublicMeetJitSi,
  JITSI_JAAS_CREDENTIALS_ERROR,
  JITSI_PUBLIC_MEET_ERROR,
} from "@/lib/jitsi-config";
import { signJitsiCommunityJwt } from "@/lib/jitsi-jwt";

export type JitsiCommunityRoomResult =
  | {
      ok: true;
      domain: string;
      roomName: string;
      displayName: string;
      jwt?: string;
      config: {
        startWithAudioMuted: boolean;
        startWithVideoMuted: boolean;
        disableScreenSharing: boolean;
      };
    }
  | { ok: false; status: number; error: string };

export async function resolveJitsiCommunityRoom(
  channelId: string,
  userId: string,
  displayName: string
): Promise<JitsiCommunityRoomResult> {
  if (!isJitsiConfigured()) {
    if (isPublicMeetJitSi()) {
      return { ok: false, status: 503, error: JITSI_PUBLIC_MEET_ERROR };
    }
    if (isJaasDeployment() && !isJitsiJwtConfigured()) {
      return { ok: false, status: 503, error: JITSI_JAAS_CREDENTIALS_ERROR };
    }
    return { ok: false, status: 503, error: "Jitsi 서버 설정이 없습니다." };
  }

  const voice = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { id: true, communityId: true, createdBy: true },
  });
  if (!voice) {
    return { ok: false, status: 404, error: "음성 채널을 찾을 수 없습니다." };
  }

  let allowed = voice.createdBy === userId;
  let communityId = voice.communityId;

  if (!allowed && communityId) {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true },
    });
    allowed = !!member;
  } else if (!allowed) {
    const linked = await db.communityChannel.findFirst({
      where: { voiceChannelId: channelId },
      select: { communityId: true },
    });
    if (linked) {
      communityId = linked.communityId;
      const member = await db.communityMember.findUnique({
        where: { communityId_userId: { communityId: linked.communityId, userId } },
        select: { id: true },
      });
      allowed = !!member;
    }
  }

  if (!allowed) {
    return { ok: false, status: 403, error: "커뮤니티 멤버만 입장할 수 있습니다." };
  }

  const perms = communityId
    ? await loadMemberPermissions(communityId, userId, false)
    : null;

  if (perms && !hasPermission(perms, "connectVoice")) {
    return { ok: false, status: 403, error: "음성 채널 입장 권한이 없습니다." };
  }

  const roomName = buildJitsiRoomName(channelId);
  const jwt = isJitsiJwtConfigured()
    ? await signJitsiCommunityJwt({
        roomName,
        userId,
        displayName,
        // MoCoMo already gates membership; moderator avoids Jitsi lobby deadlock.
        moderator: true,
      })
    : null;

  if (isJaasDeployment() && !jwt) {
    return { ok: false, status: 503, error: JITSI_JAAS_CREDENTIALS_ERROR };
  }

  return {
    ok: true,
    domain: getJitsiDomain(),
    roomName,
    displayName,
    ...(jwt ? { jwt } : {}),
    config: {
      startWithAudioMuted: perms ? !hasPermission(perms, "speakVoice") : false,
      startWithVideoMuted: perms ? !hasPermission(perms, "useVideo") : true,
      disableScreenSharing: perms ? !hasPermission(perms, "shareScreen") : false,
    },
  };
}
