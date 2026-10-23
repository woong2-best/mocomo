import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { InsufficientGemsBalanceError, consumeGemPurchaseCenti } from "@/lib/gems/fifo";
import { creditSettlementMocoCentiInTx } from "@/lib/settlement-moco/economy";
import { splitCenti } from "@/lib/moco-donation/video-pricing";
import { formatQnaBountyMoco } from "@/lib/qna-bounty-format";

export {
  QNA_BOUNTY_DEFAULT_CENTI,
  QNA_BOUNTY_MAX_CENTI,
  QNA_BOUNTY_STEP_CENTI,
  formatQnaBountyMoco,
  parseQnaBountyInput,
} from "@/lib/qna-bounty-format";

type Tx = Prisma.TransactionClient;

function purchasedWalletCenti(wallet: {
  mocoPoints: number;
  mocoPointsTenths: number;
  mocoPointsHundredths: number;
}): number {
  return wallet.mocoPoints * 100 + wallet.mocoPointsTenths * 10 + wallet.mocoPointsHundredths;
}

function splitPurchasedCenti(total: number) {
  const safe = Math.max(0, Math.trunc(total));
  return {
    mocoPoints: Math.floor(safe / 100),
    mocoPointsTenths: Math.floor((safe % 100) / 10),
    mocoPointsHundredths: safe % 10,
  };
}

