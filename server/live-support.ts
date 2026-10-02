import type { Server, Socket } from "socket.io";
import type { PrismaClient, LiveSupportEventType } from "@prisma/client";
import { filterLiveChatContent } from "../src/lib/live-chat-filter";
import { ensureStringArray } from "../src/lib/ensure-array";
import {
  DEFAULT_ROULETTE_ITEMS,
  SUPPORT_MIN_AMOUNT,
  type PollOption,
  type LiveSupportEventPayload,
  type LiveSupportMissionPayload,
  type LiveSupportPollPayload,
} from "../src/lib/live-support/types";

type AuthedSocket = Socket & { data: { userId?: string } };

/**
 * The in-stream overlay already gives the host every cheer in real time, so the
 * push notification is only there for when they look away. One per host per
 * channel per minute keeps a busy stream from writing thousands of rows and
 * firing as many high-priority pushes at a single device.
 */
const CHEER_NOTIFY_COOLDOWN_MS = 60_000;
const lastCheerNotifyAt = new Map<string, number>();

function shouldNotifyCheer(hostId: string, channelId: string): boolean {
  const key = `${hostId}:${channelId}`;
  const now = Date.now();
  const previous = lastCheerNotifyAt.get(key) ?? 0;
  if (now - previous < CHEER_NOTIFY_COOLDOWN_MS) return false;
  lastCheerNotifyAt.set(key, now);
  if (lastCheerNotifyAt.size > 5_000) {
    for (const [k, at] of lastCheerNotifyAt) {
      if (now - at > CHEER_NOTIFY_COOLDOWN_MS) lastCheerNotifyAt.delete(k);
    }
  }
  return true;
}

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

async function ensureLiveMember(
  prisma: PrismaClient,
  channelId: string,
  userId: string
) {
  const channel = await prisma.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, createdBy: true, chatBannedWords: true },
  });
  if (!channel?.isLive) return { ok: false as const, error: "The stream is not live." };

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
    return { ok: false as const, error: `Enter at least ${min.toLocaleString()} CP.` };
  }
  return { ok: true as const };
}

