import { db } from "@/lib/db";
import type { IapRetryStep } from "./iap-types";

export async function enqueueIapRetry(
  purchaseId: string,
  step: IapRetryStep,
  lastError: string,
  delayMs = 60_000
): Promise<void> {
  const nextRunAt = new Date(Date.now() + delayMs);
  const existing = await db.aptIapRetryJob.findFirst({
    where: { purchaseId, step, status: "PENDING" },
  });
  if (existing) {
    await db.aptIapRetryJob.update({
      where: { id: existing.id },
      data: {
        attempts: { increment: 1 },
        lastError,
        nextRunAt,
      },
    });
    return;
  }
  await db.aptIapRetryJob.create({
    data: {
      purchaseId,
      step,
      lastError,
      nextRunAt,
    },
  });
}

export async function processIapRetryQueue(limit = 20): Promise<number> {
  const now = new Date();
  const jobs = await db.aptIapRetryJob.findMany({
    where: { status: "PENDING", nextRunAt: { lte: now } },
    orderBy: { nextRunAt: "asc" },
    take: limit,
    include: { purchase: true },
  });

  let processed = 0;
  for (const job of jobs) {
    if (job.attempts >= job.maxAttempts) {
      await db.aptIapRetryJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });
      continue;
    }

    const { retryIapStep } = await import("./iap-fulfillment-pipeline");
    const ok = await retryIapStep(job.purchaseId, job.step as IapRetryStep);
    if (ok) {
      await db.aptIapRetryJob.update({
        where: { id: job.id },
        data: { status: "DONE", attempts: { increment: 1 } },
      });
      processed++;
    } else {
      await db.aptIapRetryJob.update({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          nextRunAt: new Date(Date.now() + 120_000 * (job.attempts + 1)),
        },
      });
    }
  }
  return processed;
}
