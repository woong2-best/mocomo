"use server";

import { randomUUID } from "crypto";
import { notifyIncomingCall } from "@/lib/notifications";
import { db } from "@/lib/db";
import { requireAuth, requireAuthMinimal } from "@/lib/auth";
import { canAccessDm } from "@/lib/tiers";
import { CallStatus, CallType, SupportTierLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";

const ACTIVE_STATUSES: CallStatus[] = [CallStatus.RINGING, CallStatus.ACTIVE];

export type CallParticipant = {
  id: string;
  username: string;
  image: string | null;
};

export type CallPayload = {
  id: string;
  signalingRoomId: string;
  chatRoomId: string | null;
  callType: CallType;
  status: CallStatus;
  caller: CallParticipant;
  callee: CallParticipant;
};

function serializeCall(call: {
  id: string;
  signalingRoomId: string;
  chatRoomId: string | null;
  callType: CallType;
  status: CallStatus;
  caller: CallParticipant;
  callee: CallParticipant;
}): CallPayload {
  return {
    id: call.id,
    signalingRoomId: call.signalingRoomId,
    chatRoomId: call.chatRoomId,
    callType: call.callType,
    status: call.status,
    caller: call.caller,
    callee: call.callee,
  };
}

async function getCallWithUsers(callId: string) {
  return db.voiceCall.findUnique({
    where: { id: callId },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });
}

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

  if (block) throw new Error("BLOCKED");

  if (cosplayer?.dmEnabled) {
    const userTier = (support?.tier ?? "SEED") as SupportTierLevel;
    if (!canAccessDm(userTier, cosplayer.minChatTier)) {
      throw new Error("DM_TIER_REQUIRED");
    }
  }
}

export async function initiateCall(data: {
  calleeId: string;
  chatRoomId?: string;
  callType?: CallType;
}) {
  const user = await requireAuthMinimal();
  if (user.id === data.calleeId) return { error: "자기 자신에게는 전화할 수 없습니다." };

  const activePromise = db.voiceCall.findFirst({
    where: {
      status: { in: ACTIVE_STATUSES },
      OR: [{ callerId: user.id }, { calleeId: user.id }, { callerId: data.calleeId }, { calleeId: data.calleeId }],
    },
    select: { id: true },
  });
  const roomPromise = data.chatRoomId
    ? db.chatRoom.findUnique({
        where: { id: data.chatRoomId },
        include: { members: { select: { userId: true } } },
      })
    : Promise.resolve(null);
  const accessPromise = assertDmAccess(user.id, data.calleeId)
    .then(() => true)
    .catch(() => false);

  const [active, room, canDm] = await Promise.all([activePromise, roomPromise, accessPromise]);
  if (active) return { error: "이미 진행 중인 통화가 있습니다." };
  if (!canDm) return { error: "DM 등급 조건을 충족해야 통화할 수 있습니다." };

  if (data.chatRoomId) {
    if (!room || room.type !== "DM") return { error: "DM 방에서만 통화할 수 있습니다." };
    const memberIds = room.members.map((m) => m.userId);
    if (!memberIds.includes(user.id) || !memberIds.includes(data.calleeId)) {
      return { error: "이 대화방에 참여 중이 아닙니다." };
    }
  }

  const callType = data.callType === CallType.VIDEO ? CallType.VIDEO : CallType.AUDIO;

  const call = await db.voiceCall.create({
    data: {
      callerId: user.id,
      calleeId: data.calleeId,
      chatRoomId: data.chatRoomId,
      signalingRoomId: `call-${randomUUID()}`,
      callType,
      status: CallStatus.RINGING,
    },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });

  void notifyIncomingCall(data.calleeId, user.id, callType, call.id, data.chatRoomId);

  return { call: serializeCall(call) };
}

export async function acceptCall(callId: string) {
  const user = await requireAuthMinimal();

  const updatedCount = await db.voiceCall.updateMany({
    where: { id: callId, calleeId: user.id, status: CallStatus.RINGING },
    data: { status: CallStatus.ACTIVE, startedAt: new Date() },
  });
  if (updatedCount.count === 0) {
    const existing = await db.voiceCall.findUnique({
      where: { id: callId },
      select: { calleeId: true, status: true },
    });
    if (!existing) return { error: "통화를 찾을 수 없습니다." };
    if (existing.calleeId !== user.id) return { error: "수신자만 받을 수 있습니다." };
    return { error: "이미 처리된 통화입니다." };
  }

  const updated = await getCallWithUsers(callId);
  if (!updated) return { error: "통화를 찾을 수 없습니다." };

  return { call: serializeCall(updated) };
}

export async function declineCall(callId: string) {
  const user = await requireAuthMinimal();

  const asCallee = await db.voiceCall.updateMany({
    where: { id: callId, calleeId: user.id, status: CallStatus.RINGING },
    data: { status: CallStatus.DECLINED, endedAt: new Date() },
  });
  if (asCallee.count > 0) return { ok: true as const };

  const asCaller = await db.voiceCall.updateMany({
    where: { id: callId, callerId: user.id, status: CallStatus.RINGING },
    data: { status: CallStatus.CANCELLED, endedAt: new Date() },
  });
  if (asCaller.count > 0) return { ok: true as const };

  const allowed = await db.voiceCall.findFirst({
    where: { id: callId, OR: [{ callerId: user.id }, { calleeId: user.id }] },
    select: { id: true },
  });
  if (!allowed) return { error: "통화를 찾을 수 없습니다." };
  return { ok: true as const };
}

export async function endCall(callId: string) {
  const user = await requireAuthMinimal();

  const ended = await db.voiceCall.updateMany({
    where: {
      id: callId,
      status: { in: ACTIVE_STATUSES },
      OR: [{ callerId: user.id }, { calleeId: user.id }],
    },
    data: { status: CallStatus.ENDED, endedAt: new Date() },
  });

  if (ended.count === 0) {
    const allowed = await db.voiceCall.findFirst({
      where: { id: callId, OR: [{ callerId: user.id }, { calleeId: user.id }] },
      select: { id: true },
    });
    if (!allowed) return { error: "통화를 찾을 수 없습니다." };
    return { ok: true as const };
  }

  const chat = await db.voiceCall.findUnique({
    where: { id: callId },
    select: { chatRoomId: true },
  });
  if (chat?.chatRoomId) revalidatePath(`/messages/${chat.chatRoomId}`);
  return { ok: true as const };
}

export async function getCall(callId: string) {
  const user = await requireAuth();
  const call = await getCallWithUsers(callId);
  if (!call) return { error: "통화를 찾을 수 없습니다." };
  if (call.callerId !== user.id && call.calleeId !== user.id) return { error: "권한이 없습니다." };
  return { call: serializeCall(call) };
}
