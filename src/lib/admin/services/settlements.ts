import type { Prisma, SettlementStatus, SettlementItemType } from "@prisma/client";
import { db } from "@/lib/db";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import type { AdminActor } from "@/lib/admin/access";
import { previewUserSettlementBenefits } from "@/lib/admin/services/promotions";
import { createNotification } from "@/lib/notifications";

async function appendHistory(
  settlementId: string,
  actorId: string | null,
  action: string,
  fromStatus: SettlementStatus | null,
  toStatus: SettlementStatus | null,
  detail?: string,
  metadata?: Record<string, unknown>
) {
  await db.settlementHistory.create({
    data: {
      settlementId,
      actorId,
      action,
      fromStatus: fromStatus ?? undefined,
      toStatus: toStatus ?? undefined,
      detail,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export type SettlementLineInput = {
  type: SettlementItemType;
  label: string;
  amountKrw: number;
  referenceType?: string;
  referenceId?: string;
};

export async function createSettlementDraft(input: {
  userId: string;
  title?: string;
  grossAmountKrw: number;
  lines?: SettlementLineInput[];
  periodStart?: Date;
  periodEnd?: Date;
  actorId?: string;
}) {
  const preview = await previewUserSettlementBenefits(input.userId, input.grossAmountKrw);
  const lines: SettlementLineInput[] = [
    ...(input.lines ?? [
      {
        type: "OTHER" as const,
        label: "총 수익",
        amountKrw: input.grossAmountKrw,
      },
    ]),
    {
      type: "PLATFORM_FEE",
      label: "플랫폼 수수료",
      amountKrw: -preview.feeBeforeKrw,
    },
  ];
  if (preview.discountAmountKrw > 0) {
    lines.push({
      type: preview.appliedPromotion ? "PROMOTION_DISCOUNT" : "COUPON_DISCOUNT",
      label: preview.appliedPromotion
        ? `Promotion · ${preview.appliedPromotion.name}`
        : "Coupon 할인",
      amountKrw: preview.discountAmountKrw,
    });
  }

  const settlement = await db.settlement.create({
    data: {
      userId: input.userId,
      status: "PENDING",
      title: input.title ?? "정산 초안",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      grossAmountKrw: preview.grossAmountKrw,
      feeAmountKrw: preview.feeAfterKrw,
      discountAmountKrw: preview.discountAmountKrw,
      netAmountKrw: preview.sellerAmountKrw,
      items: {
        create: lines.map((l) => ({
          type: l.type,
          label: l.label,
          amountKrw: l.amountKrw,
          referenceType: l.referenceType,
          referenceId: l.referenceId,
        })),
      },
    },
  });

  await appendHistory(
    settlement.id,
    input.actorId ?? null,
    "CREATE",
    null,
    "PENDING",
    "draft created"
  );

  return { settlement, preview };
}

export async function listSettlements(query: {
  status?: SettlementStatus;
  userId?: string;
  page?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = 20;
  const where: Prisma.SettlementWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;

  const [total, items] = await Promise.all([
    db.settlement.count({ where }),
    db.settlement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { username: true, id: true } },
        _count: { select: { items: true, history: true } },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getSettlementDetail(id: string) {
  return db.settlement.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true } },
      decidedBy: { select: { username: true } },
      items: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
}

const TRANSITIONS: Partial<Record<SettlementStatus, SettlementStatus[]>> = {
  PENDING: ["REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  REVIEW: ["APPROVED", "REJECTED", "PENDING"],
  APPROVED: ["PROCESSING", "REJECTED", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED"],
  FAILED: ["PROCESSING", "CANCELLED"],
  REJECTED: ["PENDING"],
  CANCELLED: [],
  PAID: [],
};

export async function transitionSettlement(
  actor: AdminActor,
  settlementId: string,
  toStatus: SettlementStatus,
  note?: string
) {
  const s = await db.settlement.findUnique({ where: { id: settlementId } });
  if (!s) return { error: "정산을 찾을 수 없습니다." };
  const allowed = TRANSITIONS[s.status] ?? [];
  if (!allowed.includes(toStatus)) {
    return { error: `${s.status} → ${toStatus} 전이가 허용되지 않습니다.` };
  }

  const updated = await db.settlement.update({
    where: { id: settlementId },
    data: {
      status: toStatus,
      note: note ?? s.note,
      decidedById: ["APPROVED", "REJECTED", "PAID"].includes(toStatus) ? actor.id : s.decidedById,
      decidedAt: ["APPROVED", "REJECTED"].includes(toStatus) ? new Date() : s.decidedAt,
      paidAt: toStatus === "PAID" ? new Date() : s.paidAt,
    },
  });

  await appendHistory(settlementId, actor.id, "STATUS_CHANGE", s.status, toStatus, note);
  await logSiteAdminAudit({
    actorId: actor.id,
    action: `SETTLEMENT_${toStatus}`,
    targetType: "settlement",
    targetId: settlementId,
    metadata: { from: s.status, to: toStatus, note },
  });

  const titles: Partial<Record<SettlementStatus, string>> = {
    APPROVED: "정산이 승인되었습니다",
    REJECTED: "정산이 거절되었습니다",
    PAID: "정산 지급이 완료되었습니다",
    FAILED: "정산 지급에 실패했습니다",
    PROCESSING: "정산이 처리 중입니다",
  };
  if (titles[toStatus]) {
    await createNotification({
      userId: s.userId,
      type: "SETTLEMENT",
      title: titles[toStatus]!,
      body: note || `정산 #${settlementId.slice(0, 8)} · ₩${s.netAmountKrw.toLocaleString()}`,
      link: "/wallet",
      actorId: actor.id,
    });
  }

  return { success: true as const, settlement: updated };
}
