import type {
  CouponAudience,
  CouponBenefitType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  computeFeeWithCoupon,
  deriveCouponListStatus,
  formatCouponBenefit,
  generateCouponCode,
  type FeeCouponSnapshot,
} from "@/lib/coupon/engine";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import type { AdminActor } from "@/lib/admin/access";

export type CouponListQuery = {
  q?: string;
  status?: "all" | "ACTIVE" | "INACTIVE" | "EXPIRED" | "EXHAUSTED";
  sort?: "newest" | "oldest" | "expires" | "usage";
  page?: number;
  pageSize?: number;
};

async function appendHistory(
  couponId: string,
  actorId: string | null,
  action: string,
  detail?: string,
  metadata?: Record<string, unknown>
) {
  await db.couponHistory.create({
    data: {
      couponId,
      actorId,
      action,
      detail,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listCoupons(query: CouponListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, query.pageSize ?? 20));
  const where: Prisma.CouponWhereInput = {};
  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { createdBy: { username: { contains: q, mode: "insensitive" } } },
    ];
  }

  const now = new Date();
  if (query.status === "INACTIVE") where.active = false;
  if (query.status === "EXPIRED") {
    where.endsAt = { lte: now };
  }
  if (query.status === "ACTIVE") {
    where.active = true;
    where.OR = [{ endsAt: null }, { endsAt: { gt: now } }];
  }

  const orderBy: Prisma.CouponOrderByWithRelationInput =
    query.sort === "oldest"
      ? { createdAt: "asc" }
      : query.sort === "expires"
        ? { endsAt: "asc" }
        : query.sort === "usage"
          ? { usedCount: "desc" }
          : { createdAt: "desc" };

  const fetchSize =
    query.status === "EXHAUSTED" || query.status === "ACTIVE" ? pageSize * 5 : pageSize;

  const [totalRaw, rows] = await Promise.all([
    db.coupon.count({ where }),
    db.coupon.findMany({
      where,
      orderBy,
      skip: query.status === "EXHAUSTED" || query.status === "ACTIVE" ? 0 : (page - 1) * pageSize,
      take: fetchSize,
      include: {
        createdBy: { select: { username: true, id: true } },
        _count: { select: { assignments: true, usages: true } },
      },
    }),
  ]);

  let items = rows.map((c) => {
    const status = deriveCouponListStatus(c);
    const remaining =
      c.benefitType === "FEE_WAIVER"
        ? Math.max(0, (c.waiveUpToKrw ?? 0) * Math.max(c.assignedCount, 1) - c.usedBenefitKrw)
        : null;
    return {
      ...c,
      listStatus: status,
      benefitLabel: formatCouponBenefit(c),
      remainingBenefitKrw: remaining,
    };
  });

  if (query.status && query.status !== "all") {
    items = items.filter((c) => c.listStatus === query.status);
  }

  const total =
    query.status === "ACTIVE" || query.status === "EXHAUSTED"
      ? items.length
      : totalRaw;
  const start = (page - 1) * pageSize;
  const pageItems =
    query.status === "ACTIVE" || query.status === "EXHAUSTED"
      ? items.slice(start, start + pageSize)
      : items.slice(0, pageSize);

  return {
    items: pageItems,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type CreateCouponInput = {
  name: string;
  code?: string;
  autoCodeLength?: 8 | 10 | 12;
  benefitType: CouponBenefitType;
  waiveUpToKrw?: number;
  percentOff?: number;
  fixedDiscountKrw?: number;
  audience: CouponAudience;
  targetTier?: string;
  maxUsesPerUser?: number | null;
  maxTotalUses?: number | null;
  startsAt: string;
  endsAt?: string | null;
  active?: boolean;
  adminMemo?: string;
};

export async function createCoupon(actor: AdminActor, input: CreateCouponInput) {
  const name = input.name.trim();
  if (name.length < 2) return { error: "쿠폰명을 입력해 주세요." };

  let code = (input.code?.trim() || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) {
    for (let i = 0; i < 8; i++) {
      code = generateCouponCode(input.autoCodeLength ?? 8);
      const exists = await db.coupon.findUnique({ where: { code } });
      if (!exists) break;
    }
  }
  if (code.length < 4) return { error: "쿠폰 코드가 너무 짧습니다." };
  const dup = await db.coupon.findUnique({ where: { code } });
  if (dup) return { error: "이미 존재하는 쿠폰 코드입니다." };

  if (input.benefitType === "FEE_WAIVER" && !(input.waiveUpToKrw && input.waiveUpToKrw > 0)) {
    return { error: "수수료 면제 한도(원)를 입력해 주세요." };
  }
  if (
    input.benefitType === "FEE_PERCENT_OFF" &&
    !(input.percentOff && input.percentOff > 0 && input.percentOff <= 100)
  ) {
    return { error: "할인율은 1–100%여야 합니다." };
  }
  if (input.benefitType === "FIXED_AMOUNT" && !(input.fixedDiscountKrw && input.fixedDiscountKrw > 0)) {
    return { error: "고정 할인 금액을 입력해 주세요." };
  }

  const coupon = await db.coupon.create({
    data: {
      name,
      code,
      benefitType: input.benefitType,
      waiveUpToKrw: input.benefitType === "FEE_WAIVER" ? input.waiveUpToKrw : null,
      percentOff: input.benefitType === "FEE_PERCENT_OFF" ? input.percentOff : null,
      fixedDiscountKrw: input.benefitType === "FIXED_AMOUNT" ? input.fixedDiscountKrw : null,
      audience: input.audience,
      targetTier: input.targetTier?.trim() || null,
      maxUsesPerUser: input.maxUsesPerUser === null ? null : input.maxUsesPerUser ?? 1,
      maxTotalUses: input.maxTotalUses ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      active: input.active ?? true,
      adminMemo: input.adminMemo?.trim() || null,
      createdById: actor.id,
    },
  });

  await appendHistory(coupon.id, actor.id, "CREATE", `created ${coupon.code}`);
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "COUPON_CREATE",
    targetType: "coupon",
    targetId: coupon.id,
    metadata: { code: coupon.code, name: coupon.name },
  });

  return { success: true as const, coupon };
}

