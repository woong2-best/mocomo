/** 업적 정의 */

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export const MINIGAME_ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_win", name: "첫 승리", description: "미니게임 첫 승리", icon: "🏆" },
  { id: "wins_10", name: "10승", description: "누적 10승", icon: "🔟" },
  { id: "wins_100", name: "100승", description: "누적 100승", icon: "💯" },
  { id: "streak_5", name: "5연승", description: "5연승 달성", icon: "🔥" },
  { id: "streak_10", name: "10연승", description: "10연승 달성", icon: "⚡" },
  { id: "master_tier", name: "마스터", description: "MMR 2000+ 티어 달성", icon: "👑" },
  { id: "all_rounds", name: "다양성", description: "5종 이상 게임 플레이", icon: "🎮" },
  { id: "parking_first", name: "첫 주차", description: "주차 러쉬 첫 주차 성공", icon: "🅿️" },
  { id: "parking_clean", name: "무접촉 주차", description: "충돌 0회 주차 성공", icon: "✨" },
  { id: "parking_reverse", name: "후진 마스터", description: "후진 주차 성공", icon: "↩️" },
  { id: "parking_grandmaster", name: "주차 그랜드마스터", description: "그랜드마스터 티어 달성", icon: "👑" },
  { id: "parking_duel_win", name: "주차왕", description: "대전에서 최초 주차 승리", icon: "🏁" },
];

export function getAchievement(id: string): AchievementDef | undefined {
  return MINIGAME_ACHIEVEMENTS.find((a) => a.id === id);
}
