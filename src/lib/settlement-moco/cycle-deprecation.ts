import { MocoSettlementCycleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { creditSettlementMocoInTx } from "@/lib/settlement-moco/economy";

/**
 * Release in-flight monthly locks when on-demand mode is active.
 * Historical PAID/FAILED/RETURNED rows are untouched.
 */
export async function deprecateOpenSettlementCyclesForOnDemand(): Promise<{ released: number }> {
  const cycles = await db.creatorMocoSettlementCycle.findMany({
    where: { status: MocoSettlementCycleStatus.PROCESSING },
    select: { id: true, userId: true, lockedMoco: true, deductedMoco: true },
  });

  let released = 0;
  for (const cycle of cycles) {
    const returnMoco = cycle.lockedMoco - cycle.deductedMoco;
    await db.$transaction(async (tx) => {
      const current = await tx.creatorMocoSettlementCycle.findUnique({
        where: { id: cycle.id },
      });
      if (!current || current.status !== MocoSettlementCycleStatus.PROCESSING) return;

      if (returnMoco > 0) {
        await creditSettlementMocoInTx(tx, {
          userId: cycle.userId,
          amount: returnMoco,
          reason: "월간 Lock 해제 (온디맨드 정산 전환)",
          referenceType: "moco_settlement_cycle_deprecated",
          referenceId: cycle.id,
        });
      }

      await tx.creatorMocoSettlementCycle.update({
        where: { id: cycle.id },
        data: {
          status: MocoSettlementCycleStatus.DEPRECATED_ON_DEMAND_ACTIVE,
          returnedAt: new Date(),
          errorMessage: "On-demand payout enabled — monthly lock deprecated",
        },
      });
    });
    released++;
  }

  return { released };
}
