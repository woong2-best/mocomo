export type ModerationSanctionType =
  | "warning"
  | "limited"
  | "read_only"
  | "temp_7"
  | "temp_30"
  | "permanent"
  | "restore";

export const MODERATION_SANCTION_LABELS: Record<ModerationSanctionType, string> = {
  warning: "Warning",
  limited: "Partial restrictions",
  read_only: "Read-only",
  temp_7: "7-day suspension",
  temp_30: "30-day suspension",
  permanent: "Permanent suspension",
  restore: "Restored",
};
