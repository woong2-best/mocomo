import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { lockAllCreatorSettlementCycles, lockCreatorSettlementCycle } from "@/lib/settlement-moco/cycle-lock";
import { previousMonthEarnedPeriod } from "@/lib/settlement-moco/cycle-period";
import { returnSettlementCycleToAvailable } from "@/lib/settlement-moco/cycle-payout";
import { processLockedSettlementCycles } from "@/lib/settlement-moco/cycle-run";
import { processMonthlySettlementCron } from "@/lib/settlement-moco/payout";

const bodySchema = z.object({
  action: z.enum(["lock", "payout", "run", "return"]),
  force: z.boolean().optional(),
  userId: z.string().min(1).max(64).optional(),
  cycleId: z.string().min(1).max(64).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "admin-moco-settlement", 20);
  if (limited) return limited;

  try {
    await requireAdmin({
      action: "moco_settlement_cycle",
      targetType: "settlement",
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { action, force, userId, cycleId } = parsed.data;
  const period = previousMonthEarnedPeriod();

  if (action === "return") {
    if (!cycleId) {
      return NextResponse.json({ error: "cycleId required" }, { status: 400 });
    }
    await returnSettlementCycleToAvailable(cycleId, "관리자 반환");
    return NextResponse.json({ ok: true, action, cycleId });
  }

  if (action === "lock") {
    if (userId) {
      const one = await lockCreatorSettlementCycle(userId, period);
      return NextResponse.json({ ok: true, action, period, result: one });
    }
    const summary = await lockAllCreatorSettlementCycles(new Date(), period);
    return NextResponse.json({ ok: true, action, summary });
  }

  if (action === "payout") {
    const payout = await processLockedSettlementCycles();
    return NextResponse.json({ ok: true, action, payout });
  }

  const result = await processMonthlySettlementCron(new Date(), {
    forceLock: force ?? true,
    payoutOnly: false,
  });
  return NextResponse.json({ ok: true, action: "run", result });
}