export function registerLiveSupportHandlers(
  io: Server,
  socket: AuthedSocket,
  userId: string,
  prisma: PrismaClient
) {
  socket.on(
    "live_support_send",
    async (
      data: {
        channelId?: string;
        type?: LiveSupportEventType;
        amount?: number;
        message?: string;
        metadata?: Record<string, unknown>;
      },
      ack?: (r: { ok: boolean; error?: string; event?: LiveSupportEventPayload }) => void
    ) => {
      const channelId = data.channelId?.trim();
      const type = data.type ?? "GENERAL";
      const amount = Math.floor(Number(data.amount) || 0);
      if (!channelId || channelId.length > 64) {
        ack?.({ ok: false, error: "Invalid channel." });
        return;
      }

      const amountCheck = validateAmount(type, amount);
      if (!amountCheck.ok) {
        ack?.(amountCheck);
        return;
      }

      try {
        const live = await ensureLiveMember(prisma, channelId, userId);
        if (!live.ok) {
          ack?.({ ok: false, error: live.error });
          return;
        }

        const { assertLiveDonationsAllowed } = await import(
          "../src/lib/streaming-accounts/donation-guard"
        );
        const donationCheck = await assertLiveDonationsAllowed(channelId);
        if (!donationCheck.ok) {
          ack?.({ ok: false, error: donationCheck.error });
          return;
        }

        let message = data.message?.trim().slice(0, 200) || null;
        if (message) {
          const filtered = filterLiveChatContent(message, ensureStringArray(live.channel.chatBannedWords));
          if (!filtered.ok) {
            ack?.({ ok: false, error: filtered.error });
            return;
          }
          message = filtered.text;
        }

        if (type === "TTS" && !message) {
          ack?.({ ok: false, error: "TTS donations need a message." });
          return;
        }

        const metadata: Record<string, unknown> = { ...(data.metadata ?? {}) };

        if (type === "ROULETTE") {
          const items = DEFAULT_ROULETTE_ITEMS;
          const pick = items[Math.floor(Math.random() * items.length)]!;
          metadata.rouletteLabel = pick;
        }

        if (type === "SOUND" && !metadata.soundId) {
          metadata.soundId = "clap";
        }

        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        if (!sender) {
          ack?.({ ok: false, error: "User not found." });
          return;
        }

        const row = await prisma.liveSupportEvent.create({
          data: {
            channelId,
            senderId: userId,
            receiverId: live.channel.createdBy,
            type,
            amount,
            message,
            metadata: Object.keys(metadata).length ? (metadata as object) : undefined,
          },
        });

        const event: LiveSupportEventPayload = {
          id: row.id,
          channelId,
          type: row.type,
          amount: row.amount,
          message: row.message,
          metadata: (row.metadata as Record<string, unknown> | null) ?? null,
          username: sender.username,
          senderId: userId,
          at: row.createdAt.getTime(),
        };

        io.to(`live:${channelId}`).emit("live_support_event", event);

        if (shouldNotifyCheer(live.channel.createdBy, channelId)) {
          void import("@/lib/notifications")
            .then(({ notifyLiveCheer }) =>
              notifyLiveCheer(live.channel.createdBy, userId, amount, channelId, {
                message,
                eventType: type,
                rouletteLabel:
                  typeof metadata.rouletteLabel === "string" ? metadata.rouletteLabel : undefined,
              })
            )
            .catch(() => undefined);
        }

        ack?.({ ok: true, event });
      } catch {
        ack?.({ ok: false, error: "Could not process the cheer." });
      }
    }
  );

  socket.on(
    "live_mission_create",
    async (
      data: { channelId?: string; title?: string; rewardAmount?: number; deadlineMinutes?: number },
      ack?: (r: { ok: boolean; error?: string; mission?: LiveSupportMissionPayload }) => void
    ) => {
      const channelId = data.channelId?.trim();
      const title = data.title?.trim().slice(0, 120);
      const rewardAmount = Math.floor(Number(data.rewardAmount) || 0);
      if (!channelId || !title) {
        ack?.({ ok: false, error: "Enter the mission details." });
        return;
      }
      if (rewardAmount < 500 || rewardAmount > 500_000) {
        ack?.({ ok: false, error: "Mission rewards must be 500-500,000 CP." });
        return;
      }

      try {
        const live = await ensureLiveMember(prisma, channelId, userId);
        if (!live.ok) {
          ack?.({ ok: false, error: live.error });
          return;
        }

        const filtered = filterLiveChatContent(title, ensureStringArray(live.channel.chatBannedWords));
        if (!filtered.ok) {
          ack?.({ ok: false, error: filtered.error });
          return;
        }

        const deadlineMinutes = Math.min(180, Math.max(5, Math.floor(Number(data.deadlineMinutes) || 30)));
        const deadline = new Date(Date.now() + deadlineMinutes * 60_000);

        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        if (!sender) {
          ack?.({ ok: false, error: "User not found." });
          return;
        }

        const row = await prisma.liveSupportMission.create({
          data: {
            channelId,
            senderId: userId,
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
          senderId: userId,
          deadline: row.deadline?.getTime() ?? null,
          at: row.createdAt.getTime(),
        };

        io.to(`live:${channelId}`).emit("live_mission_updated", mission);
        ack?.({ ok: true, mission });
      } catch {
        ack?.({ ok: false, error: "Could not create the mission." });
      }
    }
  );

  socket.on(
    "live_mission_resolve",
    async (
      data: { missionId?: string; status?: "ACCEPTED" | "COMPLETED" | "FAILED" | "CANCELLED" },
      ack?: (r: { ok: boolean; error?: string; mission?: LiveSupportMissionPayload }) => void
    ) => {
      const missionId = data.missionId?.trim();
      const status = data.status;
      if (!missionId || !status) {
        ack?.({ ok: false, error: "Invalid request." });
        return;
      }

      try {
        const mission = await prisma.liveSupportMission.findUnique({
          where: { id: missionId },
          include: { sender: { select: { username: true } } },
        });
        if (!mission) {
          ack?.({ ok: false, error: "Mission not found." });
          return;
        }

        const channel = await prisma.voiceChannel.findUnique({
          where: { id: mission.channelId },
          select: { createdBy: true, isLive: true },
        });
        if (!channel?.isLive) {
          ack?.({ ok: false, error: "The stream is not live." });
          return;
        }

        const isHost = channel.createdBy === userId;
        const isSender = mission.senderId === userId;

        if (status === "ACCEPTED" && !isHost) {
          ack?.({ ok: false, error: "Only the host can accept." });
          return;
        }
        if ((status === "COMPLETED" || status === "FAILED") && !isHost) {
          ack?.({ ok: false, error: "Only the host can resolve the result." });
          return;
        }
        if (status === "CANCELLED" && !isSender && !isHost) {
          ack?.({ ok: false, error: "You don't have permission." });
          return;
        }
        if (mission.status !== "PENDING" && status === "ACCEPTED") {
          ack?.({ ok: false, error: "This mission was already handled." });
          return;
        }
        if (mission.status === "COMPLETED" || mission.status === "CANCELLED") {
          ack?.({ ok: false, error: "This mission has ended." });
          return;
        }

        const row = await prisma.liveSupportMission.update({
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

        io.to(`live:${mission.channelId}`).emit("live_mission_updated", payload);
        ack?.({ ok: true, mission: payload });
      } catch {
        ack?.({ ok: false, error: "Could not process the mission." });
      }
    }
  );

  socket.on(
    "live_poll_create",
    async (
      data: {
        channelId?: string;
        question?: string;
        options?: string[];
        voteCost?: number;
        durationMinutes?: number;
      },
      ack?: (r: { ok: boolean; error?: string; poll?: LiveSupportPollPayload }) => void
    ) => {
      const channelId = data.channelId?.trim();
      const question = data.question?.trim().slice(0, 120);
      const labels = (data.options ?? []).map((o) => o.trim().slice(0, 80)).filter(Boolean);
      if (!channelId || !question || labels.length < 2) {
        ack?.({ ok: false, error: "A question and at least 2 options are required." });
        return;
      }

      try {
        const channel = await prisma.voiceChannel.findUnique({
          where: { id: channelId },
          select: { createdBy: true, isLive: true, chatBannedWords: true },
        });
        if (!channel?.isLive || channel.createdBy !== userId) {
          ack?.({ ok: false, error: "Only the host can create polls." });
          return;
        }

        const filteredQ = filterLiveChatContent(question, ensureStringArray(channel.chatBannedWords));
        if (!filteredQ.ok) {
          ack?.({ ok: false, error: filteredQ.error });
          return;
        }

        const voteCost = Math.min(10_000, Math.max(100, Math.floor(Number(data.voteCost) || 100)));
        const durationMinutes = Math.min(120, Math.max(5, Math.floor(Number(data.durationMinutes) || 15)));
        const endsAt = new Date(Date.now() + durationMinutes * 60_000);

        const options: PollOption[] = labels.slice(0, 6).map((label, i) => ({
          id: `opt-${i}`,
          label,
          votes: 0,
        }));

        await prisma.liveSupportPoll.updateMany({
          where: { channelId, status: "OPEN" },
          data: { status: "CLOSED" },
        });

        const row = await prisma.liveSupportPoll.create({
          data: {
            channelId,
            hostId: userId,
            question: filteredQ.text,
            options,
            voteCost,
            endsAt,
          },
        });

        const poll: LiveSupportPollPayload = {
          id: row.id,
          channelId,
          question: row.question,
          options: parsePollOptions(row.options),
          voteCost: row.voteCost,
          status: row.status,
          endsAt: row.endsAt?.getTime() ?? null,
        };

        io.to(`live:${channelId}`).emit("live_poll_updated", poll);
        ack?.({ ok: true, poll });
      } catch {
        ack?.({ ok: false, error: "Could not create the poll." });
      }
    }
  );

  socket.on(
    "live_poll_vote",
    async (
      data: { pollId?: string; optionId?: string; amount?: number },
      ack?: (r: { ok: boolean; error?: string; poll?: LiveSupportPollPayload; event?: LiveSupportEventPayload }) => void
    ) => {
      const pollId = data.pollId?.trim();
      const optionId = data.optionId?.trim();
      if (!pollId || !optionId) {
        ack?.({ ok: false, error: "Choose an option." });
        return;
      }

      try {
        const poll = await prisma.liveSupportPoll.findUnique({ where: { id: pollId } });
        if (!poll || poll.status !== "OPEN") {
          ack?.({ ok: false, error: "There is no active poll." });
          return;
        }
        if (poll.endsAt && poll.endsAt.getTime() < Date.now()) {
          await prisma.liveSupportPoll.update({ where: { id: pollId }, data: { status: "CLOSED" } });
          ack?.({ ok: false, error: "The poll has ended." });
          return;
        }

        const live = await ensureLiveMember(prisma, poll.channelId, userId);
        if (!live.ok) {
          ack?.({ ok: false, error: live.error });
          return;
        }

        const amount = Math.floor(Number(data.amount) || poll.voteCost);
        const amountCheck = validateAmount("VOTE", amount);
        if (!amountCheck.ok) {
          ack?.(amountCheck);
          return;
        }

        const existing = await prisma.liveSupportPollVote.findUnique({
          where: { pollId_userId: { pollId, userId } },
        });
        if (existing) {
          ack?.({ ok: false, error: "You already voted." });
          return;
        }

        const options = parsePollOptions(poll.options);
        const target = options.find((o) => o.id === optionId);
        if (!target) {
          ack?.({ ok: false, error: "Invalid option." });
          return;
        }

        target.votes += amount;

        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        if (!sender) {
          ack?.({ ok: false, error: "User not found." });
          return;
        }

        await prisma.liveSupportPollVote.create({
          data: { pollId, userId, optionId, amount },
        });

        const updatedPoll = await prisma.liveSupportPoll.update({
          where: { id: pollId },
          data: { options },
        });

        const row = await prisma.liveSupportEvent.create({
          data: {
            channelId: poll.channelId,
            senderId: userId,
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
          senderId: userId,
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

        io.to(`live:${poll.channelId}`).emit("live_poll_updated", pollPayload);
        io.to(`live:${poll.channelId}`).emit("live_support_event", event);
        ack?.({ ok: true, poll: pollPayload, event });
      } catch {
        ack?.({ ok: false, error: "Could not submit your vote." });
      }
    }
  );
}
