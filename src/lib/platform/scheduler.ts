import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { emitPlatformEvent } from "@/lib/platform/event-bus";

export type JobHandler = (payload: unknown) => Promise<{ detail?: string } | void>;

const JOB_HANDLERS: Record<string, JobHandler> = {};

export function registerScheduledJob(jobType: string, handler: JobHandler) {
  JOB_HANDLERS[jobType] = handler;
}

export async function ensureDefaultScheduledJobs() {
  const defaults = [
    {
      name: "promotions.expiry_notify",
      jobType: "promotions.expiry",
      cronExpr: "0 15 * * *",
    },
    {
      name: "promotions.scheduled_assign",
      jobType: "promotions.assign",
      cronExpr: "0 15 * * *",
    },
    {
      name: "settlements.stats_refresh",
      jobType: "settlements.stats",
      cronExpr: "0 16 * * *",
    },
  ];
  for (const d of defaults) {
    await db.scheduledJob.upsert({
      where: { name: d.name },
      create: { ...d, enabled: true },
      update: {},
    });
  }
}

export async function runScheduledJobByType(jobType: string, payload?: unknown) {
  const handler = JOB_HANDLERS[jobType];
  if (!handler) return { ok: false as const, error: `no handler: ${jobType}` };

  const jobs = await db.scheduledJob.findMany({
    where: { jobType, enabled: true },
  });

  const results = [];
  for (const job of jobs.length ? jobs : [{ id: null as string | null, name: jobType, payload: null }]) {
    const run =
      job.id != null
        ? await db.scheduledJobRun.create({
            data: { jobId: job.id, status: "RUNNING" },
          })
        : null;
    try {
      const merged =
        payload ??
        (job.payload && typeof job.payload === "object" ? job.payload : undefined);
      const res = await handler(merged);
      if (run) {
        await db.scheduledJobRun.update({
          where: { id: run.id },
          data: {
            status: "OK",
            detail: res?.detail,
            finishedAt: new Date(),
          },
        });
      }
      if (job.id) {
        await db.scheduledJob.update({
          where: { id: job.id },
          data: { lastRunAt: new Date(), lastStatus: "OK", lastError: null },
        });
      }
      results.push({ name: job.name, ok: true, detail: res?.detail });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      if (run) {
        await db.scheduledJobRun.update({
          where: { id: run.id },
          data: { status: "FAILED", detail: msg, finishedAt: new Date() },
        });
      }
      if (job.id) {
        await db.scheduledJob.update({
          where: { id: job.id },
          data: { lastRunAt: new Date(), lastStatus: "FAILED", lastError: msg },
        });
      }
      await emitPlatformEvent("CronFailed", { jobType, jobName: job.name, error: msg });
      results.push({ name: job.name, ok: false, error: msg });
    }
  }
  return { ok: true as const, results };
}

/** Cron 엔드포인트용 — 등록된 프로모션/정산 잡 일괄 실행 */
export async function runPlatformSchedulerTick() {
  await ensureDefaultScheduledJobs();

  if (!JOB_HANDLERS["promotions.expiry"]) {
    registerScheduledJob("promotions.expiry", async () => {
      const { notifyPromotionExpiries } = await import("@/lib/admin/services/promotions");
      const r = await notifyPromotionExpiries();
      return { detail: `notified=${r.notified}` };
    });
  }
  if (!JOB_HANDLERS["promotions.assign"]) {
    registerScheduledJob("promotions.assign", async () => {
      const { runScheduledPromotionAssignments } = await import(
        "@/lib/admin/services/promotions"
      );
      const r = await runScheduledPromotionAssignments();
      return { detail: `assigned=${r.assigned}` };
    });
  }
  if (!JOB_HANDLERS["settlements.stats"]) {
    registerScheduledJob("settlements.stats", async () => {
      return { detail: "noop" };
    });
  }

  const [expiry, assign, stats] = await Promise.all([
    runScheduledJobByType("promotions.expiry"),
    runScheduledJobByType("promotions.assign"),
    runScheduledJobByType("settlements.stats"),
  ]);

  return { expiry, assign, stats };
}

export type { Prisma };
