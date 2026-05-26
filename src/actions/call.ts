"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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
  livekitRoom: string;
  chatRoomId: string | null;
  callType: CallType;
  status: CallStatus;
  caller: CallParticipant;
  callee: CallParticipant;
};

function serializeCall(call: {
  id: string;
  livekitRoom: string;
  chatRoomId: string | null;
  callType: CallType;
  status: CallStatus;
  caller: CallParticipant;
  callee: CallParticipant;
}): CallPayload {
  return {
    id: call.id,
    livekitRoom: call.livekitRoom,
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
  const cosplayer = await db.cosplayerProfile.findUnique({
    where: { userId: otherUserId },
    select: { dmEnabled: true, minChatTier: true },
  });

  if (cosplayer?.dmEnabled) {
    const support = await db.creatorSupport.findUnique({
      where: { supporterId_creatorId: { supporterId: userId, creatorId: otherUserId } },
    });
    const userTier = (support?.tier ?? "PEBBLE") as SupportTierLevel;
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
  const user = await requireAuth();
  if (user.id === data.calleeId) return { error: "자기 자신에게는 전화할 수 없습니다." };

  const active = await db.voiceCall.findFirst({
    where: {
      status: { in: ACTIVE_STATUSES },
      OR: [{ callerId: user.id }, { calleeId: user.id }, { callerId: data.calleeId }, { calleeId: data.calleeId }],
    },
  });
  if (active) return { error: "이미 진행 중인 통화가 있습니다." };

  if (data.chatRoomId) {
    const room = await db.chatRoom.findUnique({
      where: { id: data.chatRoomId },
      include: { members: { select: { userId: true } } },
    });
    if (!room || room.type !== "DM") return { error: "DM 방에서만 통화할 수 있습니다." };
    const memberIds = room.members.map((m) => m.userId);
    if (!memberIds.includes(user.id) || !memberIds.includes(data.calleeId)) {
      return { error: "이 대화방에 참여 중이 아닙니다." };
    }
  }

  try {
    await assertDmAccess(user.id, data.calleeId);
  } catch {
    return { error: "DM 등급 조건을 충족해야 통화할 수 있습니다." };
  }

  const callType = data.callType === CallType.VIDEO ? CallType.VIDEO : CallType.AUDIO;

  const call = await db.voiceCall.create({
    data: {
      callerId: user.id,
      calleeId: data.calleeId,
      chatRoomId: data.chatRoomId,
      livekitRoom: `call-${randomUUID()}`,
      callType,
      status: CallStatus.RINGING,
    },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });

  return { call: serializeCall(call) };
}

export async function acceptCall(callId: string) {
  const user = await requireAuth();
  const call = await getCallWithUsers(callId);
  if (!call) return { error: "통화를 찾을 수 없습니다." };
  if (call.calleeId !== user.id) return { error: "수신자만 받을 수 있습니다." };
  if (call.status !== CallStatus.RINGING) return { error: "이미 처리된 통화입니다." };

  const updated = await db.voiceCall.update({
    where: { id: callId },
    data: { status: CallStatus.ACTIVE, startedAt: new Date() },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });

  return { call: serializeCall(updated) };
}

export async function declineCall(callId: string) {
  const user = await requireAuth();
  const call = await getCallWithUsers(callId);
  if (!call) return { error: "통화를 찾을 수 없습니다." };
  if (call.calleeId !== user.id && call.callerId !== user.id) return { error: "권한이 없습니다." };

  const status = call.calleeId === user.id ? CallStatus.DECLINED : CallStatus.CANCELLED;
  const updated = await db.voiceCall.update({
    where: { id: callId },
    data: { status, endedAt: new Date() },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });

  return { call: serializeCall(updated) };
}

export async function endCall(callId: string) {
  const user = await requireAuth();
  const call = await getCallWithUsers(callId);
  if (!call) return { error: "통화를 찾을 수 없습니다." };
  if (call.callerId !== user.id && call.calleeId !== user.id) return { error: "권한이 없습니다." };
  if (!ACTIVE_STATUSES.includes(call.status)) return { call: serializeCall(call) };

  const updated = await db.voiceCall.update({
    where: { id: callId },
    data: { status: CallStatus.ENDED, endedAt: new Date() },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });

  if (call.chatRoomId) revalidatePath(`/messages/${call.chatRoomId}`);
  return { call: serializeCall(updated) };
}

export async function getCall(callId: string) {
  const user = await requireAuth();
  const call = await getCallWithUsers(callId);
  if (!call) return { error: "통화를 찾을 수 없습니다." };
  if (call.callerId !== user.id && call.calleeId !== user.id) return { error: "권한이 없습니다." };
  return { call: serializeCall(call) };
}
