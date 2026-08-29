import type { ActivityDefinition } from "./types";
import { listActivities } from "./registry";

/** DM에서는 3인 이상 전용 게임(라이어 등) 숨김 */
export function listActivitiesForPicker(isDm: boolean): ActivityDefinition[] {
  return listActivities().filter((a) => !(isDm && a.minPlayers >= 3));
}

export function canPickActivity(
  activity: ActivityDefinition,
  isDm: boolean
): boolean {
  if (!activity.playable) return false;
  if (isDm && activity.minPlayers >= 3) return false;
  return true;
}

/** DM에서 채팅 안에 바로 임베드되는 2인 보드게임 */
export function isDmDirectEmbedGame(
  activity: ActivityDefinition,
  isDm: boolean
): boolean {
  return (
    isDm &&
    activity.minPlayers === 2 &&
    activity.maxPlayers === 2 &&
    !!activity.minigameId
  );
}

/** 로비(방 코드) 경유 — 커뮤니티 또는 3인+ / 스케치퀴즈 등 */
export function usesLobbyFlow(
  activity: ActivityDefinition,
  isDm: boolean
): boolean {
  if (activity.id === "liar-game") return true;
  if (!isDm) return true;
  if (activity.id === "sketch-quiz") return true;
  return false;
}

export function communityLobbyPassword(contextId: string): string {
  return `cm${contextId.replace(/[^a-zA-Z0-9]/g, "")}xx`.slice(0, 16);
}

export function dmLobbyPassword(roomId: string): string {
  return `dm${roomId.replace(/[^a-zA-Z0-9]/g, "")}xx`.slice(0, 16);
}
