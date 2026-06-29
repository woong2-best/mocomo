/** 경제 Audit — CS·Fraud·Replay·IAP·Backup 공용 Source of Truth */

export type AuditCategory =
  | "Wallet"
  | "Inventory"
  | "Storage"
  | "Market"
  | "Shop"
  | "Mission"
  | "Live"
  | "Flea"
  | "IAP"
  | "Fraud"
  | "Admin"
  | "Notification";

export const AUDIT_CATEGORIES: AuditCategory[] = [
  "Wallet",
  "Inventory",
  "Storage",
  "Market",
  "Shop",
  "Mission",
  "Live",
  "Flea",
  "IAP",
  "Fraud",
  "Admin",
  "Notification",
];

export type AuditAction =
  | "ADD"
  | "REMOVE"
  | "BUY"
  | "SELL"
  | "REFUND"
  | "FREEZE"
  | "WARN"
  | "RESTORE"
  | "TRANSFER"
  | "CANCEL"
  | "LIST"
  | "SYNC"
  | "CONFIG";

export type AuditSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type AuditActor = {
  kind: "system" | "user" | "admin" | "google" | "apple";
  id?: string;
  label: string;
};

export type EconomyAuditEvent = {
  id: string;
  occurredAt: string;
  category: AuditCategory;
  action: AuditAction;
  actor: AuditActor;
  target: { userId: string; label?: string };
  delta?: {
    gold?: number;
    gems?: number;
    itemId?: string;
    itemQty?: number;
  };
  before?: {
    gold?: number;
    gems?: number;
    field?: string;
    value?: string | number;
  };
  after?: {
    gold?: number;
    gems?: number;
    field?: string;
    value?: string | number;
  };
  /** Human-readable (never raw enum) */
  reason: string;
  reasonCode?: string;
  referenceType?: string;
  referenceId?: string;
  correlationId?: string;
  /** Source table / stream */
  source: string;
  severity: AuditSeverity;
  tags: string[];
  metadata?: Record<string, unknown>;
};

export type AuditTimelineOptions = {
  days?: number;
  limit?: number;
  categories?: AuditCategory[];
  correlationId?: string;
};

/** CS 화면 한 줄 표시 */
export type AuditLine = {
  id: string;
  time: string;
  timeShort: string;
  category: AuditCategory;
  action: AuditAction;
  headline: string;
  reason: string;
  reference?: string;
  balanceLine?: string;
  actorLabel: string;
  severity: AuditSeverity;
  tags: string[];
  correlationId?: string;
};
