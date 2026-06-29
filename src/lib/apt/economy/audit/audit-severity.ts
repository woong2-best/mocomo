import type { AuditAction, AuditCategory, AuditSeverity } from "./audit-types";

export function severityFor(
  category: AuditCategory,
  action: AuditAction,
  metadata?: Record<string, unknown>
): AuditSeverity {
  if (action === "FREEZE") return "CRITICAL";
  if (action === "WARN") return "WARN";
  if (action === "REFUND" && metadata?.negative) return "WARN";
  if (category === "Fraud") return "WARN";
  if (category === "Admin" && action === "REFUND") return "WARN";
  if (category === "IAP" && action === "REFUND") return "WARN";
  return "INFO";
}