async function recordQnaHistory(
  tx: Tx,
  input: {
    userId: string;
    centi: number;
    type: "QNA_BOUNTY" | "QNA_BOUNTY_PAYOUT" | "QNA_BOUNTY_REFUND";
    reason: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }
) {
  const existing = await tx.mocoTransactionHistory.findUnique({
    where: { type_referenceId: { type: input.type, referenceId: input.referenceId } },
  });
  if (existing) return false;
  const signed = input.centi;
  const whole = Math.trunc(signed / 100);
  const rem = Math.abs(signed % 100);
  const tenths = Math.trunc(rem / 10) * (signed < 0 ? -1 : 1);
  const hundredths = (rem % 10) * (signed < 0 ? -1 : 1);
  await tx.mocoTransactionHistory.create({
    data: {
      userId: input.userId,
      amount: whole,
      amountTenths: tenths,
      amountHundredths: hundredths,
      type: input.type,
      reason: input.reason,
      referenceId: input.referenceId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  return true;
}

async function debitPurchasedMocoCenti(
  tx: Tx,
  input: {
    userId: string;
    centi: number;
    reason: string;
    referenceType: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (input.centi <= 0) return;

  const wallet =
    (await tx.platformWallet.findUnique({ where: { userId: input.userId } })) ??
    (await tx.platformWallet.create({ data: { userId: input.userId } }));

  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: {
      gemBalance: true,
      gemBalanceTenths: true,
      gemBalanceHundredths: true,
    },
  });
  const gemsCenti =
    (user?.gemBalance ?? 0) * 100 +
    (user?.gemBalanceTenths ?? 0) * 10 +
    (user?.gemBalanceHundredths ?? 0);
  const pointsCenti = purchasedWalletCenti(wallet);
  if (gemsCenti + pointsCenti < input.centi) {
    throw new Error("INSUFFICIENT_MOCO");
  }

  const fromGems = Math.min(gemsCenti, input.centi);
  const fromPoints = input.centi - fromGems;

  if (fromGems > 0) {
    try {
      await consumeGemPurchaseCenti(tx, input.userId, fromGems);
    } catch (err) {
      if (err instanceof InsufficientGemsBalanceError) throw new Error("INSUFFICIENT_MOCO");
      throw err;
    }
  }

  if (fromPoints > 0) {
    const next = pointsCenti - fromPoints;
    if (next < 0) throw new Error("INSUFFICIENT_MOCO");
    const parts = splitPurchasedCenti(next);
    const moved = await tx.platformWallet.updateMany({
      where: {
        id: wallet.id,
        mocoPoints: wallet.mocoPoints,
        mocoPointsTenths: wallet.mocoPointsTenths,
        mocoPointsHundredths: wallet.mocoPointsHundredths,
      },
      data: parts,
    });
    if (moved.count === 0) throw new Error("INSUFFICIENT_MOCO");
    const spent = splitCenti(fromPoints);
    await tx.platformWalletLedger.create({
      data: {
        walletId: wallet.id,
        bucket: "MOCO_POINTS",
        delta: -spent.whole,
        deltaTenths: -spent.tenths,
        deltaHundredths: -spent.hundredths,
        balanceAfter: parts.mocoPoints,
        balanceAfterTenths: parts.mocoPointsTenths,
        balanceAfterHundredths: parts.mocoPointsHundredths,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

async function creditPurchasedMocoCenti(
  tx: Tx,
  input: {
    userId: string;
    centi: number;
    reason: string;
    referenceType: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (input.centi <= 0) return;
  const wallet =
    (await tx.platformWallet.findUnique({ where: { userId: input.userId } })) ??
    (await tx.platformWallet.create({ data: { userId: input.userId } }));
  const next = purchasedWalletCenti(wallet) + input.centi;
  const parts = splitPurchasedCenti(next);
  await tx.platformWallet.update({
    where: { id: wallet.id },
    data: parts,
  });
  const delta = splitCenti(input.centi);
  await tx.platformWalletLedger.create({
    data: {
      walletId: wallet.id,
      bucket: "MOCO_POINTS",
      delta: delta.whole,
      deltaTenths: delta.tenths,
      deltaHundredths: delta.hundredths,
      balanceAfter: parts.mocoPoints,
      balanceAfterTenths: parts.mocoPointsTenths,
      balanceAfterHundredths: parts.mocoPointsHundredths,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function escrowQnaBountyInTx(
  tx: Tx,
  input: { userId: string; postId: string; centi: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.centi <= 0) return { ok: true };
  try {
    await debitPurchasedMocoCenti(tx, {
      userId: input.userId,
      centi: input.centi,
      reason: "QnA bounty",
      referenceType: "qna_bounty",
      referenceId: input.postId,
      metadata: { postId: input.postId, centi: input.centi },
    });
    await recordQnaHistory(tx, {
      userId: input.userId,
      centi: -input.centi,
      type: "QNA_BOUNTY",
      reason: "QnA bounty attached",
      referenceId: input.postId,
      metadata: { postId: input.postId, centi: input.centi },
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_MOCO") {
      return { ok: false, error: "Insufficient MOCO balance." };
    }
    throw e;
  }
}

export async function refundQnaBountyInTx(
  tx: Tx,
  input: { userId: string; postId: string; centi: number }
) {
  if (input.centi <= 0) return;
  await creditPurchasedMocoCenti(tx, {
    userId: input.userId,
    centi: input.centi,
    reason: "QnA bounty refund",
    referenceType: "qna_bounty_refund",
    referenceId: input.postId,
    metadata: { postId: input.postId, centi: input.centi },
  });
  await recordQnaHistory(tx, {
    userId: input.userId,
    centi: input.centi,
    type: "QNA_BOUNTY_REFUND",
    reason: "QnA bounty refunded",
    referenceId: `${input.postId}:refund`,
    metadata: { postId: input.postId, centi: input.centi },
  });
}

export async function acceptQnaAnswer(input: {
  actorId: string;
  postId: string;
  commentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { assertMoneyAgeAllowed } = await import("@/lib/money-age-gate");

  try {
    const result = await db.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: input.postId },
        select: {
          id: true,
          authorId: true,
          communityId: true,
          qnaBountyCenti: true,
          acceptedCommentId: true,
          qnaBountySettledAt: true,
        },
      });
      if (!post?.communityId) return { ok: false as const, error: "This is not a QnA question." };
      if (post.authorId !== input.actorId) {
        return { ok: false as const, error: "Only the question author can select an answer." };
      }
      if (post.acceptedCommentId) {
        return { ok: false as const, error: "An answer is already selected." };
      }

      const comment = await tx.comment.findFirst({
        where: {
          id: input.commentId,
          postId: input.postId,
          parentId: null,
          deletedAt: null,
          hiddenAt: null,
        },
        select: { id: true, authorId: true },
      });
      if (!comment) return { ok: false as const, error: "Answer not found." };
      if (comment.authorId === post.authorId) {
        return { ok: false as const, error: "You cannot select your own answer." };
      }

      const now = new Date();
      const bounty = post.qnaBountyCenti;
      if (bounty > 0) {
        const ageBlock = await assertMoneyAgeAllowed(input.actorId);
        if (ageBlock) return { ok: false as const, error: ageBlock.error };
        await creditSettlementMocoCentiInTx(tx, {
          userId: comment.authorId,
          centi: bounty,
          reason: "QnA accepted answer",
          referenceType: "qna_bounty_payout",
          referenceId: post.id,
          metadata: { postId: post.id, commentId: comment.id, askerId: post.authorId },
        });
        await recordQnaHistory(tx, {
          userId: comment.authorId,
          centi: bounty,
          type: "QNA_BOUNTY_PAYOUT",
          reason: "QnA accepted answer",
          referenceId: `${post.id}:payout`,
          metadata: { postId: post.id, commentId: comment.id },
        });
      }

      await tx.post.update({
        where: { id: post.id },
        data: {
          acceptedCommentId: comment.id,
          qnaBountySettledAt: bounty > 0 ? now : post.qnaBountySettledAt,
        },
      });
      await tx.comment.update({
        where: { id: comment.id },
        data: { acceptedAt: now },
      });

      return { ok: true as const, answerAuthorId: comment.authorId, bounty };
    });

    if (!result.ok) return result;

    if (result.answerAuthorId) {
      const { createNotification } = await import("@/lib/notifications");
      void createNotification({
        userId: result.answerAuthorId,
        actorId: input.actorId,
        type: "qna_answer_accepted",
        title: "QnA answer selected",
        body:
          result.bounty > 0
            ? `Your answer was selected. You received ${formatQnaBountyMoco(result.bounty)} MOCO.`
            : "Your answer was selected by the question author.",
        link: `/post/${input.postId}#comment-${input.commentId}`,
      });
    }

    return { ok: true };
  } catch (e) {
    console.error("[acceptQnaAnswer]", e instanceof Error ? e.name : "error");
    return { ok: false, error: "Could not select that answer. Please try again." };
  }
}

export async function refundUnsettledQnaBounty(postId: string) {
  await db.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        qnaBountyCenti: true,
        acceptedCommentId: true,
        qnaBountySettledAt: true,
      },
    });
    if (!post || post.qnaBountyCenti <= 0 || post.acceptedCommentId || post.qnaBountySettledAt) {
      return;
    }
    await refundQnaBountyInTx(tx, {
      userId: post.authorId,
      postId: post.id,
      centi: post.qnaBountyCenti,
    });
    await tx.post.update({
      where: { id: post.id },
      data: { qnaBountySettledAt: new Date(), qnaBountyCenti: 0 },
    });
  });
}
