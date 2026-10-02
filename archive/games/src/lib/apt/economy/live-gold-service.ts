import { db } from "@/lib/db";
import { ensureEconomyMigrated } from "./service";
import { creditWallet } from "./wallet-service";
import { getEconomyConfig, resolveEconomyConfigForUser } from "./config-service";
import { assertLiveRewardEnabled } from "./economy-emergency";
import { assertFraudAllowed } from "./fraud/fraud-restrictions";

async function sumLiveGoldToday(userId: string, type: "live" | "event"): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const rows = await db.aptWalletTransaction.findMany({
    where: {
      userId,
      type,
      currency: "gold",
      amount: { gt: 0 },
      createdAt: { gte: start },
    },
    select: { amount: true },
  });
  return rows.reduce((s, r) => s + r.amount, 0);
}

/** 라이브 CP 응원 → 골드 (결제 없음) */
export async function grantLiveCheerGold(
  userId: string,
  cheerAmount: number,
  referenceId: string
): Promise<{ granted: number } | { skipped: true }> {
  if (cheerAmount <= 0) return { skipped: true };

  try {
    await assertLiveRewardEnabled();
    await assertFraudAllowed(userId, "live");
  } catch {
    return { skipped: true };
  }

  await ensureEconomyMigrated(userId);
  const config = await resolveEconomyConfigForUser(userId);
  const gold = cheerAmount * config.liveGoldPerCheer;
  if (gold <= 0) return { skipped: true };

  const today = await sumLiveGoldToday(userId, "live");
  const room = Math.max(0, config.dailyLiveGoldLimit - today);
  const grant = Math.min(gold, room);
  if (grant <= 0) return { skipped: true };

  const dup = await db.aptWalletTransaction.findFirst({
    where: { referenceId, referenceType: "LiveSupportEvent", userId },
  });
  if (dup) return { skipped: true };

  await creditWallet({
    userId,
    currency: "gold",
    amount: grant,
    type: "live",
    referenceId,
    referenceType: "LiveSupportEvent",
    memo: `라이브 응원 보상 +${grant}G`,
  });

  const { notifyLiveReward } = await import("./notification/economy-notify");
  notifyLiveReward({
    userId,
    gold: grant,
    reason: "응원 보상",
  });

  return { granted: grant };
}

/** APT TV 시청 → 골드 */
export async function grantLiveWatchGold(
  userId: string,
  minutes: number,
  channelId: string
): Promise<{ granted: number } | { error: string } | { skipped: true }> {
  if (minutes < 1) return { skipped: true };

  try {
    await assertLiveRewardEnabled();
    await assertFraudAllowed(userId, "live");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "시청 보상을 받을 수 없습니다." };
  }

  await ensureEconomyMigrated(userId);
  const config = await resolveEconomyConfigForUser(userId);
  const gold = minutes * config.liveWatchGoldPerMin;
  if (gold <= 0) return { skipped: true };

  const today = await sumLiveGoldToday(userId, "event");
  const room = Math.max(0, config.dailyWatchGoldLimit - today);
  const grant = Math.min(gold, room);
  if (grant <= 0) {
    const { notifyLiveDailyLimit } = await import("./notification/economy-notify");
    notifyLiveDailyLimit(userId);
    return { error: "오늘 시청 골드 한도에 도달했습니다." };
  }

  const refId = `watch-${channelId}-${new Date().toISOString().slice(0, 10)}`;
  const dup = await db.aptWalletTransaction.findFirst({
    where: { userId, referenceId: refId, referenceType: "LiveWatch" },
  });
  if (dup) return { skipped: true };

  await creditWallet({
    userId,
    currency: "gold",
    amount: grant,
    type: "event",
    referenceId: refId,
    referenceType: "LiveWatch",
    memo: `라이브 시청 ${minutes}분 +${grant}G`,
  });

  const { notifyLiveReward } = await import("./notification/economy-notify");
  notifyLiveReward({ userId, gold: grant, reason: `시청 ${minutes}분` });

  return { granted: grant };
}
