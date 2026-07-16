import type { FlowerGiftContext, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { FLOWER_CATALOG_PRESET, FLOWER_REDEEM_FEE_BPS, flowerRedeemFee } from "@/lib/flower/config";
import {
  appendFlowerLedger,
  flowerHeldBalanceKrw,
  logFlowerAudit,
  newIdempotencyKey,
} from "@/lib/flower/ledger";
import {
  assessFlowerGiftRisk,
  assessFlowerPurchaseRisk,
  assessFlowerRedeemRisk,
} from "@/lib/flower/risk";
import { creditSellerEarning, recordPlatformFee } from "@/lib/settlement";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";

/** Mint assets after Stripe FLOWER payment (idempotent on paymentIntentId) */
export async function fulfillFlowerPurchase(input: {
  buyerId: string;
  flowerTypeId: string;
  quantity?: number;
  paymentIntentId: string;
  amountPaid: number;
}) {
  const existing = await db.flowerPurchase.findUnique({
    where: { paymentIntentId: input.paymentIntentId },
  });
  if (existing) return { ok: true as const, alreadyPaid: true, purchaseId: existing.id };

  const qty = Math.max(1, Math.min(20, Math.floor(input.quantity ?? 1)));
  const flowerType = await db.flowerType.findUnique({ where: { id: input.flowerTypeId } });
  if (!flowerType || !flowerType.active) return { error: "Flower Gift를 찾을 수 없습니다." };

  const expected = flowerType.priceKrw * qty;
  if (expected !== input.amountPaid) {
    return { error: "결제 금액이 Flower Gift 가격과 일치하지 않습니다." };
  }

  const risk = await assessFlowerPurchaseRisk(input.buyerId, expected);
  const idemBase = `purchase_${input.paymentIntentId}`;

  const purchase = await db.$transaction(async (tx) => {
    const p = await tx.flowerPurchase.create({
      data: {
        buyerId: input.buyerId,
        flowerTypeId: flowerType.id,
        quantity: qty,
        unitPriceKrw: flowerType.priceKrw,
        totalAmountKrw: expected,
        paymentIntentId: input.paymentIntentId,
        idempotencyKey: idemBase,
      },
    });

    const assets = [];
    for (let i = 0; i < qty; i++) {
      const asset = await tx.flowerAsset.create({
        data: {
          flowerTypeId: flowerType.id,
          ownerId: input.buyerId,
          faceValueKrw: flowerType.priceKrw,
          status: "HELD",
          purchaseId: p.id,
        },
      });
      await tx.flowerAsset.update({
        where: { id: asset.id },
        data: { chainRootId: asset.id },
      });
      await appendFlowerLedger(tx, {
        userId: input.buyerId,
        assetId: asset.id,
        action: "MINT",
        amountKrw: flowerType.priceKrw,
        idempotencyKey: `${idemBase}_mint_${i}`,
        referenceType: "flower_purchase",
        referenceId: p.id,
      });
      assets.push(asset);
    }

    await appendFlowerLedger(tx, {
      userId: input.buyerId,
      action: "PURCHASE",
      amountKrw: expected,
      idempotencyKey: `${idemBase}_pay`,
      referenceType: "payment_intent",
      referenceId: input.paymentIntentId,
      metadata: { risk },
    });

    return p;
  });

  await logFlowerAudit({
    actorId: input.buyerId,
    action: "PURCHASE",
    targetType: "flower_purchase",
    targetId: purchase.id,
    detail: `${flowerType.slug} x${qty} risk=${risk.score}`,
    metadata: { risk },
  });

  return { ok: true as const, purchaseId: purchase.id, risk };
}

export async function giftFlowerAsset(input: {
  assetId: string;
  fromUserId: string;
  toUsernameOrId: string;
  message?: string;
  useDefaultMessage?: boolean;
  context?: FlowerGiftContext;
  contextId?: string;
  idempotencyKey: string;
}) {
  const existing = await db.flowerTransfer.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return { ok: true as const, transferId: existing.id, alreadyDone: true };

  const toUser =
    (await db.user.findUnique({
      where: { id: input.toUsernameOrId },
      select: { id: true, username: true },
    })) ??
    (await db.user.findUnique({
      where: { username: input.toUsernameOrId.replace(/^@/, "") },
      select: { id: true, username: true },
    }));
  if (!toUser) return { error: "받는 사용자를 찾을 수 없습니다." };
  if (toUser.id === input.fromUserId) return { error: "본인에게는 선물할 수 없습니다." };

  const asset = await db.flowerAsset.findUnique({
    where: { id: input.assetId },
    include: { flowerType: true },
  });
  if (!asset || asset.ownerId !== input.fromUserId) return { error: "보유한 Flower Gift가 아닙니다." };
  if (asset.status !== "HELD") return { error: "선물할 수 없는 상태입니다." };

  const risk = await assessFlowerGiftRisk(input.fromUserId, asset.faceValueKrw);
  if (risk.hold) {
    await logFlowerAudit({
      actorId: input.fromUserId,
      action: "GIFT_BLOCKED",
      targetType: "flower_asset",
      targetId: asset.id,
      detail: `risk=${risk.score}`,
      metadata: { risk },
    });
    return { error: "이상 거래로 선물이 일시 보류되었습니다. 잠시 후 다시 시도하거나 고객센터에 문의해 주세요." };
  }

  const msg = input.useDefaultMessage
    ? asset.flowerType.defaultMessage
    : (input.message?.trim() || asset.flowerType.defaultMessage);

  const transfer = await db.$transaction(async (tx) => {
    const locked = await tx.flowerAsset.updateMany({
      where: { id: asset.id, ownerId: input.fromUserId, status: "HELD" },
      data: { ownerId: toUser.id, updatedAt: new Date() },
    });
    if (locked.count !== 1) throw new Error("ASSET_CONFLICT");

    const t = await tx.flowerTransfer.create({
      data: {
        assetId: asset.id,
        fromUserId: input.fromUserId,
        toUserId: toUser.id,
        message: msg.slice(0, 800),
        usedDefaultMessage: Boolean(input.useDefaultMessage),
        context: input.context ?? "DIRECT",
        contextId: input.contextId ?? null,
        previousTransferId: asset.lastTransferId,
        idempotencyKey: input.idempotencyKey,
      },
    });

    await tx.flowerAsset.update({
      where: { id: asset.id },
      data: { lastTransferId: t.id },
    });

    await appendFlowerLedger(tx, {
      userId: input.fromUserId,
      assetId: asset.id,
      action: "GIFT_OUT",
      amountKrw: -asset.faceValueKrw,
      idempotencyKey: `${input.idempotencyKey}_out`,
      referenceType: "flower_transfer",
      referenceId: t.id,
    });
    await appendFlowerLedger(tx, {
      userId: toUser.id,
      assetId: asset.id,
      action: "GIFT_IN",
      amountKrw: asset.faceValueKrw,
      idempotencyKey: `${input.idempotencyKey}_in`,
      referenceType: "flower_transfer",
      referenceId: t.id,
    });

    return t;
  });

  await logFlowerAudit({
    actorId: input.fromUserId,
    action: "GIFT",
    targetType: "flower_transfer",
    targetId: transfer.id,
    detail: `${asset.flowerType.slug} → @${toUser.username}`,
  });

  await createNotification({
    userId: toUser.id,
    type: "SYSTEM",
    title: `${asset.flowerType.emoji} 꽃과 편지가 도착했어요`,
    body: msg.slice(0, 120),
    link: "/flowers?tab=received",
    actorId: input.fromUserId,
  });

  return { ok: true as const, transferId: transfer.id };
}

export async function requestFlowerRedeem(input: {
  assetId: string;
  userId: string;
  idempotencyKey: string;
}) {
  const existing = await db.flowerRedeemRequest.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return { ok: true as const, redeemId: existing.id, alreadyDone: true };

  const asset = await db.flowerAsset.findUnique({
    where: { id: input.assetId },
    include: { flowerType: true },
  });
  if (!asset || asset.ownerId !== input.userId) return { error: "보유한 Flower Gift가 아닙니다." };
  if (asset.status !== "HELD") return { error: "환전할 수 없는 상태입니다." };

  const risk = await assessFlowerRedeemRisk(input.userId, asset.faceValueKrw);
  const fees = flowerRedeemFee(asset.faceValueKrw);

  const redeem = await db.$transaction(async (tx) => {
    const locked = await tx.flowerAsset.updateMany({
      where: { id: asset.id, ownerId: input.userId, status: "HELD" },
      data: { status: "LOCKED", lockedAt: new Date() },
    });
    if (locked.count !== 1) throw new Error("ASSET_CONFLICT");

    const r = await tx.flowerRedeemRequest.create({
      data: {
        assetId: asset.id,
        userId: input.userId,
        faceValueKrw: asset.faceValueKrw,
        feeBps: fees.feeBps,
        feeAmountKrw: fees.feeAmountKrw,
        netAmountKrw: fees.netAmountKrw,
        status: risk.hold ? "PENDING" : "PENDING",
        riskScore: risk.score,
        riskFlags: risk.flags,
        idempotencyKey: input.idempotencyKey,
      },
    });

    await appendFlowerLedger(tx, {
      userId: input.userId,
      assetId: asset.id,
      action: "REDEEM_LOCK",
      amountKrw: -asset.faceValueKrw,
      idempotencyKey: `${input.idempotencyKey}_lock`,
      referenceType: "flower_redeem",
      referenceId: r.id,
      metadata: { risk },
    });

    return r;
  });

  await logFlowerAudit({
    actorId: input.userId,
    action: risk.hold ? "REDEEM_HOLD" : "REDEEM_REQUEST",
    targetType: "flower_redeem",
    targetId: redeem.id,
    detail: `net=${fees.netAmountKrw} risk=${risk.score}`,
    metadata: { risk },
  });

  return {
    ok: true as const,
    redeemId: redeem.id,
    heldForReview: risk.hold,
    netAmountKrw: fees.netAmountKrw,
  };
}

/** Admin or auto-approve path — pay via Connect Transfer or wallet */
export async function payFlowerRedeem(
  redeemId: string,
  opts: { actorId?: string | null; force?: boolean }
) {
  const redeem = await db.flowerRedeemRequest.findUnique({
    where: { id: redeemId },
    include: {
      user: {
        select: {
          id: true,
          stripeConnectAccountId: true,
          stripeConnectOnboardedAt: true,
        },
      },
      asset: true,
    },
  });
  if (!redeem) return { error: "환전 요청이 없습니다." };
  if (redeem.status === "PAID") return { ok: true as const, alreadyPaid: true };
  if (redeem.status === "REJECTED" || redeem.status === "CANCELLED") {
    return { error: "거절·취소된 요청입니다." };
  }
  if (redeem.riskScore >= 70 && !opts.force) {
    return { error: "위험 점수로 관리자 승인이 필요합니다.", needsAdmin: true };
  }

  let transferId: string | undefined;
  const connectReady = Boolean(
    redeem.user.stripeConnectAccountId && redeem.user.stripeConnectOnboardedAt
  );

  if (connectReady && isStripeConfigured() && redeem.user.stripeConnectAccountId) {
    try {
      const stripe = getStripe();
      const transfer = await stripe.transfers.create({
        amount: redeem.netAmountKrw,
        currency: "krw",
        destination: redeem.user.stripeConnectAccountId,
        transfer_group: redeem.id,
        metadata: { flowerRedeemId: redeem.id, type: "flower_redeem" },
      }, { idempotencyKey: `flower_redeem_${redeem.id}` });
      transferId = transfer.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "transfer failed";
      return { error: `Stripe 정산 실패: ${msg}` };
    }
  } else {
    await creditSellerEarning(redeem.userId, redeem.netAmountKrw, {
      referenceType: "flower_redeem",
      referenceId: redeem.id,
      memo: `Flower Gift 환전 #${redeem.id.slice(0, 8)}`,
    });
  }

  await recordPlatformFee(redeem.feeAmountKrw, {
    referenceType: "flower_redeem_fee",
    referenceId: redeem.id,
    memo: `Flower Gift 수수료 ${FLOWER_REDEEM_FEE_BPS / 100}%`,
  });

  await db.$transaction(async (tx) => {
    await tx.flowerRedeemRequest.update({
      where: { id: redeem.id },
      data: {
        status: "PAID",
        stripeTransferId: transferId ?? null,
        decidedById: opts.actorId ?? null,
        decidedAt: new Date(),
        paidAt: new Date(),
      },
    });
    await tx.flowerAsset.update({
      where: { id: redeem.assetId },
      data: { status: "REDEEMED", redeemedAt: new Date() },
    });
    await appendFlowerLedger(tx, {
      userId: redeem.userId,
      assetId: redeem.assetId,
      action: "REDEEM_PAID",
      amountKrw: redeem.netAmountKrw,
      idempotencyKey: `redeem_paid_${redeem.id}`,
      referenceType: "flower_redeem",
      referenceId: redeem.id,
    });
  });

  await logFlowerAudit({
    actorId: opts.actorId,
    action: "REDEEM_PAID",
    targetType: "flower_redeem",
    targetId: redeem.id,
    detail: transferId ?? "wallet",
  });

  await createNotification({
    userId: redeem.userId,
    type: "SYSTEM",
    title: "Flower Gift 환전이 완료되었습니다",
    body: `${redeem.netAmountKrw.toLocaleString()}원 (수수료 ${redeem.feeAmountKrw.toLocaleString()}원)`,
    link: "/flowers",
  });

  return { ok: true as const, transferId };
}

export async function rejectFlowerRedeem(
  redeemId: string,
  actorId: string,
  note: string
) {
  const redeem = await db.flowerRedeemRequest.findUnique({ where: { id: redeemId } });
  if (!redeem) return { error: "환전 요청이 없습니다." };
  if (redeem.status === "PAID") return { error: "이미 지급된 요청입니다." };

  await db.$transaction(async (tx) => {
    await tx.flowerRedeemRequest.update({
      where: { id: redeemId },
      data: {
        status: "REJECTED",
        adminNote: note.slice(0, 2000),
        decidedById: actorId,
        decidedAt: new Date(),
      },
    });
    await tx.flowerAsset.update({
      where: { id: redeem.assetId },
      data: { status: "HELD", lockedAt: null },
    });
    await appendFlowerLedger(tx, {
      userId: redeem.userId,
      assetId: redeem.assetId,
      action: "REDEEM_REJECTED",
      amountKrw: redeem.faceValueKrw,
      idempotencyKey: `redeem_reject_${redeemId}`,
      referenceType: "flower_redeem",
      referenceId: redeemId,
    });
  });

  await logFlowerAudit({
    actorId,
    action: "REDEEM_REJECTED",
    targetType: "flower_redeem",
    targetId: redeemId,
    detail: note,
  });

  await createNotification({
    userId: redeem.userId,
    type: "SYSTEM",
    title: "Flower Gift 환전이 거절되었습니다",
    body: note.slice(0, 120) || "자산이 보관함으로 복구되었습니다.",
    link: "/flowers",
  });

  return { success: true as const };
}

export async function getFlowerWalletSnapshot(userId: string) {
  const [types, held, sent, received, redeems, ledger, balance] = await Promise.all([
    db.flowerType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.flowerAsset.findMany({
      where: { ownerId: userId, status: { in: ["HELD", "LOCKED"] } },
      include: { flowerType: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.flowerTransfer.findMany({
      where: { fromUserId: userId },
      include: {
        asset: { include: { flowerType: true } },
        toUser: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.flowerTransfer.findMany({
      where: { toUserId: userId },
      include: {
        asset: { include: { flowerType: true } },
        fromUser: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.flowerRedeemRequest.findMany({
      where: { userId },
      include: { asset: { include: { flowerType: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.flowerLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    flowerHeldBalanceKrw(userId),
  ]);

  return {
    types,
    held,
    sent,
    received,
    redeems,
    ledger,
    redeemableKrw: balance.balanceKrw,
    assetCount: balance.assetCount,
  };
}

export async function ensureFlowerCatalogSeeded() {
  const seed: Prisma.FlowerTypeCreateManyInput[] = FLOWER_CATALOG_PRESET.map((item) => ({ ...item }));
  for (const item of seed) {
    await db.flowerType.upsert({
      where: { slug: item.slug },
      create: item,
      update: {
        nameKo: item.nameKo,
        nameEn: item.nameEn,
        emoji: item.emoji,
        priceKrw: item.priceKrw,
        defaultMessage: item.defaultMessage,
        animationKey: item.animationKey,
        sortOrder: item.sortOrder,
      },
    });
  }
}

export { newIdempotencyKey };
