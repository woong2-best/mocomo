import type { AuditCategory, AuditAction, EconomyAuditEvent } from "./audit-types";

export function deriveTags(input: {
  category: AuditCategory;
  action: AuditAction;
  delta?: EconomyAuditEvent["delta"];
  referenceType?: string;
  reasonCode?: string;
  metadata?: Record<string, unknown>;
}): string[] {
  const tags = new Set<string>();
  tags.add(input.category.toLowerCase());

  if (input.delta?.gold) tags.add("gold");
  if (input.delta?.gems) tags.add("gems");
  if (input.delta?.itemId) tags.add("inventory");

  const code = (input.reasonCode ?? "").toLowerCase();
  if (code.includes("market") || input.category === "Market") tags.add("market");
  if (code.includes("shop") || input.category === "Shop") tags.add("shop");
  if (code.includes("live") || input.category === "Live") tags.add("live");
  if (code.includes("mission") || input.category === "Mission") tags.add("mission");
  if (code.includes("iap") || input.category === "IAP") tags.add("iap");
  if (code.includes("refund") || input.action === "REFUND") tags.add("refund");
  if (code.includes("fraud") || input.category === "Fraud") tags.add("fraud");
  if (input.action === "FREEZE") tags.add("freeze");
  if (input.category === "Notification") tags.add("notification");

  if (input.referenceType === "AptIapPurchase") tags.add("iap");
  if (input.referenceType === "LiveSupportEvent") tags.add("live");

  return [...tags];
}
