import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Append-only marketplace audit log — never update/delete from app code */
export async function logMarketplaceAudit(input: {
  orderId?: string | null;
  actorId?: string | null;
  action: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await db.marketplaceAuditLog.create({
      data: {
        orderId: input.orderId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        detail: input.detail?.slice(0, 4000) || null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[marketplace-audit] write failed", e);
  }
}

export const MarketplaceAuditActions = {
  PAYMENT: "PAYMENT",
  ORDER_STATUS: "ORDER_STATUS",
  SHIPMENT_STATUS: "SHIPMENT_STATUS",
  CONFIRM: "CONFIRM",
  AUTO_CONFIRM: "AUTO_CONFIRM",
  SETTLEMENT: "SETTLEMENT",
  SETTLEMENT_BLOCKED: "SETTLEMENT_BLOCKED",
  REFUND: "REFUND",
  DISPUTE_OPEN: "DISPUTE_OPEN",
  DISPUTE_EVIDENCE: "DISPUTE_EVIDENCE",
  DISPUTE_RESOLVE: "DISPUTE_RESOLVE",
  AUTO_DISPUTE: "AUTO_DISPUTE",
  RESERVE_SYNC: "RESERVE_SYNC",
  REPORT: "REPORT",
  SANCTION: "SANCTION",
  RISK_FLAG: "RISK_FLAG",
  ADMIN_ACTION: "ADMIN_ACTION",
} as const;
