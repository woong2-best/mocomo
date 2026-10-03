import { formatUsd } from "@/lib/money";
import type { LiveChatMessage } from "@/api/live";
import { translate } from "@/i18n/runtime";

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
    const title = params.missionTitle?.trim() || translate("m.live.mission");
    const reward =
      params.missionReward != null ? ` · ${params.missionReward.toLocaleString()} CP` : "";
    switch (params.missionStatus) {
      case "PENDING":
        return translate("m.lib.name_posted_a_mission_reward_title", { name: String(name), reward: String(reward), title: String(title) });
      case "ACCEPTED":
        return translate("m.lib.host_accepted_the_mission_title", { title: String(title) });
      case "COMPLETED":
        return translate("m.lib.mission_complete_title_reward", { title: String(title), reward: String(reward) });
      case "FAILED":
        return translate("m.lib.mission_failed_title", { title: String(title) });
      case "CANCELLED":
        return translate("m.lib.mission_canceled_title", { title: String(title) });
      default:
        return translate("m.lib.mission_title", { title: String(title) });
    }
  }

  if (params.kind === "tip") {
    const amt = formatUsd(params.amount ?? 0);
    const msg = params.message?.trim();
    return msg ? translate("m.lib.name_tipped_amt_msg", { name: String(name), amt: String(amt), msg: String(msg) }) : translate("m.lib.name_tipped_amt", { name: String(name), amt: String(amt) });
  }

  const cp = `${(params.amount ?? 0).toLocaleString()} CP`;
  const msg = params.message?.trim();

  switch (params.eventType) {
    case "ROULETTE":
      return translate("m.lib.name_spun_the_roulette_v", { name: String(name), v: String(params.rouletteLabel ?? "???") });
    case "TTS":
      return msg ? translate("m.lib.name_tts_cp_msg", { name: String(name), cp: String(cp), msg: String(msg) }) : translate("m.lib.name_tts_cp", { name: String(name), cp: String(cp) });
    case "SOUND":
      return translate("m.lib.name_sound_tip_cp", { name: String(name), cp: String(cp) });
    case "VOTE":
      return msg ? translate("m.lib.name_poll_vote_cp_msg", { name: String(name), cp: String(cp), msg: String(msg) }) : translate("m.lib.name_poll_vote_cp", { name: String(name), cp: String(cp) });
    default:
      return msg ? translate("m.lib.name_cp_msg", { name: String(name), cp: String(cp), msg: String(msg) }) : translate("m.lib.name_cheered_with_cp", { name: String(name), cp: String(cp) });
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
    const msg = alert.message?.trim() ?? "";
    return {
      id: `tip-${alert.id}`,
      userId: "system",
      username: alert.username,
      content: msg || formatSupportChatContent({
        kind: "tip",
        username: alert.username,
        amount: alert.amount,
        message: alert.message,
      }),
      at: new Date(alert.at).getTime(),
      image: null,
      messageKind: "tip",
      supportAmount: alert.amount,
      tipMessage: msg || undefined,
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
