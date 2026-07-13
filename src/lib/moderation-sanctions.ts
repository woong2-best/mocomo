export type ModerationSanctionType =
  | "warning"
  | "limited"
  | "read_only"
  | "temp_7"
  | "temp_30"
  | "permanent"
  | "restore";

export const MODERATION_SANCTION_LABELS: Record<ModerationSanctionType, string> = {
  warning: "경고",
  limited: "일부 제한",
  read_only: "읽기 전용",
  temp_7: "7일 정지",
  temp_30: "30일 정지",
  permanent: "영구 정지",
  restore: "복구",
};