export async function updateCoupon(
  actor: AdminActor,
  couponId: string,
  patch: Partial<{
    name: string;
    active: boolean;
    endsAt: string | null;
    adminMemo: string | null;
    maxUsesPerUser: number | null;
    maxTotalUses: number | null;
  }>
) {
  const existing = await db.coupon.findUnique({ where: { id: couponId } });
  if (!existing) return { error: "쿠폰을 찾을 수 없습니다." };

  const coupon = await db.coupon.update({
    where: { id: couponId },
    data: {
      name: patch.name?.trim() || undefined,
      active: patch.active,
      endsAt: patch.endsAt === undefined ? undefined : patch.endsAt ? new Date(patch.endsAt) : null,
      adminMemo: patch.adminMemo === undefined ? undefined : patch.adminMemo,
      maxUsesPerUser: patch.maxUsesPerUser === undefined ? undefined : patch.maxUsesPerUser,
      maxTotalUses: patch.maxTotalUses === undefined ? undefined : patch.maxTotalUses,
    },
  });

  await appendHistory(couponId, actor.id, "UPDATE", JSON.stringify(patch));
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "COUPON_UPDATE",
    targetType: "coupon",
    targetId: couponId,
    metadata: patch as Record<string, unknown>,
  });

  return { success: true as const, coupon };
}

export async function deactivateCoupon(actor: AdminActor, couponId: string) {
  const coupon = await db.coupon.update({
    where: { id: couponId },
    data: { active: false },
  });
  await appendHistory(couponId, actor.id, "DEACTIVATE");
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "COUPON_DEACTIVATE",
    targetType: "coupon",
    targetId: couponId,
  });
  return { success: true as const, coupon };
}

