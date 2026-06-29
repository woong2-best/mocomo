import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CanaryStage } from "./canary-types";

export function newCanaryCorrelationId(): string {
  return `corr_canary_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function writeCanaryLog(input: {
  canaryId: string;
  adminId?: string | null;
  action: string;
  correlationId: string;
  fromStage?: CanaryStage | null;
  toStage?: CanaryStage | null;
  fromPercent?: number | null;
  toPercent?: number | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.aptEconomyCanaryLog.create({
    data: {
      canaryId: input.canaryId,
      adminId: input.adminId ?? null,
      action: input.action,
      correlationId: input.correlationId,
      fromStage: input.fromStage ?? null,
      toStage: input.toStage ?? null,
      fromPercent: input.fromPercent ?? null,
      toPercent: input.toPercent ?? null,
      reason: input.reason ?? null,
      metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
    },
  });
}
