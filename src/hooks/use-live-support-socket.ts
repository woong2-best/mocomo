"use client";

import type { Socket } from "socket.io-client";
import type {
  LiveSupportEventPayload,
  LiveSupportMissionPayload,
  LiveSupportPollPayload,
  SoundPresetId,
} from "@/lib/live-support/types";
import type { LiveSupportEventType } from "@prisma/client";

export function sendLiveSupport(
  socket: Socket | null,
  payload: {
    channelId: string;
    type: LiveSupportEventType;
    amount: number;
    message?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ ok: boolean; error?: string; event?: LiveSupportEventPayload }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: "실시간 서버에 연결되지 않았습니다." });
      return;
    }
    socket.emit("live_support_send", payload, (res: { ok: boolean; error?: string; event?: LiveSupportEventPayload }) => {
      resolve(res ?? { ok: false, error: "응답 없음" });
    });
  });
}

export function createLiveMission(
  socket: Socket | null,
  payload: {
    channelId: string;
    title: string;
    rewardAmount: number;
    deadlineMinutes?: number;
  }
): Promise<{ ok: boolean; error?: string; mission?: LiveSupportMissionPayload }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: "실시간 서버에 연결되지 않았습니다." });
      return;
    }
    socket.emit("live_mission_create", payload, (res: { ok: boolean; error?: string; mission?: LiveSupportMissionPayload }) => {
      resolve(res ?? { ok: false, error: "응답 없음" });
    });
  });
}

export function resolveLiveMission(
  socket: Socket | null,
  missionId: string,
  status: "ACCEPTED" | "COMPLETED" | "FAILED" | "CANCELLED"
): Promise<{ ok: boolean; error?: string; mission?: LiveSupportMissionPayload }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: "실시간 서버에 연결되지 않았습니다." });
      return;
    }
    socket.emit("live_mission_resolve", { missionId, status }, (res: { ok: boolean; error?: string; mission?: LiveSupportMissionPayload }) => {
      resolve(res ?? { ok: false, error: "응답 없음" });
    });
  });
}

export function createLivePoll(
  socket: Socket | null,
  payload: {
    channelId: string;
    question: string;
    options: string[];
    voteCost?: number;
    durationMinutes?: number;
  }
): Promise<{ ok: boolean; error?: string; poll?: LiveSupportPollPayload }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: "실시간 서버에 연결되지 않았습니다." });
      return;
    }
    socket.emit("live_poll_create", payload, (res: { ok: boolean; error?: string; poll?: LiveSupportPollPayload }) => {
      resolve(res ?? { ok: false, error: "응답 없음" });
    });
  });
}

export function voteLivePoll(
  socket: Socket | null,
  payload: { pollId: string; optionId: string; amount?: number }
): Promise<{ ok: boolean; error?: string; poll?: LiveSupportPollPayload; event?: LiveSupportEventPayload }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: "실시간 서버에 연결되지 않았습니다." });
      return;
    }
    socket.emit("live_poll_vote", payload, (res: { ok: boolean; error?: string; poll?: LiveSupportPollPayload; event?: LiveSupportEventPayload }) => {
      resolve(res ?? { ok: false, error: "응답 없음" });
    });
  });
}

export function subscribeLiveSupport(
  socket: Socket | null,
  handlers: {
    onEvent?: (event: LiveSupportEventPayload) => void;
    onMission?: (mission: LiveSupportMissionPayload) => void;
    onPoll?: (poll: LiveSupportPollPayload) => void;
  }
) {
  if (!socket) return () => {};
  const onEvent = (evt: LiveSupportEventPayload) => handlers.onEvent?.(evt);
  const onMission = (m: LiveSupportMissionPayload) => handlers.onMission?.(m);
  const onPoll = (p: LiveSupportPollPayload) => handlers.onPoll?.(p);
  socket.on("live_support_event", onEvent);
  socket.on("live_mission_updated", onMission);
  socket.on("live_poll_updated", onPoll);
  return () => {
    socket.off("live_support_event", onEvent);
    socket.off("live_mission_updated", onMission);
    socket.off("live_poll_updated", onPoll);
  };
}

export function isSoundPresetId(v: unknown): v is SoundPresetId {
  return v === "clap" || v === "boom" || v === "boo" || v === "meow" || v === "fanfare";
}