export async function deleteCoupon(actor: AdminActor, couponId: string) {
  await db.coupon.delete({ where: { id: couponId } });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "COUPON_DELETE",
    targetType: "coupon",
    targetId: couponId,
  });
  return { success: true as const };
}

export async function getCouponDetail(couponId: string) {
  const coupon = await db.coupon.findUnique({
    where: { id: couponId },
    include: {
      createdBy: { select: { id: true, username: true } },
      assignments: {
        take: 50,
        orderBy: { assignedAt: "desc" },
        include: { user: { select: { id: true, username: true } } },
      },
      usages: {
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { username: true } } },
      },
      history: { take: 30, orderBy: { createdAt: "desc" } },
      _count: { select: { assignments: true, usages: true } },
    },
  });
  if (!coupon) return null;
  return {
    ...coupon,
    listStatus: deriveCouponListStatus(coupon),
    benefitLabel: formatCouponBenefit(coupon),
  };
}

async function resolveUserIds(usernamesOrIds: string[]): Promise<string[]> {
  const cleaned = [...new Set(usernamesOrIds.map((s) => s.trim().replace(/^@/, "")).filter(Boolean))];
  if (cleaned.length === 0) return [];
  const users = await db.user.findMany({
    where: {
      OR: [{ id: { in: cleaned } }, { username: { in: cleaned, mode: "insensitive" } }],
      deletedAt: null,
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function assignCouponToUsers(
  actor: AdminActor,
  couponId: string,
  usernamesOrIds: string[]
) {
  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return { error: "쿠폰을 찾을 수 없습니다." };
  if (!coupon.active) return { error: "비활성 쿠폰입니다." };
  if (coupon.endsAt && coupon.endsAt.getTime() < Date.now()) return { error: "만료된 쿠폰입니다." };

  const userIds = await resolveUserIds(usernamesOrIds);
  if (userIds.length === 0) return { error: "지급 대상 유저를 찾을 수 없습니다." };

  let created = 0;
  let skipped = 0;
  for (const userId of userIds) {
    try {
      await db.couponAssignment.create({
        data: {
          couponId,
          userId,
          assignedById: actor.id,
          remainingBenefitKrw:
            coupon.benefitType === "FEE_WAIVER" ? coupon.waiveUpToKrw ?? 0 : null,
          status: "ACTIVE",
        },
      });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  if (created > 0) {
    await db.coupon.update({
      where: { id: couponId },
      data: { assignedCount: { increment: created } },
    });
  }

  await appendHistory(couponId, actor.id, "ASSIGN", `assigned=${created} skipped=${skipped}`);
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "COUPON_ASSIGN",
    targetType: "coupon",
    targetId: couponId,
    metadata: { created, skipped, requested: userIds.length },
  });

  return { success: true as const, created, skipped };
}

export async function searchUsersForCoupon(q: string) {
  const term = q.trim().replace(/^@/, "");
  if (!term) return [];
  return db.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { username: { contains: term, mode: "insensitive" } },
        { id: term },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    take: 20,
    select: { id: true, username: true, name: true, image: true },
  });
}

export async function exportCouponsCsv(query: CouponListQuery) {
  const { items } = await listCoupons({ ...query, page: 1, pageSize: 5000 });
  const header =
    "name,code,status,benefit,audience,assigned,usedCount,usedBenefitKrw,createdAt,endsAt";
  const rows = items.map((c) =>
    [
      c.name,
      c.code,
      c.listStatus,
      c.benefitLabel,
      c.audience,
      c.assignedCount,
      c.usedCount,
      c.usedBenefitKrw,
      c.createdAt.toISOString(),
      c.endsAt?.toISOString() ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export async function getMyCoupons(userId: string) {
  const assignments = await db.couponAssignment.findMany({
    where: { userId },
    orderBy: { assignedAt: "desc" },
    include: {
      coupon: true,
      usages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  return assignments.map((a) => ({
    ...a,
    benefitLabel: formatCouponBenefit(a.coupon),
    listStatus: a.status === "REVOKED" ? "INACTIVE" : deriveCouponListStatus(a.coupon),
  }));
}

/** 정산 시 적용할 활성 쿠폰 선택 (면제 잔여 우선) */
export async function pickActiveFeeCouponForUser(userId: string): Promise<FeeCouponSnapshot | null> {
  const now = new Date();
  const rows = await db.couponAssignment.findMany({
    where: {
      userId,
      status: "ACTIVE",
      coupon: {
        active: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    },
    include: { coupon: true },
    orderBy: { assignedAt: "asc" },
  });

  for (const a of rows) {
    const c = a.coupon;
    if (c.maxTotalUses != null && c.usedCount >= c.maxTotalUses) continue;
    if (c.maxUsesPerUser != null && a.useCount >= c.maxUsesPerUser) continue;
    if (c.benefitType === "FEE_WAIVER" && (a.remainingBenefitKrw ?? 0) <= 0) continue;
    return {
      assignmentId: a.id,
      couponId: c.id,
      benefitType: c.benefitType,
      remainingBenefitKrw: a.remainingBenefitKrw,
      percentOff: c.percentOff,
      fixedDiscountKrw: c.fixedDiscountKrw,
      maxUsesPerUser: c.maxUsesPerUser,
      useCount: a.useCount,
    };
  }
  return null;
}

/**
 * 정산 수수료에 쿠폰 적용 후 DB에 사용 내역·잔여 혜택 반영.
 * referenceType 예: tip_settlement, payout, marketplace_settlement
 */
export async function applyCouponToSettlement(input: {
  userId: string;
  grossAmountKrw: number;
  referenceType: string;
  referenceId?: string;
  note?: string;
}) {
  const coupon = await pickActiveFeeCouponForUser(input.userId);
  const split = computeFeeWithCoupon(input.grossAmountKrw, coupon);

  if (!coupon || split.benefitAppliedKrw <= 0) {
    return { ...split, usageId: null as string | null };
  }

  const usage = await db.$transaction(async (tx) => {
    const u = await tx.couponUsage.create({
      data: {
        couponId: coupon.couponId,
        assignmentId: coupon.assignmentId,
        userId: input.userId,
        referenceType: input.referenceType,
        referenceId: input.referenceId ?? null,
        grossAmountKrw: input.grossAmountKrw,
        benefitAppliedKrw: split.benefitAppliedKrw,
        feeBeforeKrw: split.feeBefore,
        feeAfterKrw: split.platformFee,
        note: input.note ?? null,
      },
    });

    const nextRemaining =
      coupon.benefitType === "FEE_WAIVER"
        ? Math.max(0, (coupon.remainingBenefitKrw ?? 0) - split.waivedGrossKrw)
        : coupon.remainingBenefitKrw;

    const nextUseCount = coupon.useCount + 1;
    const exhausted =
      (coupon.benefitType === "FEE_WAIVER" && (nextRemaining ?? 0) <= 0) ||
      (coupon.maxUsesPerUser != null && nextUseCount >= coupon.maxUsesPerUser);

    await tx.couponAssignment.update({
      where: { id: coupon.assignmentId },
      data: {
        remainingBenefitKrw: nextRemaining,
        usedBenefitKrw: { increment: split.benefitAppliedKrw },
        useCount: { increment: 1 },
        status: exhausted ? "EXHAUSTED" : "ACTIVE",
      },
    });

    await tx.coupon.update({
      where: { id: coupon.couponId },
      data: {
        usedCount: { increment: 1 },
        usedBenefitKrw: { increment: split.benefitAppliedKrw },
      },
    });

    return u;
  });

  return { ...split, usageId: usage.id };
}
