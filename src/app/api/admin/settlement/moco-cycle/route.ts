import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { returnSettlementCycleToAvailable } from "@/lib/settlement-moco/cycle-payout";

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

  const { action, cycleId } = parsed.data;

  if (action === "return") {
    if (!cycleId) {
      return NextResponse.json({ error: "cycleId required" }, { status: 400 });
    }
    await returnSettlementCycleToAvailable(cycleId, "Admin return");
    return NextResponse.json({ ok: true, action, cycleId });
  }

  return NextResponse.json(
    {
      error: "Monthly settlement cycles are retired. Request a Reward tier payout from the wallet.",
      code: "MONTHLY_SETTLEMENT_RETIRED",
    },
    { status: 410 },
  );
}
