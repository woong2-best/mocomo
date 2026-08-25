import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { CallStatus, CallType, SupportTierLevel } from "@prisma/client";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { issueCallLivekitCredentials } from "@/lib/call-livekit-credentials";
import { db } from "@/lib/db";
import { notifyIncomingCall } from "@/lib/notifications";
import { canAccessDm } from "@/lib/tiers";

const ACTIVE_STATUSES: CallStatus[] = [CallStatus.RINGING, CallStatus.ACTIVE];

const bodySchema = z.object({
  calleeId: z.string().min(1).max(64),
  chatRoomId: z.string().min(1).max(64).optional(),
  callType: z.enum(["AUDIO", "VIDEO"]).optional(),
});

async function assertDmAccess(userId: string, otherUserId: string) {
  const [cosplayer, support, block] = await Promise.all([
    db.cosplayerProfile.findUnique({
      where: { userId: otherUserId },
      select: { dmEnabled: true, minChatTier: true },
    }),
    db.creatorSupport.findUnique({
      where: { supporterId_creatorId: { supporterId: userId, creatorId: otherUserId } },
      select: { tier: true },
    }),
    // A ringing phone is the loudest thing an app can do, so a block has to stop
    // it in either direction.
    db.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: otherUserId, blockedId: userId },
          { blockerId: userId, blockedId: otherUserId },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (block) return false;

  if (cosplayer?.dmEnabled) {
    const userTier = (support?.tier ?? "SEED") as SupportTierLevel;
    if (!canAccessDm(userTier, cosplayer.minChatTier)) {
      return false;
    }
  }
  return true;
}

/** POST /api/mobile/calls — start DM voice/video call (Bearer). */
export async function POST(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const limited = await rateLimitPublicApi(req, `mobile-call:${user.id}`, 20);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { calleeId, chatRoomId } = parsed.data;
  if (user.id === calleeId) {
    return NextResponse.json({ error: "자기 자신에게는 전화할 수 없습니다." }, { status: 400 });
  }

  const activePromise = db.voiceCall.findFirst({
    where: {
      status: { in: ACTIVE_STATUSES },
      OR: [
        { callerId: user.id },
        { calleeId: user.id },
        { callerId: calleeId },
        { calleeId },
      ],
    },
    select: { id: true },
  });
  const roomPromise = chatRoomId
    ? db.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: { members: { select: { userId: true } } },
      })
    : Promise.resolve(null);

  const [active, room, canDm] = await Promise.all([
    activePromise,
    roomPromise,
    assertDmAccess(user.id, calleeId),
  ]);

  if (active) {
    return NextResponse.json({ error: "이미 진행 중인 통화가 있습니다." }, { status: 409 });
  }
  if (!canDm) {
    return NextResponse.json({ error: "DM 등급 조건을 충족해야 통화할 수 있습니다." }, { status: 403 });
  }
  if (chatRoomId) {
    if (!room || room.type !== "DM") {
      return NextResponse.json({ error: "DM 방에서만 통화할 수 있습니다." }, { status: 400 });
    }
    const memberIds = room.members.map((m) => m.userId);
    if (!memberIds.includes(user.id) || !memberIds.includes(calleeId)) {
      return NextResponse.json({ error: "이 대화방에 참여 중이 아닙니다." }, { status: 403 });
    }
  }

  const callType = parsed.data.callType === "VIDEO" ? CallType.VIDEO : CallType.AUDIO;
  const call = await db.voiceCall.create({
    data: {
      callerId: user.id,
      calleeId,
      chatRoomId,
      livekitRoom: `call-${randomUUID()}`,
      callType,
      status: CallStatus.RINGING,
    },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });

  void notifyIncomingCall(calleeId, user.id, callType, call.id, chatRoomId);

  const livekit = await issueCallLivekitCredentials(
    call.livekitRoom,
    user.id,
    user.username,
    callType
  );

  if (!livekit) {
    await db.voiceCall.update({
      where: { id: call.id },
      data: { status: CallStatus.ENDED, endedAt: new Date() },
    });
    return NextResponse.json(
      { error: "통화 서버가 설정되지 않았습니다. LiveKit을 확인해 주세요." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    call: {
      id: call.id,
      livekitRoom: call.livekitRoom,
      chatRoomId: call.chatRoomId,
      callType: call.callType,
      status: call.status,
      caller: call.caller,
      callee: call.callee,
    },
    livekit,
  });
}
