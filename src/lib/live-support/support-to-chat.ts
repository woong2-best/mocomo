import type { LiveSupportEventType, LiveSupportMissionStatus } from "@prisma/client";
import type { LiveChatMessage } from "@/components/live/live-chat";
import type { UnifiedChatMessage } from "@/lib/live-external/platform-chat/merge-messages";
import { formatUsd } from "@/lib/money";

export type SupportChatKind = "support" | "tip" | "mission";

export type SupportChatFields = {
  messageKind: SupportChatKind;
  supportAmount?: number;
  eventType?: LiveSupportEventType | string;
  rouletteLabel?: string;
};

function displayName(username: string): string {
  const u = username.startsWith("@") ? username.slice(1) : username;
  return `@${u}`;
}

/** Human-readable line for chat / OBS overlay. */
export function formatSupportChatContent(params: {
  kind: SupportChatKind;
  username: string;
  amount?: number;
  message?: string | null;
  eventType?: LiveSupportEventType | string;
  rouletteLabel?: string;
  missionTitle?: string;
  missionStatus?: LiveSupportMissionStatus | string;
  missionReward?: number;
}): string {
  const name = displayName(params.username);

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

export function cheerEventToChatMessage(evt: {
  id: string;
  username: string;
  amount: number;
  message: string | null;
  type: LiveSupportEventType | string;
  metadata?: Record<string, unknown> | null;
  at: number;
}): LiveChatMessage {
  const rouletteLabel =
    typeof evt.metadata?.rouletteLabel === "string" ? evt.metadata.rouletteLabel : undefined;
  return {
    id: `support-${evt.id}`,
    userId: "system",
    username: evt.username,
    content: formatSupportChatContent({
      kind: "support",
      username: evt.username,
      amount: evt.amount,
      message: evt.message,
      eventType: evt.type,
      rouletteLabel,
    }),
    at: evt.at,
    messageKind: "support",
    supportAmount: evt.amount,
    eventType: evt.type as LiveSupportEventType,
    rouletteLabel,
  };
}

export function tipToChatMessage(tip: {
  id: string;
  username: string;
  amount: number;
  message: string | null;
  at: number;
  image?: string | null;
}): LiveChatMessage {
  const msg = tip.message?.trim() ?? "";
  return {
    id: `tip-${tip.id}`,
    userId: "system",
    username: tip.username,
    content: msg || formatSupportChatContent({
      kind: "tip",
      username: tip.username,
      amount: tip.amount,
      message: tip.message,
    }),
    at: tip.at,
    messageKind: "tip",
    supportAmount: tip.amount,
    tipMessage: msg || undefined,
    image: tip.image,
  };
}

export function missionToChatMessage(m: {
  id: string;
  username: string;
  title: string;
  rewardAmount: number;
  status: LiveSupportMissionStatus | string;
  at: number;
}): LiveChatMessage {
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
    messageKind: "mission",
    supportAmount: m.rewardAmount,
  };
}

export function supportLineToUnified(
  line: LiveChatMessage,
  source: UnifiedChatMessage["source"] = "MOCOMO"
): UnifiedChatMessage {
  const messageKind = (line.messageKind ?? "support") as SupportChatKind;
  return {
    id: line.id,
    username: line.username,
    content: line.content,
    at: line.at,
    source,
    messageKind,
    supportAmount: line.supportAmount,
    eventType: line.eventType,
    rouletteLabel: line.rouletteLabel,
  };
}

export function cheerRowToUnified(row: {
  id: string;
  type: string;
  amount: number;
  message: string | null;
  metadata: unknown;
  createdAt: Date;
  sender: { username: string };
}): UnifiedChatMessage {
  const rouletteLabel =
    typeof (row.metadata as { rouletteLabel?: string } | null)?.rouletteLabel === "string"
      ? (row.metadata as { rouletteLabel: string }).rouletteLabel
      : undefined;
  const msg = cheerEventToChatMessage({
    id: row.id,
    username: row.sender.username,
    amount: row.amount,
    message: row.message,
    type: row.type,
    metadata: row.metadata as Record<string, unknown> | null,
    at: row.createdAt.getTime(),
  });
  return supportLineToUnified(msg);
}

export function tipRowToUnified(row: {
  id: string;
  amount: number;
  message: string | null;
  createdAt: Date;
  sender: { username: string };
}): UnifiedChatMessage {
  const msg = tipToChatMessage({
    id: row.id,
    username: row.sender.username,
    amount: row.amount,
    message: row.message,
    at: row.createdAt.getTime(),
  });
  return supportLineToUnified(msg);
}
