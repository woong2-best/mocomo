import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { userDisplayName } from "@/lib/user-public-select";
import {
  formatCookieSerial,
  fortuneAt,
  pickFortuneIndex,
} from "@/lib/fortune-cookie/fortunes";

type Tx = Prisma.TransactionClient;

export type FortuneCookieDto = {
  id: string;
  serial: string;
  serialNo: number;
  nickname: string;
  fortuneText: string;
  theme: string;
  mocoQuantity: number;
  openedAt: string;
  createdAt: string;
};

function toDto(row: {
  id: string;
  serialNo: number;
  nickname: string;
  fortuneText: string;
  theme: string;
  mocoQuantity: number;
  openedAt: Date;
  createdAt: Date;
}): FortuneCookieDto {
  return {
    id: row.id,
    serial: formatCookieSerial(row.serialNo),
    serialNo: row.serialNo,
    nickname: row.nickname,
    fortuneText: row.fortuneText,
    theme: row.theme,
    mocoQuantity: row.mocoQuantity,
    openedAt: row.openedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** 결제 충전 1건당 포춘쿠키 1개 — 결제 완료 즉시 자동 개봉, idempotent */
export async function registerFortuneCookie(
  tx: Tx,
  input: {
    userId: string;
    gemPurchaseId: string;
    stripePaymentIntentId: string;
    mocoQuantity: number;
  }
): Promise<FortuneCookieDto | null> {
  const existing = await tx.mocoFortuneCookie.findFirst({
    where: {
      OR: [
        { gemPurchaseId: input.gemPurchaseId },
        { stripePaymentIntentId: input.stripePaymentIntentId },
      ],
    },
  });
  if (existing) return toDto(existing);

  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, username: true, name: true, deletedAt: true },
  });
  if (!user) return null;

  const fortuneIndex = pickFortuneIndex(input.gemPurchaseId || input.stripePaymentIntentId);
  const fortune = fortuneAt(fortuneIndex);
  const created = await tx.mocoFortuneCookie.create({
    data: {
      userId: user.id,
      gemPurchaseId: input.gemPurchaseId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      nickname: userDisplayName(user),
      fortuneText: fortune.text,
      fortuneIndex,
      theme: fortune.theme,
      mocoQuantity: input.mocoQuantity,
    },
  });
  return toDto(created);
}

export async function hideFortuneCookieForPurchase(gemPurchaseId: string): Promise<void> {
  await db.mocoFortuneCookie.deleteMany({ where: { gemPurchaseId } });
}

export async function listMyFortuneCookies(
  userId: string,
  input?: { cursor?: string; limit?: number }
): Promise<{ cookies: FortuneCookieDto[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(input?.limit ?? 40, 1), 100);
  const rows = await db.mocoFortuneCookie.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    cookies: page.map(toDto),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getLatestFortuneCookieForUser(
  userId: string
): Promise<FortuneCookieDto | null> {
  const row = await db.mocoFortuneCookie.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return row ? toDto(row) : null;
}

export async function getFortuneCookieForUser(
  userId: string,
  cookieId: string
): Promise<FortuneCookieDto | null> {
  const row = await db.mocoFortuneCookie.findFirst({
    where: { id: cookieId, userId },
  });
  return row ? toDto(row) : null;
}
