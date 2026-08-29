import { getActivityById } from "@/lib/activities/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import type { GameShareMode } from "@/lib/chat-game-share";

export type GameShareCardMeta = {
  activityId: string;
  title: string;
  description: string;
  icon: string;
  bannerFrom: string;
  bannerTo: string;
  domain: string;
  href: string;
  roomCode: string;
  mode: GameShareMode;
  minPlayers: number;
  maxPlayers: number;
};

const BANNER: Record<string, { from: string; to: string }> = {
  alkkagi: { from: "#fef3c7", to: "#fde68a" },
  chess: { from: "#e0e7ff", to: "#c7d2fe" },
  janggi: { from: "#fce7f3", to: "#fbcfe8" },
  omok: { from: "#f3f4f6", to: "#d1d5db" },
  baduk: { from: "#ecfdf5", to: "#a7f3d0" },
  "sketch-quiz": { from: "#fff7ed", to: "#fed7aa" },
  reversi: { from: "#fef9c3", to: "#fde047" },
  "liar-game": { from: "#fae8ff", to: "#e9d5ff" },
};

function gameShareHref(activityId: string, roomCode: string, mode: GameShareMode): string {
  if (activityId === "liar-game") {
    return `/liar-game?code=${encodeURIComponent(roomCode)}`;
  }
  if (activityId === "sketch-quiz") {
    return `/sketch-quiz/${encodeURIComponent(roomCode)}?create=1`;
  }
  const def = getActivityById(activityId);
  if (def?.minigameId) {
    return mode === "direct"
      ? `/play/${def.minigameId}/${encodeURIComponent(roomCode)}`
      : `/play/${def.minigameId}/${encodeURIComponent(roomCode)}`;
  }
  return def?.href ?? getMinigameRoute(activityId);
}

export function getGameShareCardMeta(input: {
  activityId: string;
  roomCode: string;
  mode: GameShareMode;
}): GameShareCardMeta | null {
  const def = getActivityById(input.activityId);
  if (!def) return null;

  const colors = BANNER[input.activityId] ?? { from: "#eff6ff", to: "#bfdbfe" };
  const roomCode = input.roomCode.trim().toUpperCase();

  return {
    activityId: def.id,
    title: def.title,
    description: def.description,
    icon: def.icon,
    bannerFrom: colors.from,
    bannerTo: colors.to,
    domain: "mocomo.net",
    href: gameShareHref(def.id, roomCode, input.mode),
    roomCode,
    mode: input.mode,
    minPlayers: def.minPlayers,
    maxPlayers: def.maxPlayers,
  };
}
