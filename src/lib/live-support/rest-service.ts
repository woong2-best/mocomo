import type { LiveSupportEventType, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { filterLiveChatContent } from "@/lib/live-chat-filter";
import { ensureStringArray } from "@/lib/ensure-array";
import {
  DEFAULT_ROULETTE_ITEMS,
  SUPPORT_MIN_AMOUNT,
  type LiveSupportEventPayload,
  type LiveSupportMissionPayload,
  type LiveSupportPollPayload,
  type PollOption,
} from "@/lib/live-support/types";
import {
  relayLiveMissionUpdated,
  relayLivePollUpdated,
  relayLiveSupportEvent,
} from "@/lib/live-support-socket-relay";

function parsePollOptions(raw: unknown): PollOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o, i) => {
      if (!o || typeof o !== "object") return null;
      const row = o as { id?: string; label?: string; votes?: number };
      const label = String(row.label ?? "").trim().slice(0, 80);
      if (!label) return null;
      return {
        id: String(row.id ?? `opt-${i}`).slice(0, 32),
        label,
        votes: typeof row.votes === "number" ? row.votes : 0,
      };
    })
    .filter(Boolean) as PollOption[];
}

async function ensureLiveMember(prisma: PrismaClient, channelId: string, userId: string) {
  const channel = await prisma.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, createdBy: true, chatBannedWords: true },
  });
  if (!channel?.isLive) return { ok: false as const, error: "방송 중이 아닙니다." };

  await prisma.voiceMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId, role: "VIEWER", lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });

  return { ok: true as const, channel };
}

function validateAmount(type: LiveSupportEventType, amount: number) {
  const min = SUPPORT_MIN_AMOUNT[type] ?? 100;
  if (!Number.isFinite(amount) || amount < min || amount > 1_000_000) {
    return { ok: false as const, error: `최소 ${min.toLocaleString()} CP 이상 입력해 주세요.` };
  }
  return { ok: true as const };
}

export async function sendLiveSupportCheerRest(input: {
  userId: string;
  channelId: string;
  type: LiveSupportEventType;
  amount: number;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true; event: LiveSupportEventPayload } | { ok: false; error: string }> {
  const channelId = input.channelId.trim();
  const type = input.type ?? "GENERAL";
  const amount = Math.floor(Number(input.amount) || 0);

  const amountCheck = validateAmount(type, amount);
  if (!amountCheck.ok) return amountCheck;

  const live = await ensureLiveMember(db, channelId, input.userId);
  if (!live.ok) return live;

  const { assertLiveDonationsAllowed } = await import("@/lib/streaming-accounts/donation-guard");
  const donationCheck = await assertLiveDonationsAllowed(channelId);
  if (!donationCheck.ok) return { ok: false, error: donationCheck.error };

  let message = input.message?.trim().slice(0, 200) || null;
  if (message) {
    const filtered = filterLiveChatContent(message, ensureStringArray(live.channel.chatBannedWords));
    if (!filtered.ok) return { ok: false, error: filtered.error };
    message = filtered.text;
  }

  if (type === "TTS" && !message) {
    return { ok: false, error: "TTS 후원은 메시지가 필요합니다." };
  }

  const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };
  if (type === "ROULETTE") {
    metadata.rouletteLabel = DEFAULT_ROULETTE_ITEMS[Math.floor(Math.random() * DEFAULT_ROULETTE_ITEMS.length)];
  }
  if (type === "SOUND" && !metadata.soundId) {
    metadata.soundId = "clap";
  }

  const sender = await db.user.findUnique({
    where: { id: input.userId },
    select: { username: true },
  });
  if (!sender) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const row = await db.liveSupportEvent.create({
    data: {
      channelId,
      senderId: input.userId,
      receiverId: live.channel.createdBy,
      type,
      amount,
      message,
      metadata: Object.keys(metadata).length ? (metadata as object) : undefined,
    },
  });

  void import("@/lib/apt/economy/live-gold-service")
    .then(({ grantLiveCheerGold }) => grantLiveCheerGold(input.userId, amount, row.id))
    .catch(() => undefined);

  const event: LiveSupportEventPayload = {
    id: row.id,
    channelId,
    type: row.type,
    amount: row.amount,
    message: row.message,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    username: sender.username,
    senderId: input.userId,
    at: row.createdAt.getTime(),
  };

  void relayLiveSupportEvent(channelId, event);
  return { ok: true, event };
}

