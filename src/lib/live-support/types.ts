import type { LiveSupportEventType, LiveSupportMissionStatus } from "@prisma/client";

export const CHEER_PRESETS = [100, 500, 1_000, 3_000, 5_000, 10_000] as const;

export const SUPPORT_MIN_AMOUNT: Record<LiveSupportEventType, number> = {
  GENERAL: 100,
  TTS: 500,
  ROULETTE: 300,
  SOUND: 200,
  VOTE: 100,
};

export const DEFAULT_ROULETTE_ITEMS = [
  "Sing a song",
  "Drink water",
  "Dance",
  "Do a penalty",
  "Say thanks",
  "One random game",
] as const;

export type SoundPresetId = "clap" | "boom" | "boo" | "meow" | "fanfare";

export const SOUND_PRESETS: { id: SoundPresetId; label: string; emoji: string }[] = [
  { id: "clap", label: "Applause", emoji: "👏" },
  { id: "boom", label: "Explosion", emoji: "💥" },
  { id: "boo", label: "Boo", emoji: "😤" },
  { id: "meow", label: "Cat", emoji: "🐱" },
  { id: "fanfare", label: "Fanfare", emoji: "🎺" },
];

export type LiveSupportEventPayload = {
  id: string;
  channelId: string;
  type: LiveSupportEventType;
  amount: number;
  message: string | null;
  metadata: Record<string, unknown> | null;
  username: string;
  senderId: string;
  at: number;
};

export type LiveSupportMissionPayload = {
  id: string;
  channelId: string;
  title: string;
  rewardAmount: number;
  status: LiveSupportMissionStatus;
  username: string;
  senderId: string;
  deadline: number | null;
  at: number;
};

export type PollOption = { id: string; label: string; votes: number };

export type LiveSupportPollPayload = {
  id: string;
  channelId: string;
  question: string;
  options: PollOption[];
  voteCost: number;
  status: string;
  endsAt: number | null;
};
