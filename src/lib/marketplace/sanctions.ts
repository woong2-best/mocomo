import type { MarketplaceSanctionLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { MARKETPLACE_SANCTION_LABELS } from "@/lib/marketplace/protection-config";
import { createNotification } from "@/lib/notifications";

const ESCALATION: MarketplaceSanctionLevel[] = [
  "NONE",
  "WARNING",
  "LISTING_RESTRICTED",
  "SALES_SUSPENDED",
  "SETTLEMENT_HELD",
  "PERMANENT_BAN",
];

export function nextSanctionLevel(
  current: MarketplaceSanctionLevel
): MarketplaceSanctionLevel {
  const idx = ESCALATION.indexOf(current);
  if (idx < 0 || idx >= ESCALATION.length - 1) return "PERMANENT_BAN";
  return ESCALATION[idx + 1]!;
}

function applyLevelSideEffects(level: MarketplaceSanctionLevel): {
  canList: boolean;
  settlementBlocked: boolean;
  status?: "SUSPENDED" | "REJECTED" | "APPROVED";
} {
  switch (level) {
    case "WARNING":
      return { canList: true, settlementBlocked: false };
    case "LISTING_RESTRICTED":
      return { canList: false, settlementBlocked: false };
    case "SALES_SUSPENDED":
      return { canList: false, settlementBlocked: false, status: "SUSPENDED" };
    case "SETTLEMENT_HELD":
      return { canList: false, settlementBlocked: true, status: "SUSPENDED" };
    case "PERMANENT_BAN":
      return { canList: false, settlementBlocked: true, status: "REJECTED" };
    default:
      return { canList: true, settlementBlocked: false, status: "APPROVED" };
  }
}

export async function applyMarketplaceSanction(input: {
  sellerProfileId: string;
  level?: MarketplaceSanctionLevel;
  escalate?: boolean;
  reason: string;
  actorId?: string | null;
}) {
  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { id: input.sellerProfileId },
  });
  if (!profile) return { error: "판매자 프로필이 없습니다." };

  const level =
    input.level ??
    (input.escalate ? nextSanctionLevel(profile.sanctionLevel) : profile.sanctionLevel);

  const side = applyLevelSideEffects(level);

  await db.marketplaceSanction.create({
    data: {
      sellerProfileId: profile.id,
      level,
      reason: input.reason.slice(0, 4000),
      actorId: input.actorId ?? null,
      active: true,
    },
  });

  await db.marketplaceSellerProfile.update({
    where: { id: profile.id },
    data: {
      sanctionLevel: level,
      canList: side.canList,
      settlementBlocked: side.settlementBlocked,
      ...(side.status ? { status: side.status } : {}),
    },
  });

  if (level === "SALES_SUSPENDED" || level === "PERMANENT_BAN" || level === "SETTLEMENT_HELD") {
    await db.marketplaceListing.updateMany({
      where: { sellerId: profile.userId, status: "ACTIVE" },
      data: { status: "PAUSED" },
    });
  }

  await logMarketplaceAudit({
    actorId: input.actorId,
    action: MarketplaceAuditActions.SANCTION,
    detail: `${MARKETPLACE_SANCTION_LABELS[level] ?? level}: ${input.reason}`,
    metadata: { sellerProfileId: profile.id, level },
  });

  await createNotification({
    userId: profile.userId,
    type: "SYSTEM",
    title: "판매자 제재 안내",
    body: `${MARKETPLACE_SANCTION_LABELS[level] ?? level} — ${input.reason.slice(0, 100)}`,
    link: "/market/seller",
  });

  return { success: true as const, level };
}

export async function clearMarketplaceSanction(
  sellerProfileId: string,
  actorId?: string | null
) {
  await db.marketplaceSanction.updateMany({
    where: { sellerProfileId, active: true },
    data: { active: false },
  });
  await db.marketplaceSellerProfile.update({
    where: { id: sellerProfileId },
    data: {
      sanctionLevel: "NONE",
      canList: true,
      settlementBlocked: false,
      status: "APPROVED",
    },
  });
  await logMarketplaceAudit({
    actorId,
    action: MarketplaceAuditActions.SANCTION,
    detail: "cleared",
    metadata: { sellerProfileId },
  });
  return { success: true as const };
}
