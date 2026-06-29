/** Canary 대상 유형 */
export type CanaryTargetType =
  | "CONFIG"
  | "SHOP"
  | "FLEA"
  | "FRAUD_RULE"
  | "FEATURE_FLAG"
  | "IAP_PRICE";

export type CanaryStage =
  | "DRAFT"
  | "OPERATOR"
  | "TESTER"
  | "PERCENT"
  | "FULL"
  | "ROLLBACK";

export const CANARY_TARGET_LABELS: Record<CanaryTargetType, string> = {
  CONFIG: "Economy Config",
  SHOP: "Gold Shop",
  FLEA: "Flea Event",
  FRAUD_RULE: "Fraud Rule",
  FEATURE_FLAG: "Feature Flag",
  IAP_PRICE: "IAP Price",
};

export const CANARY_STAGE_LABELS: Record<CanaryStage, string> = {
  DRAFT: "Draft",
  OPERATOR: "Operator",
  TESTER: "Tester",
  PERCENT: "Percent",
  FULL: "Full",
  ROLLBACK: "Rollback",
};

export type CanaryPromoteStep = {
  stage: CanaryStage;
  percent: number;
  label: string;
};

/** Operator → Tester → 1% → … → 100% */
export const CANARY_PROMOTE_LADDER: CanaryPromoteStep[] = [
  { stage: "OPERATOR", percent: 0, label: "Operator Only" },
  { stage: "TESTER", percent: 0, label: "Internal Tester" },
  { stage: "PERCENT", percent: 1, label: "1%" },
  { stage: "PERCENT", percent: 5, label: "5%" },
  { stage: "PERCENT", percent: 10, label: "10%" },
  { stage: "PERCENT", percent: 25, label: "25%" },
  { stage: "PERCENT", percent: 50, label: "50%" },
  { stage: "FULL", percent: 100, label: "100%" },
];

export type CanaryRow = {
  id: string;
  targetType: CanaryTargetType;
  targetId: string;
  stage: CanaryStage;
  percent: number;
  operatorUserIds: string[];
  testerUserIds: string[];
  draftPayload: unknown;
  reason: string | null;
  publishedVersion: number | null;
  rollbackSnapshotId: string | null;
  correlationId: string | null;
  autoRollback: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type CanaryHealthSummary = {
  operatorUsers: number;
  testerUsers: number;
  percentUsers: number;
  totalCanaryUsers: number;
  errors: number;
  rollbackActive: boolean;
  autoRollback: boolean;
};

export type CanaryLogDto = {
  id: string;
  canaryId: string;
  action: string;
  fromStage: string | null;
  toStage: string | null;
  fromPercent: number | null;
  toPercent: number | null;
  correlationId: string;
  reason: string | null;
  adminName: string | null;
  createdAt: string;
};

export type CanaryPreview = {
  userId: string;
  inCanary: boolean;
  targetType: CanaryTargetType;
  published: Record<string, unknown>;
  canary: Record<string, unknown>;
};

export type PromotePreview = {
  current: { stage: CanaryStage; percent: number; label: string };
  next: CanaryPromoteStep | { action: "publish"; label: string };
  expectedUsers: number;
};
