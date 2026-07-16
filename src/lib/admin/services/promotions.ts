import type { CouponBenefitType, Prisma, PromotionTrigger } from "@prisma/client";
import { db } from "@/lib/db";
import { formatCouponBenefit, generateCouponCode } from "@/lib/coupon/engine";
import {
  evaluatePromotionRules,
  parsePromotionRules,
  type PromotionRule,
  type RuleEvalContext,
} from "@/lib/promotion/rules";
import type { FeePromotionSnapshot } from "@/lib/promotion/fee-stack";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import type { AdminActor } from "@/lib/admin/access";
import { createNotification, createNotificationsMany } from "@/lib/notifications";
import { pickActiveFeeCouponForUser } from "@/lib/admin/services/coupons";
import { previewFeeWithBenefits } from "@/lib/promotion/fee-stack";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "promo"}-${generateCouponCode(8).toLowerCase()}`;
}

async function history(
  promotionId: string,
  actorId: string | null,
  action: string,
  detail?: string,
  metadata?: Record<string, unknown>
) {
  await db.promotionHistory.create({
    data: {
      promotionId,
      actorId,
      action,
      detail,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function buildRuleContext(userId: string): Promise<RuleEvalContext> {
  const [user, liveCount] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        premiumTier: true,
        premiumUntil: true,
        supportTierReceived: true,
        countryCode: true,
        locale: true,
        createdAt: true,
        totalSupportReceived: true,
        _count: { select: { followers: true } },
        digitalProducts: { select: { id: true }, take: 1 },
        marketplaceListings: { select: { id: true }, take: 1 },
        marketplaceOrdersSold: { select: { id: true, subtotalAmount: true }, take: 50 },
        creatorEpisodes: { select: { id: true }, take: 1 },
        streamerProfile: { select: { id: true } },
      },
    }),
    db.voiceChannel.count({ where: { createdBy: userId } }),
  ]);
  if (!user) {
    return {
      followerCount: 0,
      isCreator: false,
      hasListing: false,
      hasSale: false,
      isPremium: false,
      isPartner: false,
      adminApproved: false,
      supportTierReceived: "PEBBLE",
      role: "USER",
      countryCode: null,
      locale: null,
      signupDays: 0,
      totalSalesKrw: 0,
      totalTipsReceivedKrw: 0,
      liveCount: 0,
    };
  }
  const isPremium =
    user.premiumTier === "PREMIUM" ||
    (user.premiumUntil != null && user.premiumUntil.getTime() > Date.now());
  const signupDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86400000);
  const totalSalesKrw = user.marketplaceOrdersSold.reduce(
    (s, o) => s + (o.subtotalAmount ?? 0),
    0
  );
  return {
    followerCount: user._count.followers,
    isCreator:
      !!user.streamerProfile ||
      user.creatorEpisodes.length > 0 ||
      user.digitalProducts.length > 0,
    hasListing: user.marketplaceListings.length > 0 || user.digitalProducts.length > 0,
    hasSale: user.marketplaceOrdersSold.length > 0,
    isPremium,
    isPartner: false,
    adminApproved: !!user.streamerProfile,
    supportTierReceived: user.supportTierReceived,
    role: user.role,
    countryCode: user.countryCode ?? null,
    locale: user.locale ?? null,
    signupDays,
    totalSalesKrw,
    totalTipsReceivedKrw: user.totalSupportReceived ?? 0,
    liveCount,
  };
}

export type CreatePromotionInput = {
  name: string;
  slug?: string;
  description?: string;
  benefitType: CouponBenefitType;
  waiveUpToKrw?: number;
  percentOff?: number;
  fixedDiscountKrw?: number;
  priority?: number;
  stackable?: boolean;
  allowDuplicate?: boolean;
  maxStackPerSettlement?: number;
  trigger?: PromotionTrigger;
  rules?: PromotionRule[];
  scheduledAt?: string | null;
  startsAt: string;
  endsAt?: string | null;
  active?: boolean;
  maxUsesPerUser?: number | null;
  maxTotalUses?: number | null;
  adminMemo?: string;
};

export async function createPromotion(actor: AdminActor, input: CreatePromotionInput) {
  const name = input.name.trim();
  if (name.length < 2) return { error: "프로모션 이름을 입력해 주세요." };
  const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
  const exists = await db.promotion.findUnique({ where: { slug } });
  if (exists) return { error: "이미 존재하는 slug입니다." };

  if (input.benefitType === "FEE_WAIVER" && !(input.waiveUpToKrw && input.waiveUpToKrw > 0)) {
    return { error: "면제 한도를 입력해 주세요." };
  }

  const promo = await db.promotion.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      benefitType: input.benefitType,
      waiveUpToKrw: input.benefitType === "FEE_WAIVER" ? input.waiveUpToKrw : null,
      percentOff: input.benefitType === "FEE_PERCENT_OFF" ? input.percentOff : null,
      fixedDiscountKrw: input.benefitType === "FIXED_AMOUNT" ? input.fixedDiscountKrw : null,
      priority: input.priority ?? 100,
      stackable: input.stackable ?? false,
      allowDuplicate: input.allowDuplicate ?? false,
      maxStackPerSettlement: Math.max(1, input.maxStackPerSettlement ?? 1),
      trigger: input.trigger ?? "MANUAL",
      rules: (input.rules ?? []) as unknown as Prisma.InputJsonValue,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      active: input.active ?? true,
      maxUsesPerUser: input.maxUsesPerUser === undefined ? 1 : input.maxUsesPerUser,
      maxTotalUses: input.maxTotalUses ?? null,
      adminMemo: input.adminMemo?.trim() || null,
      createdById: actor.id,
    },
  });

  await history(promo.id, actor.id, "CREATE", promo.name);
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "PROMOTION_CREATE",
    targetType: "promotion",
    targetId: promo.id,
    metadata: { name: promo.name, slug: promo.slug },
  });
  return { success: true as const, promotion: promo };
}

export async function updatePromotion(
  actor: AdminActor,
  id: string,
  patch: Partial<{
    name: string;
    active: boolean;
    priority: number;
    stackable: boolean;
    allowDuplicate: boolean;
    maxStackPerSettlement: number;
    endsAt: string | null;
    adminMemo: string | null;
    rules: PromotionRule[];
    description: string | null;
  }>
) {
  const promo = await db.promotion.update({
    where: { id },
    data: {
      name: patch.name?.trim() || undefined,
      active: patch.active,
      priority: patch.priority,
      stackable: patch.stackable,
      allowDuplicate: patch.allowDuplicate,
      maxStackPerSettlement: patch.maxStackPerSettlement,
      endsAt: patch.endsAt === undefined ? undefined : patch.endsAt ? new Date(patch.endsAt) : null,
      adminMemo: patch.adminMemo === undefined ? undefined : patch.adminMemo,
      description: patch.description === undefined ? undefined : patch.description,
      rules:
        patch.rules === undefined
          ? undefined
          : (patch.rules as unknown as Prisma.InputJsonValue),
    },
  });
  await history(id, actor.id, "UPDATE", JSON.stringify(patch));
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "PROMOTION_UPDATE",
    targetType: "promotion",
    targetId: id,
    metadata: patch as Record<string, unknown>,
  });
  return { success: true as const, promotion: promo };
}

export async function deletePromotion(actor: AdminActor, id: string) {
  await db.promotion.delete({ where: { id } });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "PROMOTION_DELETE",
    targetType: "promotion",
    targetId: id,
  });
  return { success: true as const };
}

export async function listPromotions(query: {
  q?: string;
  page?: number;
  active?: boolean;
}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = 20;
  const where: Prisma.PromotionWhereInput = {};
  if (query.q?.trim()) {
    where.OR = [
      { name: { contains: query.q.trim(), mode: "insensitive" } },
      { slug: { contains: query.q.trim(), mode: "insensitive" } },
    ];
  }
  if (query.active != null) where.active = query.active;

  const [total, items] = await Promise.all([
    db.promotion.count({ where }),
    db.promotion.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: { select: { username: true } },
        _count: { select: { assignments: true, usages: true } },
      },
    }),
  ]);

  return {
    items: items.map((p) => ({
      ...p,
      benefitLabel: formatCouponBenefit(p),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPromotionDetail(id: string) {
  const p = await db.promotion.findUnique({
    where: { id },
    include: {
      createdBy: { select: { username: true } },
      assignments: {
        take: 40,
        orderBy: { assignedAt: "desc" },
        include: { user: { select: { username: true, id: true } } },
      },
      usages: {
        take: 40,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { username: true } } },
      },
      history: { take: 30, orderBy: { createdAt: "desc" } },
      _count: { select: { assignments: true, usages: true } },
    },
  });
  if (!p) return null;
  return { ...p, benefitLabel: formatCouponBenefit(p), rules: parsePromotionRules(p.rules) };
}

export async function assignPromotion(
  actor: AdminActor | null,
  promotionId: string,
  userIds: string[],
  opts?: { skipRules?: boolean; notify?: boolean }
) {
  const promo = await db.promotion.findUnique({ where: { id: promotionId } });
  if (!promo || !promo.active) return { error: "프로모션을 사용할 수 없습니다." };

  let created = 0;
  let skipped = 0;
  for (const userId of userIds) {
    if (!opts?.skipRules) {
      const ctx = await buildRuleContext(userId);
      const rules = parsePromotionRules(promo.rules);
      const ev = evaluatePromotionRules(rules, ctx);
      if (!ev.ok) {
        skipped += 1;
        continue;
      }
    }
    try {
      await db.promotionAssignment.create({
        data: {
          promotionId,
          userId,
          assignedById: actor?.id ?? null,
          remainingBenefitKrw:
            promo.benefitType === "FEE_WAIVER" ? promo.waiveUpToKrw ?? 0 : null,
        },
      });
      created += 1;
      if (opts?.notify !== false) {
        await createNotification({
          userId,
          type: "PROMOTION",
          title: `프로모션 지급: ${promo.name}`,
          body: formatCouponBenefit(promo),
          link: "/coupons",
          actorId: actor?.id,
        });
      }
    } catch {
      skipped += 1;
    }
  }

  if (created > 0) {
    await db.promotion.update({
      where: { id: promotionId },
      data: { assignedCount: { increment: created } },
    });
  }

  if (actor) {
    await history(promotionId, actor.id, "ASSIGN", `created=${created}`);
    await logSiteAdminAudit({
      actorId: actor.id,
      action: "PROMOTION_ASSIGN",
      targetType: "promotion",
      targetId: promotionId,
      metadata: { created, skipped },
    });
  }

  return { success: true as const, created, skipped };
}

export async function pickActivePromotionsForUser(
  userId: string
): Promise<FeePromotionSnapshot[]> {
  const now = new Date();
  const rows = await db.promotionAssignment.findMany({
    where: {
      userId,
      status: "ACTIVE",
      promotion: {
        active: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    },
    include: { promotion: true },
    orderBy: [{ promotion: { priority: "asc" } }, { assignedAt: "asc" }],
  });

  const out: FeePromotionSnapshot[] = [];
  for (const a of rows) {
    const p = a.promotion;
    if (p.maxTotalUses != null && p.usedCount >= p.maxTotalUses) continue;
    if (p.maxUsesPerUser != null && a.useCount >= p.maxUsesPerUser) continue;
    if (p.benefitType === "FEE_WAIVER" && (a.remainingBenefitKrw ?? 0) <= 0) continue;
    out.push({
      kind: "promotion",
      assignmentId: a.id,
      promotionId: p.id,
      name: p.name,
      priority: p.priority,
      stackable: p.stackable,
      allowDuplicate: p.allowDuplicate,
      maxStackPerSettlement: p.maxStackPerSettlement,
      benefitType: p.benefitType,
      remainingBenefitKrw: a.remainingBenefitKrw,
      percentOff: p.percentOff,
      fixedDiscountKrw: p.fixedDiscountKrw,
      maxUsesPerUser: p.maxUsesPerUser,
      useCount: a.useCount,
    });
  }
  return out;
}

/** @deprecated use pickActivePromotionsForUser */
export async function pickActivePromotionForUser(
  userId: string
): Promise<FeePromotionSnapshot | null> {
  const list = await pickActivePromotionsForUser(userId);
  return list[0] ?? null;
}

export async function previewUserSettlementBenefits(userId: string, grossAmountKrw: number) {
  const [promotions, coupon] = await Promise.all([
    pickActivePromotionsForUser(userId),
    pickActiveFeeCouponForUser(userId),
  ]);
  return previewFeeWithBenefits({ grossAmountKrw, promotions, coupon });
}

/** 쿠폰+프로모션 적용 후 사용 기록 (정산 훅) */
export async function applyBenefitsToSettlement(input: {
  userId: string;
  grossAmountKrw: number;
  referenceType: string;
  referenceId?: string;
  note?: string;
}) {
  const preview = await previewUserSettlementBenefits(input.userId, input.grossAmountKrw);

  await db.$transaction(async (tx) => {
    for (const snap of preview.appliedPromotions) {
      const promoStep = preview.steps.find((s) => s.label === `Promotion: ${snap.name}`);
      const saved = promoStep?.saved ?? 0;
      if (saved <= 0) continue;
      await tx.promotionUsage.create({
        data: {
          promotionId: snap.promotionId,
          assignmentId: snap.assignmentId,
          userId: input.userId,
          referenceType: input.referenceType,
          referenceId: input.referenceId ?? null,
          grossAmountKrw: input.grossAmountKrw,
          benefitAppliedKrw: saved,
          feeBeforeKrw: promoStep!.feeBefore,
          feeAfterKrw: promoStep!.feeAfter,
          note: input.note ?? null,
        },
      });
      const waivedGross =
        snap.benefitType === "FEE_WAIVER"
          ? Math.min(input.grossAmountKrw, snap.remainingBenefitKrw ?? 0)
          : 0;
      const nextRemaining =
        snap.benefitType === "FEE_WAIVER"
          ? Math.max(0, (snap.remainingBenefitKrw ?? 0) - waivedGross)
          : snap.remainingBenefitKrw;
      const nextUse = snap.useCount + 1;
      const exhausted =
        (snap.benefitType === "FEE_WAIVER" && (nextRemaining ?? 0) <= 0) ||
        (snap.maxUsesPerUser != null && nextUse >= snap.maxUsesPerUser);
      await tx.promotionAssignment.update({
        where: { id: snap.assignmentId },
        data: {
          remainingBenefitKrw: nextRemaining,
          usedBenefitKrw: { increment: saved },
          useCount: { increment: 1 },
          status: exhausted ? "EXHAUSTED" : "ACTIVE",
        },
      });
      await tx.promotion.update({
        where: { id: snap.promotionId },
        data: {
          usedCount: { increment: 1 },
          usedBenefitKrw: { increment: saved },
        },
      });
    }

    if (preview.appliedCoupon) {
      const couponStep = preview.steps.find((s) => s.label === "Coupon");
      const saved = couponStep?.saved ?? 0;
      if (saved > 0) {
        const c = preview.appliedCoupon;
        await tx.couponUsage.create({
          data: {
            couponId: c.couponId,
            assignmentId: c.assignmentId,
            userId: input.userId,
            referenceType: input.referenceType,
            referenceId: input.referenceId ?? null,
            grossAmountKrw: input.grossAmountKrw,
            benefitAppliedKrw: saved,
            feeBeforeKrw: couponStep!.feeBefore,
            feeAfterKrw: couponStep!.feeAfter,
            note: input.note ?? null,
          },
        });
        const waivedGross =
          c.benefitType === "FEE_WAIVER"
            ? Math.min(input.grossAmountKrw, c.remainingBenefitKrw ?? 0)
            : 0;
        const nextRemaining =
          c.benefitType === "FEE_WAIVER"
            ? Math.max(0, (c.remainingBenefitKrw ?? 0) - waivedGross)
            : c.remainingBenefitKrw;
        const nextUse = c.useCount + 1;
        const exhausted =
          (c.benefitType === "FEE_WAIVER" && (nextRemaining ?? 0) <= 0) ||
          (c.maxUsesPerUser != null && nextUse >= c.maxUsesPerUser);
        await tx.couponAssignment.update({
          where: { id: c.assignmentId },
          data: {
            remainingBenefitKrw: nextRemaining,
            usedBenefitKrw: { increment: saved },
            useCount: { increment: 1 },
            status: exhausted ? "EXHAUSTED" : "ACTIVE",
          },
        });
        await tx.coupon.update({
          where: { id: c.couponId },
          data: {
            usedCount: { increment: 1 },
            usedBenefitKrw: { increment: saved },
          },
        });
      }
    }
  });

  return preview;
}

export async function getPromotionStatistics(promotionId?: string) {
  const where = promotionId ? { id: promotionId } : {};
  const promos = await db.promotion.findMany({
    where,
    orderBy: { priority: "asc" },
    include: {
      _count: { select: { assignments: true, usages: true } },
      usages: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { username: true } } },
      },
    },
  });

  return promos.map((p) => {
    const assigned = p._count.assignments;
    const used = p._count.usages;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priority: p.priority,
      assignedCount: assigned,
      usedCount: used,
      usageRate: assigned > 0 ? Math.round((used / assigned) * 1000) / 10 : 0,
      usedBenefitKrw: p.usedBenefitKrw,
      avgBenefitKrw: used > 0 ? Math.round(p.usedBenefitKrw / used) : 0,
      recentUsages: p.usages.map((u) => ({
        username: u.user.username,
        benefitAppliedKrw: u.benefitAppliedKrw,
        createdAt: u.createdAt,
      })),
      seriesHint: {
        assigned,
        used,
        saved: p.usedBenefitKrw,
      },
    };
  });
}

/** 자동 지급 트리거 실행 */
export async function runPromotionTrigger(
  trigger: PromotionTrigger,
  userId: string,
  opts?: { eventKey?: string }
) {
  const now = new Date();
  const promos = await db.promotion.findMany({
    where: {
      active: true,
      trigger,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });

  let total = 0;
  for (const p of promos) {
    if (trigger === "SCHEDULED_DATE" && p.scheduledAt && p.scheduledAt.getTime() > now.getTime()) {
      continue;
    }
    if (trigger === "ON_EVENT" && opts?.eventKey) {
      const rules = parsePromotionRules(p.rules);
      // optional event match via rule ROLE_IN misuse — skip for now
      void rules;
    }
    const res = await assignPromotion(null, p.id, [userId], { notify: true });
    if ("created" in res) total += res.created ?? 0;
  }
  return { assigned: total };
}

export async function getMyPromotions(userId: string) {
  const now = new Date();
  const rows = await db.promotionAssignment.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
    include: {
      promotion: true,
      usages: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  return rows.map((a) => ({
    ...a,
    benefitLabel: formatCouponBenefit(a.promotion),
    isExpired:
      a.promotion.endsAt != null && a.promotion.endsAt.getTime() <= now.getTime(),
  }));
}

export async function listPromotionHistory(promotionId?: string, page = 1) {
  const pageSize = 40;
  const where = promotionId ? { promotionId } : {};
  const [total, items] = await Promise.all([
    db.promotionHistory.count({ where }),
    db.promotionHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        promotion: { select: { name: true, slug: true } },
      },
    }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** SCHEDULED_DATE / CRON_RULE 일괄 지급 (cron) */
export async function runScheduledPromotionAssignments() {
  const now = new Date();
  const promos = await db.promotion.findMany({
    where: {
      active: true,
      trigger: { in: ["SCHEDULED_DATE", "CRON_RULE"] },
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      AND: [
        {
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        },
      ],
    },
  });

  let assigned = 0;
  for (const p of promos) {
    // 규칙 통과 대상만 — 전체 유저 스캔은 비용이 커서 최근 활성 유저 제한
    const candidates = await db.user.findMany({
      where: { deletedAt: null, isBanned: false },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const res = await assignPromotion(
      null,
      p.id,
      candidates.map((c) => c.id),
      { notify: true }
    );
    if ("created" in res) assigned += res.created ?? 0;
    // 한 번만 실행되도록 예약 시각 클리어
    if (p.trigger === "SCHEDULED_DATE") {
      await db.promotion.update({
        where: { id: p.id },
        data: { scheduledAt: null },
      });
      await history(p.id, null, "SCHEDULED_ASSIGN", `created=${("created" in res && res.created) || 0}`);
    }
  }
  return { promotions: promos.length, assigned };
}

export async function notifyPromotionExpiries() {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const in3 = new Date(now.getTime() + 3 * 86400000);
  const in1 = new Date(now.getTime() + 1 * 86400000);

  const tiers: { days: 7 | 3 | 1; flag: "expiryNotified7d" | "expiryNotified3d" | "expiryNotified1d"; until: Date }[] =
    [
      { days: 7, flag: "expiryNotified7d", until: in7 },
      { days: 3, flag: "expiryNotified3d", until: in3 },
      { days: 1, flag: "expiryNotified1d", until: in1 },
    ];

  let notified = 0;
  for (const t of tiers) {
    const promos = await db.promotion.findMany({
      where: {
        active: true,
        endsAt: { gt: now, lte: t.until },
        [t.flag]: false,
      },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          select: { userId: true },
        },
      },
    });

    for (const p of promos) {
      const userNotifs = p.assignments.map((a) => ({
        userId: a.userId,
        type: "PROMOTION",
        title: `프로모션 만료 ${t.days}일 전`,
        body: `${p.name} 혜택이 ${t.days}일 후 만료됩니다.`,
        link: "/coupons",
      }));
      if (userNotifs.length) await createNotificationsMany(userNotifs);

      const { notifyAdmins } = await import("@/lib/platform/notification-center");
      await notifyAdmins({
        title: `[Admin] 프로모션 만료 ${t.days}일 전`,
        body: `${p.name} (${p.assignments.length}명 보유)`,
        link: `/admin/promotions/${p.id}`,
        type: "ADMIN_PROMOTION",
      });

      await db.promotion.update({ where: { id: p.id }, data: { [t.flag]: true } });
      await history(p.id, null, "EXPIRY_NOTIFY", `${t.days}d`);
      notified += 1;
    }
  }
  return { notified };
}
