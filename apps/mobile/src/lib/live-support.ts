import { formatUsd } from "@/lib/money";
import type { LiveChatMessage } from "@/api/live";

export const CHEER_PRESETS = [100, 500, 1_000, 3_000, 5_000, 10_000] as const;

export const SUPPORT_MIN_AMOUNT = {
  GENERAL: 100,
  TTS: 500,
  ROULETTE: 300,
  SOUND: 200,
  VOTE: 100,
} as const;

export type SupportEventType = keyof typeof SUPPORT_MIN_AMOUNT;

export type LiveSupportMission = {
  id: string;
  channelId: string;
  title: string;
  rewardAmount: number;
  status: string;
  username: string;
  senderId: string;
  deadline: number | null;
  at: number;
};

export type PollOption = { id: string; label: string; votes: number };

export type LiveSupportPoll = {
  id: string;
  channelId: string;
  question: string;
  options: PollOption[];
  voteCost: number;
  status: string;
  endsAt: number | null;
};

export type SupportChatKind = "support" | "tip" | "mission";

export type LiveChatLine = LiveChatMessage;

export function formatSupportChatContent(params: {
  kind: SupportChatKind;
  username: string;
  amount?: number;
  message?: string | null;
  eventType?: string;
  rouletteLabel?: string;
  missionTitle?: string;
  missionStatus?: string;
  missionReward?: number;
}): string {
  const name = params.username.startsWith("@") ? params.username : `@${params.username}`;

  if (params.kind === "mission") {
    const title = params.missionTitle?.trim() || "미션";
    const reward =
      params.missionReward != null ? ` · ${params.missionReward.toLocaleString()} CP` : "";
    switch (params.missionStatus) {
      case "PENDING":
        return `${name}님이 미션 등록${reward}: ${title}`;
      case "ACCEPTED":
        return `✅ 호스트가 미션 수락: ${title}`;
      case "COMPLETED":
        return `🎉 미션 완료! ${title}${reward}`;
      case "FAILED":
        return `미션 실패: ${title}`;
      case "CANCELLED":
        return `미션 취소: ${title}`;
      default:
        return `미션 · ${title}`;
    }
  }

  if (params.kind === "tip") {
    const amt = formatUsd(params.amount ?? 0);
    const msg = params.message?.trim();
    return msg ? `${name}님이 ${amt} 후원 · ${msg}` : `${name}님이 ${amt} 후원! 💰`;
  }

  const cp = `${(params.amount ?? 0).toLocaleString()} CP`;
  const msg = params.message?.trim();

  switch (params.eventType) {
    case "ROULETTE":
      return `${name}님 룰렛 🎰 → ${params.rouletteLabel ?? "???"}`;
    case "TTS":
      return msg ? `${name}님 TTS (${cp}) · ${msg}` : `${name}님 TTS ${cp} 🔊`;
    case "SOUND":
      return `${name}님 사운드 후원 ${cp} 🔊`;
    case "VOTE":
      return msg ? `${name}님 투표 (${cp}) · ${msg}` : `${name}님 투표 ${cp} 📊`;
    default:
      return msg ? `${name}님 ${cp} · ${msg}` : `${name}님 ${cp} 응원! 💛`;
  }
}

export function alertToChatLine(alert: {
  id: string;
  kind: "tip" | "cheer";
  username: string;
  amount: number;
  message: string | null;
  at: string;
  eventType?: string;
  rouletteLabel?: string;
}): LiveChatLine {
  if (alert.kind === "tip") {
  return {
    id: `tip-${alert.id}`,
    userId: "system",
    username: alert.username,
    content: formatSupportChatContent({
      kind: "tip",
      username: alert.username,
      amount: alert.amount,
      message: alert.message,
    }),
    at: new Date(alert.at).getTime(),
    image: null,
    messageKind: "tip",
  };
  }
  return {
    id: `support-${alert.id}`,
    userId: "system",
    username: alert.username,
    content: formatSupportChatContent({
      kind: "support",
      username: alert.username,
      amount: alert.amount,
      message: alert.message,
      eventType: alert.eventType,
      rouletteLabel: alert.rouletteLabel,
    }),
    at: new Date(alert.at).getTime(),
    image: null,
    messageKind: "support",
    eventType: alert.eventType,
  };
}

export function missionToChatLine(m: LiveSupportMission): LiveChatLine {
  return {
    id: `mission-${m.id}-${m.status}`,
    userId: "system",
    username: m.username,
    content: formatSupportChatContent({
      kind: "mission",
      username: m.username,
      missionTitle: m.title,
      missionStatus: m.status,
      missionReward: m.rewardAmount,
    }),
    at: m.at,
    image: null,
    messageKind: "mission",
  };
}
