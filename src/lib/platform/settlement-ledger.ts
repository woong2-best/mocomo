import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** 불변 Settlement Ledger — append-only */
export async function appendSettlementLedger(entry: {
  settlementId?: string | null;
  userId: string;
  entryType: string;
  label: string;
  amountKrw: number;
  balanceAfterKrw?: number | null;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}) {
  return db.settlementLedgerEntry.create({
    data: {
      settlementId: entry.settlementId ?? null,
      userId: entry.userId,
      entryType: entry.entryType,
      label: entry.label,
      amountKrw: entry.amountKrw,
      balanceAfterKrw: entry.balanceAfterKrw ?? null,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listSettlementLedger(query: {
  settlementId?: string;
  userId?: string;
  page?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = 50;
  const where: Prisma.SettlementLedgerEntryWhereInput = {};
  if (query.settlementId) where.settlementId = query.settlementId;
  if (query.userId) where.userId = query.userId;

  const [total, items] = await Promise.all([
    db.settlementLedgerEntry.count({ where }),
    db.settlementLedgerEntry.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize };
}

/** 미리보기 결과를 원장 라인으로 기록 */
export async function writeBenefitPreviewLedger(input: {
  settlementId?: string;
  userId: string;
  grossAmountKrw: number;
  feeBeforeKrw: number;
  feeAfterKrw: number;
  discountAmountKrw: number;
  sellerAmountKrw: number;
  promotionNames?: string[];
  couponApplied?: boolean;
  referenceType?: string;
  referenceId?: string;
}) {
  const lines: {
    entryType: string;
    label: string;
    amountKrw: number;
  }[] = [
    {
      entryType: "GROSS",
      label: "총 수익",
      amountKrw: input.grossAmountKrw,
    },
    {
      entryType: "PLATFORM_FEE",
      label: "플랫폼 수수료",
      amountKrw: -input.feeBeforeKrw,
    },
  ];
  if (input.discountAmountKrw > 0) {
    if (input.promotionNames?.length) {
      lines.push({
        entryType: "PROMOTION",
        label: `Promotion · ${input.promotionNames.join(", ")}`,
        amountKrw: input.discountAmountKrw,
      });
    }
    if (input.couponApplied) {
      lines.push({
        entryType: "COUPON",
        label: "Coupon 할인",
        amountKrw: 0, // 상세는 steps에서 — 합산 중복 방지용 마커
      });
    }
  }
  lines.push({
    entryType: "NET_PAYOUT",
    label: "최종 지급",
    amountKrw: input.sellerAmountKrw,
  });

  for (const line of lines) {
    if (line.entryType === "COUPON" && line.amountKrw === 0) continue;
    await appendSettlementLedger({
      settlementId: input.settlementId,
      userId: input.userId,
      entryType: line.entryType,
      label: line.label,
      amountKrw: line.amountKrw,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    });
  }
}
