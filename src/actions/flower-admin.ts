"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { payFlowerRedeem, rejectFlowerRedeem } from "@/lib/flower/service";
import { logFlowerAudit } from "@/lib/flower/ledger";

export async function getAdminFlowerDashboard() {
  await requireAdmin({ action: "ECONOMY_MUTATION", targetType: "flower" });

  const [redeems, recentLedger, recentAudit, heldSum] = await Promise.all([
    db.flowerRedeemRequest.findMany({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { username: true } },
        asset: { include: { flowerType: true } },
      },
    }),
    db.flowerLedgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { user: { select: { username: true } } },
    }),
    db.flowerAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    db.flowerAsset.aggregate({
      where: { status: "HELD" },
      _sum: { faceValueKrw: true },
      _count: true,
    }),
  ]);

  return { redeems, recentLedger, recentAudit, heldSum };
}

export async function adminApproveFlowerRedeem(redeemId: string) {
  const admin = await requireAdmin({
    action: "PAYOUT_PROCESS",
    targetType: "flower_redeem",
    targetId: redeemId,
  });
  const res = await payFlowerRedeem(redeemId, { actorId: admin.id, force: true });
  revalidatePath("/admin/flowers");
  return res;
}

export async function adminRejectFlowerRedeem(redeemId: string, note: string) {
  const admin = await requireAdmin({
    action: "PAYOUT_PROCESS",
    targetType: "flower_redeem",
    targetId: redeemId,
  });
  const res = await rejectFlowerRedeem(redeemId, admin.id, note || "관리자 거절");
  revalidatePath("/admin/flowers");
  return res;
}

export async function adminRevokeFlowerAsset(assetId: string, reason: string) {
  const admin = await requireAdmin({
    action: "ECONOMY_MUTATION",
    targetType: "flower_asset",
    targetId: assetId,
  });
  const asset = await db.flowerAsset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "자산을 찾을 수 없습니다." };
  if (asset.status === "REDEEMED") return { error: "이미 환전된 자산입니다." };

  await db.flowerAsset.update({
    where: { id: assetId },
    data: { status: "REVOKED" },
  });
  await logFlowerAudit({
    actorId: admin.id,
    action: "ADMIN_REVOKE",
    targetType: "flower_asset",
    targetId: assetId,
    detail: reason,
  });
  revalidatePath("/admin/flowers");
  return { success: true };
}

export async function adminLookupFlowerUser(username: string) {
  await requireAdmin({ action: "VIEW_USER_PII", targetType: "flower_wallet" });
  const user = await db.user.findUnique({
    where: { username: username.replace(/^@/, "") },
    select: { id: true, username: true },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  const [assets, ledger, redeems] = await Promise.all([
    db.flowerAsset.findMany({
      where: { ownerId: user.id },
      include: { flowerType: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.flowerLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.flowerRedeemRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { user, assets, ledger, redeems };
}