export async function createLiveSupportMissionRest(input: {
  userId: string;
  channelId: string;
  title: string;
  rewardAmount: number;
  deadlineMinutes?: number;
}): Promise<{ ok: true; mission: LiveSupportMissionPayload } | { ok: false; error: string }> {
  const channelId = input.channelId.trim();
  const title = input.title.trim().slice(0, 120);
  const rewardAmount = Math.floor(Number(input.rewardAmount) || 0);

  if (!channelId || !title) return { ok: false, error: "미션 내용을 입력해 주세요." };
  if (rewardAmount < 500 || rewardAmount > 500_000) {
    return { ok: false, error: "미션 보상은 500~500,000 CP 입니다." };
  }

  const live = await ensureLiveMember(db, channelId, input.userId);
  if (!live.ok) return live;

  const filtered = filterLiveChatContent(title, ensureStringArray(live.channel.chatBannedWords));
  if (!filtered.ok) return { ok: false, error: filtered.error };

  const deadlineMinutes = Math.min(180, Math.max(5, Math.floor(Number(input.deadlineMinutes) || 30)));
  const deadline = new Date(Date.now() + deadlineMinutes * 60_000);

  const sender = await db.user.findUnique({
    where: { id: input.userId },
    select: { username: true },
  });
  if (!sender) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const row = await db.liveSupportMission.create({
    data: {
      channelId,
      senderId: input.userId,
      receiverId: live.channel.createdBy,
      title: filtered.text,
      rewardAmount,
      deadline,
    },
  });

  const mission: LiveSupportMissionPayload = {
    id: row.id,
    channelId,
    title: row.title,
    rewardAmount: row.rewardAmount,
    status: row.status,
    username: sender.username,
    senderId: input.userId,
    deadline: row.deadline?.getTime() ?? null,
    at: row.createdAt.getTime(),
  };

  void relayLiveMissionUpdated(channelId, mission);
  return { ok: true, mission };
}

export async function resolveLiveSupportMissionRest(input: {
  userId: string;
  missionId: string;
  status: "ACCEPTED" | "COMPLETED" | "FAILED" | "CANCELLED";
}): Promise<{ ok: true; mission: LiveSupportMissionPayload } | { ok: false; error: string }> {
  const missionId = input.missionId.trim();
  const status = input.status;
  if (!missionId || !status) return { ok: false, error: "잘못된 요청입니다." };

  const mission = await db.liveSupportMission.findUnique({
    where: { id: missionId },
    include: { sender: { select: { username: true } } },
  });
  if (!mission) return { ok: false, error: "미션을 찾을 수 없습니다." };

  const channel = await db.voiceChannel.findUnique({
    where: { id: mission.channelId },
    select: { createdBy: true, isLive: true },
  });
  if (!channel?.isLive) return { ok: false, error: "방송 중이 아닙니다." };

  const isHost = channel.createdBy === input.userId;
  const isSender = mission.senderId === input.userId;

  if (status === "ACCEPTED" && !isHost) return { ok: false, error: "호스트만 수락할 수 있습니다." };
  if ((status === "COMPLETED" || status === "FAILED") && !isHost) {
    return { ok: false, error: "호스트만 결과를 처리할 수 있습니다." };
  }
  if (status === "CANCELLED" && !isSender && !isHost) {
    return { ok: false, error: "권한이 없습니다." };
  }
  if (mission.status !== "PENDING" && status === "ACCEPTED") {
    return { ok: false, error: "이미 처리된 미션입니다." };
  }
  if (mission.status === "COMPLETED" || mission.status === "CANCELLED") {
    return { ok: false, error: "종료된 미션입니다." };
  }

  const row = await db.liveSupportMission.update({
    where: { id: missionId },
    data: { status, resolvedAt: new Date() },
  });

  const payload: LiveSupportMissionPayload = {
    id: row.id,
    channelId: row.channelId,
    title: row.title,
    rewardAmount: row.rewardAmount,
    status: row.status,
    username: mission.sender.username,
    senderId: row.senderId,
    deadline: row.deadline?.getTime() ?? null,
    at: row.createdAt.getTime(),
  };

  void relayLiveMissionUpdated(row.channelId, payload);
  return { ok: true, mission: payload };
}

