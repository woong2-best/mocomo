import { db } from "@/lib/db";
import {
  FLOWER_BUY_VELOCITY_PER_HOUR,
  FLOWER_GIFT_VELOCITY_PER_HOUR,
  FLOWER_NEW_ACCOUNT_DAYS,
  FLOWER_NEW_ACCOUNT_HIGH_VALUE_KRW,
  FLOWER_RISK_HOLD_THRESHOLD,
} from "@/lib/flower/config";

export type FlowerRisk = { score: number; flags: string[]; hold: boolean };

export async function assessFlowerPurchaseRisk(userId: string, amountKrw: number): Promise<FlowerRisk> {
  const flags: string[] = [];
  let score = 0;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const buys = await db.flowerPurchase.count({
    where: { buyerId: userId, createdAt: { gte: hourAgo } },
  });
  if (buys >= FLOWER_BUY_VELOCITY_PER_HOUR) {
    flags.push("BUY_VELOCITY");
    score += 40;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (user) {
    const ageDays = (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays < FLOWER_NEW_ACCOUNT_DAYS && amountKrw >= FLOWER_NEW_ACCOUNT_HIGH_VALUE_KRW) {
      flags.push("NEW_ACCOUNT_HIGH_VALUE");
      score += 35;
    }
  }

  score = Math.min(100, score);
  return { score, flags, hold: score >= FLOWER_RISK_HOLD_THRESHOLD };
}

export async function assessFlowerGiftRisk(fromUserId: string, amountKrw: number): Promise<FlowerRisk> {
  const flags: string[] = [];
  let score = 0;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const gifts = await db.flowerTransfer.count({
    where: { fromUserId, createdAt: { gte: hourAgo } },
  });
  if (gifts >= FLOWER_GIFT_VELOCITY_PER_HOUR) {
    flags.push("GIFT_VELOCITY");
    score += 40;
  }
  if (amountKrw >= 100_000) {
    flags.push("HIGH_VALUE_GIFT");
    score += 15;
  }
  score = Math.min(100, score);
  return { score, flags, hold: score >= FLOWER_RISK_HOLD_THRESHOLD };
}

export async function assessFlowerRedeemRisk(userId: string, amountKrw: number): Promise<FlowerRisk> {
  const flags: string[] = [];
  let score = 0;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.flowerRedeemRequest.count({
    where: { userId, createdAt: { gte: dayAgo }, status: { in: ["PENDING", "APPROVED", "PAID"] } },
  });
  if (recent >= 5) {
    flags.push("REDEEM_BURST");
    score += 35;
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, stripeConnectOnboardedAt: true },
  });
  if (user) {
    const ageDays = (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays < 7 && amountKrw >= 30_000) {
      flags.push("NEW_REDEEM");
      score += 30;
    }
    if (!user.stripeConnectOnboardedAt && amountKrw >= 50_000) {
      flags.push("NO_CONNECT_HIGH");
      score += 15;
    }
  }
  score = Math.min(100, score);
  return { score, flags, hold: score >= FLOWER_RISK_HOLD_THRESHOLD };
}
