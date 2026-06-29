import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { captureEconomyPayload } from "./backup-capture-service";
import { computePayloadChecksum } from "./backup-checksum";
import type {
  EconomySnapshotPayload,
  SnapshotListItem,
  SnapshotStats,
  SnapshotType,
} from "./backup-types";

function formatSnapshotLabel(type: SnapshotType, custom?: string): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10);
  if (custom?.trim()) return custom.trim();
  return `SNAP_${date}_${type}`;
}

export async function createEconomySnapshot(input: {
  type: SnapshotType;
  label?: string;
  createdById?: string | null;
}): Promise<{ id: string; label: string; checksum: string; stats: SnapshotStats }> {
  const { payload, stats } = await captureEconomyPayload();
  const checksum = computePayloadChecksum(payload);
  const label = formatSnapshotLabel(input.type, input.label);

  const row = await db.aptEconomySnapshot.create({
    data: {
      label,
      type: input.type,
      stats: stats as unknown as Prisma.InputJsonValue,
      payload: payload as unknown as Prisma.InputJsonValue,
      checksum,
      createdById: input.createdById ?? null,
    },
  });

  return { id: row.id, label: row.label, checksum, stats };
}

/** Publish/Restore 직전 자동 백업 — 실패해도 본 작업은 계속 */
export async function autoSnapshotBeforeAction(
  context: string,
  adminId?: string | null
): Promise<string | null> {
  try {
    const snap = await createEconomySnapshot({
      type: "before_publish",
      label: `before_${context}_${Date.now().toString(36)}`,
      createdById: adminId ?? null,
    });
    return snap.id;
  } catch (e) {
    console.error("[economy-backup] auto snapshot failed:", context, e);
    return null;
  }
}

export async function listEconomySnapshots(
  filter?: SnapshotType,
  limit = 50
): Promise<SnapshotListItem[]> {
  const rows = await db.aptEconomySnapshot.findMany({
    where: filter ? { type: filter } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { createdBy: { select: { name: true, username: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    type: r.type as SnapshotType,
    stats: r.stats as unknown as SnapshotStats,
    checksum: r.checksum,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdBy?.name ?? r.createdBy?.username ?? null,
  }));
}

export async function getEconomySnapshot(id: string): Promise<{
  id: string;
  label: string;
  type: SnapshotType;
  stats: SnapshotStats;
  payload: EconomySnapshotPayload;
  checksum: string;
  createdAt: string;
  createdByName: string | null;
} | null> {
  const row = await db.aptEconomySnapshot.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, username: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    type: row.type as SnapshotType,
    stats: row.stats as unknown as SnapshotStats,
    payload: row.payload as unknown as EconomySnapshotPayload,
    checksum: row.checksum,
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdBy?.name ?? row.createdBy?.username ?? null,
  };
}