export async function voteLiveSupportPollRest(input: {
  userId: string;
  pollId: string;
  optionId: string;
  amount?: number;
}): Promise<
  | { ok: true; poll: LiveSupportPollPayload; event: LiveSupportEventPayload }
  | { ok: false; error: string }
> {
  const pollId = input.pollId.trim();
  const optionId = input.optionId.trim();
  if (!pollId || !optionId) return { ok: false, error: "선택지를 골라 주세요." };

  const poll = await db.liveSupportPoll.findUnique({ where: { id: pollId } });
  if (!poll || poll.status !== "OPEN") return { ok: false, error: "진행 중인 투표가 없습니다." };
  if (poll.endsAt && poll.endsAt.getTime() < Date.now()) {
    await db.liveSupportPoll.update({ where: { id: pollId }, data: { status: "CLOSED" } });
    return { ok: false, error: "투표가 종료되었습니다." };
  }

  const live = await ensureLiveMember(db, poll.channelId, input.userId);
  if (!live.ok) return live;

  const amount = Math.floor(Number(input.amount) || poll.voteCost);
  const amountCheck = validateAmount("VOTE", amount);
  if (!amountCheck.ok) return amountCheck;

  const existing = await db.liveSupportPollVote.findUnique({
    where: { pollId_userId: { pollId, userId: input.userId } },
  });
  if (existing) return { ok: false, error: "이미 투표했습니다." };

  const options = parsePollOptions(poll.options);
  const target = options.find((o) => o.id === optionId);
  if (!target) return { ok: false, error: "잘못된 선택지입니다." };

  target.votes += amount;

  const sender = await db.user.findUnique({
    where: { id: input.userId },
    select: { username: true },
  });
  if (!sender) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  await db.liveSupportPollVote.create({
    data: { pollId, userId: input.userId, optionId, amount },
  });

  const updatedPoll = await db.liveSupportPoll.update({
    where: { id: pollId },
    data: { options },
  });

  const row = await db.liveSupportEvent.create({
    data: {
      channelId: poll.channelId,
      senderId: input.userId,
      receiverId: live.channel.createdBy,
      type: "VOTE",
      amount,
      message: `${poll.question}: ${target.label}`,
      metadata: { pollId, optionId, optionLabel: target.label },
    },
  });

  const event: LiveSupportEventPayload = {
    id: row.id,
    channelId: poll.channelId,
    type: "VOTE",
    amount: row.amount,
    message: row.message,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    username: sender.username,
    senderId: input.userId,
    at: row.createdAt.getTime(),
  };

  const pollPayload: LiveSupportPollPayload = {
    id: updatedPoll.id,
    channelId: updatedPoll.channelId,
    question: updatedPoll.question,
    options: parsePollOptions(updatedPoll.options),
    voteCost: updatedPoll.voteCost,
    status: updatedPoll.status,
    endsAt: updatedPoll.endsAt?.getTime() ?? null,
  };

  void relayLiveSupportEvent(poll.channelId, event);
  void relayLivePollUpdated(poll.channelId, pollPayload);
  return { ok: true, poll: pollPayload, event };
}

export async function listLiveSupportMissions(
  channelId: string
): Promise<LiveSupportMissionPayload[]> {
  const rows = await db.liveSupportMission.findMany({
    where: { channelId, status: { in: ["PENDING", "ACCEPTED"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { sender: { select: { username: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    channelId: r.channelId,
    title: r.title,
    rewardAmount: r.rewardAmount,
    status: r.status,
    username: r.sender.username,
    senderId: r.senderId,
    deadline: r.deadline?.getTime() ?? null,
    at: r.createdAt.getTime(),
  }));
}

export async function getOpenLiveSupportPoll(
  channelId: string
): Promise<LiveSupportPollPayload | null> {
  const row = await db.liveSupportPoll.findFirst({
    where: { channelId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    id: row.id,
    channelId: row.channelId,
    question: row.question,
    options: parsePollOptions(row.options),
    voteCost: row.voteCost,
    status: row.status,
    endsAt: row.endsAt?.getTime() ?? null,
  };
}
