/** APT 통합 월드 아바타 동작 — 복도·엘리베이터·현관 */
export type WorldAvatarAction =
  | "stand"
  | "walk"
  | "knock"
  | "bell"
  | "door_open"
  | "elevator_idle"
  | "elevator_ride"
  | "wave";

export type WorldAvatarMode = "chibi" | "vrm";
