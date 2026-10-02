import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type TxClient = Prisma.TransactionClient;

export type EconomyLogInput = {
  userId: string;
  action: string;
  deltaGold?: number;
  deltaGems?: number;
  goldBefore?: number;
  goldAfter?: number;
  gemsBefore?: number;
  gemsAfter?: number;
  reason?: string;
  referenceId?: string;
  referenceType?: string;
  correlationId?: string;
  ip?: string;
  device?: string;
};

export async function writeEconomyLog(
  tx: TxClient,
  input: EconomyLogInput
): Promise<void> {
  await tx.aptEconomyLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      deltaGold: input.deltaGold ?? 0,
      deltaGems: input.deltaGems ?? 0,
      goldBefore: input.goldBefore,
      goldAfter: input.goldAfter,
      gemsBefore: input.gemsBefore,
      gemsAfter: input.gemsAfter,
      reason: input.reason,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      correlationId: input.correlationId,
      ip: input.ip,
      device: input.device,
    },
  });
}

export async function readWalletBalances(
  tx: TxClient,
  userId: string
): Promise<{ gold: number; gems: number }> {
  const w = await tx.aptWallet.findUnique({ where: { userId } });
  return { gold: w?.gold ?? 0, gems: w?.gems ?? 0 };
}
