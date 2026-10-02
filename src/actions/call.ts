"use server";

import { randomUUID } from "crypto";
import { notifyIncomingCall } from "@/lib/notifications";
import { db } from "@/lib/db";
import { requireAuth, requireAuthMinimal } from "@/lib/auth";
import { CallStatus, CallType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { peerBusyWithSomeoneElse, releaseCallerActiveCalls } from "@/lib/call-sync";

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

async function isCallBlocked(userId: string, otherUserId: string) {
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: otherUserId, blockedId: userId },
        { blockerId: userId, blockedId: otherUserId },
      ],
    },
    select: { id: true },
  });
  return !!block;
}

export async function initiateCall(data: {
  calleeId: string;
  chatRoomId?: string;
  callType?: CallType;
}) {
  const user = await requireAuthMinimal();
  if (user.id === data.calleeId) return { error: "actions.s1bo67v7" };

  await releaseCallerActiveCalls(user.id);
  const roomPromise = data.chatRoomId
    ? db.chatRoom.findUnique({
        where: { id: data.chatRoomId },
        include: { members: { select: { userId: true } } },
      })
    : Promise.resolve(null);
  const [room, blocked, peerBusy] = await Promise.all([
    roomPromise,
    isCallBlocked(user.id, data.calleeId),
    peerBusyWithSomeoneElse(user.id, data.calleeId),
  ]);
  if (peerBusy) return { error: "actions.slc5wpf" };
  if (blocked) return { error: "actions.szstt8f" };

  if (data.chatRoomId) {
    const { isCallEligibleChatRoomType } = await import("@/lib/chat-call-room");
    if (!room || !isCallEligibleChatRoomType(room.type)) {
      return { error: "actions.s16ydugc" };
    }
    const memberIds = room.members.map((m) => m.userId);
    if (!memberIds.includes(user.id) || !memberIds.includes(data.calleeId)) {
      return { error: "actions.scskvf7" };
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
    if (!existing) return { error: "actions.st31vk4" };
    if (existing.calleeId !== user.id) return { error: "actions.s1k0a6o2" };
    return { error: "actions.s1ejxtr4" };
  }

  const updated = await getCallWithUsers(callId);
  if (!updated) return { error: "actions.st31vk4" };

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
  if (!allowed) return { error: "actions.st31vk4" };
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
    if (!allowed) return { error: "actions.st31vk4" };
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
  if (!call) return { error: "actions.st31vk4" };
  if (call.callerId !== user.id && call.calleeId !== user.id) return { error: "actions.st3onev" };
  return { call: serializeCall(call) };
}
