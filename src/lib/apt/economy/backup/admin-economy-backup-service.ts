import { db } from "@/lib/db";
import { diffSnapshotAgainstLive } from "./backup-diff-service";
import {
  dryRunRestore,
  executePartialRestore,
  parseSnapshotPayload,
} from "./backup-restore-service";
import {
  createEconomySnapshot,
  getEconomySnapshot,
  listEconomySnapshots,
} from "./snapshot-service";
import type {
  RestoreLogDto,
  RestorePlan,
  RestoreScope,
  SnapshotDiff,
  SnapshotListItem,
  SnapshotType,
} from "./backup-types";

export async function getBackupAdminPageData(filter?: SnapshotType): Promise<{
  snapshots: SnapshotListItem[];
  restoreLogs: RestoreLogDto[];
}> {
  const [snapshots, restoreLogs] = await Promise.all([
    listEconomySnapshots(filter, 60),
    listRestoreLogs(30),
  ]);
  return { snapshots, restoreLogs };
}

export async function createManualSnapshot(
  adminId: string,
  label?: string
): Promise<{ id: string; label: string }> {
  const snap = await createEconomySnapshot({
    type: "manual",
    label: label?.trim() || undefined,
    createdById: adminId,
  });
  return { id: snap.id, label: snap.label };
}

export async function createScheduledSnapshot(): Promise<{ id: string; label: string }> {
  const snap = await createEconomySnapshot({
    type: "scheduled",
    label: `SNAP_daily_${new Date().toISOString().slice(0, 10)}`,
  });
  return { id: snap.id, label: snap.label };
}

export async function getSnapshotDiff(snapshotId: string): Promise<
  | { ok: true; diff: SnapshotDiff; snapshotLabel: string }
  | { error: string }
> {
  const snap = await getEconomySnapshot(snapshotId);
  if (!snap) return { error: "스냅샷을 찾을 수 없습니다." };
  const diff = await diffSnapshotAgainstLive(snap.stats, snap.payload, snap.checksum);
  return { ok: true, diff, snapshotLabel: snap.label };
}

export async function runDryRunRestore(
  snapshotId: string,
  scopes: RestoreScope[],
  reason: string,
  adminId: string
): Promise<
  | { ok: true; plan: RestorePlan; correlationId: string }
  | { error: string }
> {
  const snap = await getEconomySnapshot(snapshotId);
  if (!snap) return { error: "스냅샷을 찾을 수 없습니다." };

  const dry = await dryRunRestore(snap.payload, snap.checksum, scopes);
  if ("error" in dry) return dry;

  const result = await executePartialRestore({
    snapshotId,
    payload: snap.payload,
    checksum: snap.checksum,
    scopes,
    adminId,
    reason: reason || "dry run",
    dryRun: true,
  });
  if ("error" in result) return result;
  return { ok: true, plan: result.plan, correlationId: result.correlationId };
}

export async function runPartialRestore(
  snapshotId: string,
  scopes: RestoreScope[],
  reason: string,
  adminId: string
): Promise<
  | { ok: true; plan: RestorePlan; correlationId: string }
  | { error: string }
> {
  const snap = await getEconomySnapshot(snapshotId);
  if (!snap) return { error: "스냅샷을 찾을 수 없습니다." };

  const result = await executePartialRestore({
    snapshotId,
    payload: snap.payload,
    checksum: snap.checksum,
    scopes,
    adminId,
    reason,
    dryRun: false,
  });
  if ("error" in result) return result;
  return { ok: true, plan: result.plan, correlationId: result.correlationId };
}

async function listRestoreLogs(limit: number): Promise<RestoreLogDto[]> {
  const rows = await db.aptEconomyRestoreLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      admin: { select: { name: true, username: true } },
      snapshot: { select: { label: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    snapshotId: r.snapshotId,
    snapshotLabel: r.snapshot.label,
    correlationId: r.correlationId,
    scopes: r.scopes as unknown as RestoreScope[],
    dryRun: r.dryRun,
    reason: r.reason,
    stats: r.stats as Record<string, unknown>,
    adminName: r.admin.name ?? r.admin.username,
    createdAt: r.createdAt.toISOString(),
  }));
}

export { parseSnapshotPayload };
