"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generateLiveJoinPassword, hashLiveJoinPassword, verifyLiveJoinPassword } from "@/lib/live-password";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { revalidatePath } from "next/cache";
import type { ChatRoomType } from "@prisma/client";

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateLiveJoinPassword();
    const exists = await db.chatRoom.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("JOIN_CODE_EXHAUSTED");
}

async function createGroupRoomBase(data: {
  name: string;
  type: Extract<ChatRoomType, "COSPLAYER_GROUP" | "SOCIAL_GROUP">;
  joinCode: string | null;
  joinPasswordHash: string | null;
  requirePassword: boolean;
  ownerId: string;
}) {
  const room = await db.chatRoom.create({
    data: {
      name: data.name.trim().slice(0, 80) || "단체방",
      type: data.type,
      isPublic: false,
      createdById: data.ownerId,
      joinCode: data.joinCode,
      joinPasswordHash: data.joinPasswordHash,
      requirePassword: data.requirePassword,
      members: {
        create: { userId: data.ownerId, role: "owner" },
      },
    },
    include: {
      members: { include: { user: { select: userPublicSelectMinimal } } },
    },
  });
  revalidatePath("/messages");
  return room;
}

/** 코스어 전용 단체방 — 코스어만 개설, 6자리 입장 코드 자동 생성 */
export async function createCosplayerGroupRoom(name: string) {
  const user = await requireAuth();
  const cosplayer = await db.cosplayerProfile.findUnique({ where: { userId: user.id } });
  if (!cosplayer) {
    return { error: "코스어 프로필이 있어야 단체방을 만들 수 있습니다. /cosplay/apply 에서 신청해 주세요." };
  }

  const joinCode = await uniqueJoinCode();
  const joinPasswordHash = await hashLiveJoinPassword(joinCode);

  try {
    const room = await createGroupRoomBase({
      name,
      type: "COSPLAYER_GROUP",
      joinCode,
      joinPasswordHash,
      requirePassword: true,
      ownerId: user.id,
    });
    return { room, joinCode };
  } catch (e) {
    console.error("[createCosplayerGroupRoom]", e);
    return { error: "단체방을 만들지 못했습니다." };
  }
}

/** 일반 친목 단체방 — 비밀번호 선택(6자리 자동 또는 직접 입력) / 비밀번호 없이 공개 입장 */
export async function createSocialGroupRoom(data: {
  name: string;
  usePassword: boolean;
  customPassword?: string;
}) {
  const user = await requireAuth();

  let joinCode: string | null = null;
  let joinPasswordHash: string | null = null;
  let requirePassword = false;
  let plainPassword: string | undefined;

  if (data.usePassword) {
    requirePassword = true;
    plainPassword = (data.customPassword?.trim() || (await uniqueJoinCode())).toUpperCase().slice(0, 12);
    if (plainPassword.length < 4) {
      return { error: "비밀번호는 4자 이상이어야 합니다." };
    }
    joinCode = plainPassword.length <= 6 ? plainPassword : null;
    joinPasswordHash = await hashLiveJoinPassword(plainPassword);
  }

  try {
    const room = await createGroupRoomBase({
      name: data.name,
      type: "SOCIAL_GROUP",
      joinCode,
      joinPasswordHash,
      requirePassword,
      ownerId: user.id,
    });
    return {
      room,
      joinCode: joinCode ?? undefined,
      password: plainPassword,
      openLink: !requirePassword,
    };
  } catch (e) {
    console.error("[createSocialGroupRoom]", e);
    return { error: "단체방을 만들지 못했습니다." };
  }
}

async function addMemberIfNeeded(roomId: string, userId: string) {
  await db.chatMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, role: "member" },
    update: { lastReadAt: new Date() },
  });
}

