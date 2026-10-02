import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { ensureEconomyMigrated } from "./service";
import { assertMissionEnabled } from "./economy-emergency";
import type { AptWalletCurrency, AptWalletTransactionType } from "./wallet-types";
import { readWalletBalances, writeEconomyLog } from "./economy-log-service";

type WalletMutationInput = {
  userId: string;
  currency: AptWalletCurrency;
  amount: number;
  type: AptWalletTransactionType;
  referenceId?: string;
  referenceType?: string;
  correlationId?: string;
  memo?: string;
  /** true면 동일 reference 중복 시 에러 대신 기존 balance 반환 */
  idempotent?: boolean;
};

type TxClient = Prisma.TransactionClient;

async function readBalance(
  tx: TxClient,
  userId: string,
  currency: AptWalletCurrency
): Promise<number> {
  const wallet = await tx.aptWallet.findUnique({ where: { userId } });
  if (!wallet) return 0;
  return currency === "gold" ? wallet.gold : wallet.gems;
}

async function writeBalance(
  tx: TxClient,
  userId: string,
  currency: AptWalletCurrency,
  balanceAfter: number
): Promise<void> {
  if (balanceAfter < 0) {
    throw new Error(
      currency === "gold" ? "골드가 부족합니다." : "젬이 부족합니다."
    );
  }
  await tx.aptWallet.update({
    where: { userId },
    data: currency === "gold" ? { gold: balanceAfter } : { gems: balanceAfter },
  });
}

export async function mutateWalletInTx(
  tx: TxClient,
  input: WalletMutationInput
): Promise<{ balanceAfter: number; skipped?: boolean }> {
  if (input.referenceId && input.referenceType) {
    const dup = await tx.aptWalletTransaction.findFirst({
      where: {
        userId: input.userId,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        currency: input.currency,
      },
    });
    if (dup) {
      if (input.idempotent) return { balanceAfter: dup.balanceAfter ?? 0, skipped: true };
      throw new Error("이미 처리된 지갑 요청입니다.");
    }
  }

  const before = await readWalletBalances(tx, input.userId);
  const current =
    input.currency === "gold" ? before.gold : before.gems;
  const next = current + input.amount;
  if (next < 0) {
    throw new Error(
      input.currency === "gold" ? "골드가 부족합니다." : "젬이 부족합니다."
    );
  }

  await writeBalance(tx, input.userId, input.currency, next);
  await tx.aptWalletTransaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      currency: input.currency,
      amount: input.amount,
      balanceAfter: next,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      correlationId: input.correlationId,
      memo: input.memo,
    },
  });

  const action =
    input.amount >= 0 ? `wallet_credit_${input.type}` : `wallet_debit_${input.type}`;
  await writeEconomyLog(tx, {
    userId: input.userId,
    action,
    deltaGold: input.currency === "gold" ? input.amount : 0,
    deltaGems: input.currency === "gems" ? input.amount : 0,
    goldBefore: before.gold,
    goldAfter: input.currency === "gold" ? next : before.gold,
    gemsBefore: before.gems,
    gemsAfter: input.currency === "gems" ? next : before.gems,
    reason: input.memo,
    referenceId: input.referenceId,
    referenceType: input.referenceType,
    correlationId: input.correlationId,
  });

  return { balanceAfter: next };
}

export async function creditWallet(
  input: WalletMutationInput
): Promise<{ balanceAfter: number }> {
  if (input.amount <= 0) throw new Error("credit amount must be positive");
  if (input.type === "mission") {
    await assertMissionEnabled();
  }
  await ensureEconomyMigrated(input.userId);
  return db.$transaction((tx) => mutateWalletInTx(tx, input));
}

export async function debitWallet(
  input: Omit<WalletMutationInput, "amount"> & { amount: number }
): Promise<{ balanceAfter: number }> {
  if (input.amount <= 0) throw new Error("debit amount must be positive");
  return creditWallet({ ...input, amount: -input.amount });
}

export async function transferWalletInTx(
  tx: TxClient,
  input: {
    userId: string;
    spend: { currency: AptWalletCurrency; amount: number };
    earn?: { currency: AptWalletCurrency; amount: number };
    type: AptWalletTransactionType;
    referenceId?: string;
    referenceType?: string;
    memo?: string;
  }
): Promise<void> {
  await mutateWalletInTx(tx, {
    userId: input.userId,
    currency: input.spend.currency,
    amount: -input.spend.amount,
    type: input.type,
    referenceId: input.referenceId,
    referenceType: input.referenceType,
    memo: input.memo,
  });
  if (input.earn && input.earn.amount > 0) {
    await mutateWalletInTx(tx, {
      userId: input.userId,
      currency: input.earn.currency,
      amount: input.earn.amount,
      type: input.type,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      memo: input.memo,
    });
  }
}
