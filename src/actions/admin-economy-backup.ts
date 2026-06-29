"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createManualSnapshot,
  getBackupAdminPageData,
  getSnapshotDiff,
  runDryRunRestore,
  runPartialRestore,
} from "@/lib/apt/economy/backup/admin-economy-backup-service";
import type { RestoreScope, SnapshotType } from "@/lib/apt/economy/backup/backup-types";

const BACKUP_PATH = "/admin/economy/backup";

function revalidate() {
  revalidatePath(BACKUP_PATH);
  revalidatePath("/admin/economy");
  revalidatePath("/admin/economy/logs");
}

export async function getEconomyBackupAdminPageData(filter?: SnapshotType) {
  await requireAdmin();
  return getBackupAdminPageData(filter);
}

export async function adminCreateEconomySnapshot(label?: string) {
  const admin = await requireAdmin();
  const snap = await createManualSnapshot(admin.id, label);
  revalidate();
  return snap;
}

export async function adminGetSnapshotDiff(snapshotId: string) {
  await requireAdmin();
  return getSnapshotDiff(snapshotId);
}

export async function adminDryRunRestore(
  snapshotId: string,
  scopes: RestoreScope[],
  reason?: string
) {
  const admin = await requireAdmin();
  const result = await runDryRunRestore(
    snapshotId,
    scopes,
    reason?.trim() || "dry run preview",
    admin.id
  );
  revalidate();
  return result;
}

export async function adminPartialRestore(
  snapshotId: string,
  scopes: RestoreScope[],
  reason: string
) {
  const admin = await requireAdmin();
  const result = await runPartialRestore(snapshotId, scopes, reason, admin.id);
  revalidate();
  return result;
}