/** 6자리 코드로 입장 (코스어 방·비밀번호 친목방) */
export async function joinGroupRoomByCode(code: string) {
  const user = await requireAuth();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "입장 코드를 입력해 주세요." };

  const room = await db.chatRoom.findFirst({
    where: {
      joinCode: normalized,
      type: { in: ["COSPLAYER_GROUP", "SOCIAL_GROUP"] },
    },
  });
  if (!room) return { error: "일치하는 단체방이 없습니다. 코드를 확인해 주세요." };
  if (!room.joinPasswordHash) return { error: "이 방은 링크로만 입장할 수 있습니다." };

  const ok = await verifyLiveJoinPassword(normalized, room.joinPasswordHash);
  if (!ok) return { error: "입장 코드가 올바르지 않습니다." };

  await addMemberIfNeeded(room.id, user.id);
  revalidatePath("/messages");
  return { roomId: room.id };
}

/** 방 ID + (선택) 비밀번호로 입장 */
export async function joinGroupRoomById(roomId: string, password?: string) {
  const user = await requireAuth();
  const room = await db.chatRoom.findUnique({ where: { id: roomId } });
  if (!room || (room.type !== "COSPLAYER_GROUP" && room.type !== "SOCIAL_GROUP")) {
    return { error: "단체방을 찾을 수 없습니다." };
  }

  if (room.requirePassword && room.joinPasswordHash) {
    if (!password?.trim()) return { error: "비밀번호가 필요합니다." };
    const ok = await verifyLiveJoinPassword(password, room.joinPasswordHash);
    if (!ok) return { error: "비밀번호가 올바르지 않습니다." };
  }

  await addMemberIfNeeded(room.id, user.id);
  revalidatePath("/messages");
  return { roomId: room.id };
}

export async function getGroupRoomMeta(roomId: string) {
  const user = await requireAuth();
  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: userPublicSelectMinimal } } },
      polls: {
        where: { closed: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          options: { orderBy: { order: "asc" } },
          votes: { select: { optionId: true, userId: true } },
        },
      },
      voiceChannel: { select: { id: true, isLive: true, name: true } },
    },
  });
  if (!room) return { error: "방을 찾을 수 없습니다." };
  const member = room.members.find((m) => m.userId === user.id);
  if (!member) return { error: "NOT_MEMBER" };

  const isOwner = member.role === "owner" || room.createdById === user.id;

  return {
    room: {
      id: room.id,
      name: room.name,
      type: room.type,
      joinCode: isOwner ? room.joinCode : null,
      requirePassword: room.requirePassword,
      announcementTitle: room.announcementTitle,
      announcementBody: room.announcementBody,
      announcementAt: room.announcementAt?.toISOString() ?? null,
      voiceChannelId: room.voiceChannelId,
      voiceLive: room.voiceChannel?.isLive ?? false,
    },
    isOwner,
    polls: room.polls.map((p) => ({
      id: p.id,
      question: p.question,
      closed: p.closed,
      options: p.options.map((o) => ({
        id: o.id,
        label: o.label,
        count: p.votes.filter((v) => v.optionId === o.id).length,
      })),
      myVote: p.votes.find((v) => v.userId === user.id)?.optionId ?? null,
    })),
  };
}

export async function setGroupRoomAnnouncement(roomId: string, title: string, body: string) {
  const user = await requireAuth();
  const member = await db.chatMember.findFirst({
    where: { roomId, userId: user.id, role: { in: ["owner", "admin"] } },
  });
  if (!member) return { error: "공지는 방장만 등록할 수 있습니다." };

  const room = await db.chatRoom.findUnique({ where: { id: roomId }, select: { type: true } });
  if (room?.type !== "COSPLAYER_GROUP") {
    return { error: "공지는 코스어 단체방에서만 사용할 수 있습니다." };
  }

  await db.chatRoom.update({
    where: { id: roomId },
    data: {
      announcementTitle: title.trim().slice(0, 120) || "공지",
      announcementBody: body.trim().slice(0, 4000),
      announcementById: user.id,
      announcementAt: new Date(),
    },
  });
  revalidatePath(`/messages/${roomId}`);
  return { success: true };
}

