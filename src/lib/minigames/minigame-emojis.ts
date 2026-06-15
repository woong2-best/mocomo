/** 미니게임 방 채팅 이모티콘 */

export const MINIGAME_EMOJIS = ["👍", "👏", "🔥", "😂", "😭", "💪", "🎉", "🅿️", "🚗", "🏆", "❤️", "😎"] as const;

export const PARKING_RUSH_EMOJIS = ["🅿️", "🚗", "🏁", "✨", "💥", "👑", "🔥", "👍", "😱", "🎉"] as const;

export function emojisForGame(gameId: string): readonly string[] {
  if (gameId === "parking-rush") return PARKING_RUSH_EMOJIS;
  return MINIGAME_EMOJIS;
}