export async function createGroupPoll(roomId: string, question: string, options: string[]) {
  const user = await requireAuth();
  const member = await db.chatMember.findFirst({
    where: { roomId, userId: user.id, role: { in: ["owner", "admin"] } },
  });
  if (!member) return { error: "투표는 방장만 만들 수 있습니다." };

  const room = await db.chatRoom.findUnique({ where: { id: roomId }, select: { type: true } });
  if (room?.type !== "COSPLAYER_GROUP") {
    return { error: "투표는 코스어 단체방에서만 사용할 수 있습니다." };
  }

  const labels = options.map((o) => o.trim()).filter(Boolean).slice(0, 6);
  if (labels.length < 2) return { error: "선택지는 2개 이상 필요합니다." };

  const poll = await db.chatPoll.create({
    data: {
      roomId,
      question: question.trim().slice(0, 200),
      createdBy: user.id,
      options: {
        create: labels.map((label, order) => ({ label, order })),
      },
    },
    include: { options: true },
  });

  revalidatePath(`/messages/${roomId}`);
  return { poll };
}

export async function voteGroupPoll(pollId: string, optionId: string) {
  const user = await requireAuth();
  const poll = await db.chatPoll.findUnique({
    where: { id: pollId },
    include: { options: true, room: { select: { id: true, type: true } } },
  });
  if (!poll || poll.closed) return { error: "투표를 할 수 없습니다." };
  if (poll.room.type !== "COSPLAYER_GROUP") return { error: "유효하지 않은 투표입니다." };

  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId: poll.roomId, userId: user.id } },
  });
  if (!member) return { error: "방 멤버만 투표할 수 있습니다." };
  if (!poll.options.some((o) => o.id === optionId)) return { error: "선택지가 올바르지 않습니다." };

  await db.chatPollVote.upsert({
    where: { pollId_userId: { pollId, userId: user.id } },
    create: { pollId, optionId, userId: user.id },
    update: { optionId, votedAt: new Date() },
  });

  revalidatePath(`/messages/${poll.roomId}`);
  return { success: true };
}

/** 친목 단체방 — 단체 음성 통화 (LiveKit, 멤버 전원 발언 가능) */
export async function startSocialGroupVoiceCall(roomId: string) {
  const user = await requireAuth();
  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: { voiceChannel: true },
  });
  if (!room || room.type !== "SOCIAL_GROUP") {
    return { error: "친목 단체방에서만 단체 통화를 시작할 수 있습니다." };
  }

  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!member) return { error: "방 멤버만 통화를 시작할 수 있습니다." };

  if (room.voiceChannelId && room.voiceChannel) {
    if (!room.voiceChannel.isLive) {
      await db.voiceChannel.update({
        where: { id: room.voiceChannel.id },
        data: { isLive: true },
      });
    }
    await db.voiceMember.upsert({
      where: { channelId_userId: { channelId: room.voiceChannel.id, userId: user.id } },
      create: { channelId: room.voiceChannel.id, userId: user.id, role: "HOST", lastSeenAt: new Date() },
      update: { lastSeenAt: new Date(), role: "HOST" },
    });
    revalidatePath(`/messages/${roomId}`);
    return { channelId: room.voiceChannel.id };
  }

  const channel = await db.voiceChannel.create({
    data: {
      name: room.name ? `${room.name} 통화` : "단체 통화",
      maxUsers: 30,
      isLive: true,
      allowScreen: true,
      allowCamera: true,
      createdBy: user.id,
      members: {
        create: { userId: user.id, role: "HOST", lastSeenAt: new Date() },
      },
    },
  });

  await db.chatRoom.update({
    where: { id: roomId },
    data: { voiceChannelId: channel.id },
  });

  revalidatePath(`/messages/${roomId}`);
  return { channelId: channel.id };
}

export async function joinSocialGroupVoiceCall(roomId: string) {
  const user = await requireAuth();
  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    select: { type: true, voiceChannelId: true, voiceChannel: { select: { id: true, isLive: true } } },
  });
  if (!room?.voiceChannelId || !room.voiceChannel?.isLive) {
    return { error: "진행 중인 단체 통화가 없습니다." };
  }

  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!member) return { error: "방 멤버만 참여할 수 있습니다." };

  await db.voiceMember.upsert({
    where: { channelId_userId: { channelId: room.voiceChannelId, userId: user.id } },
    create: {
      channelId: room.voiceChannelId,
      userId: user.id,
      role: "LISTENER",
      lastSeenAt: new Date(),
    },
    update: { lastSeenAt: new Date() },
  });

  return { channelId: room.voiceChannelId };
}
