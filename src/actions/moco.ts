"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createStripeCheckout } from "@/actions/monetization";
import {
  findMocoTopupPackage,
  mocoToKrw,
  MOCO_TOPUP_PACKAGES,
} from "@/lib/moco/economy";
import {
  debitPlatformWallet,
  getOrCreatePlatformWallet,
} from "@/lib/platform/wallet/service";
import { db } from "@/lib/db";
import {
  creditSellerEarning,
  recordPlatformFee,
  splitPlatformFee,
} from "@/lib/settlement";
import { notifyTip } from "@/lib/notifications";

export async function listMocoTopupPackages() {
  return MOCO_TOPUP_PACKAGES.map((p) => ({ ...p }));
}

/** Stripe로 모코 충전 (실환전 아님 — 사이트 표시용) */
export async function createMocoTopupCheckout(mocoAmount: number) {
  const pack = findMocoTopupPackage(mocoAmount);
  if (!pack) {
    return { error: "지원하지 않는 충전 패키지입니다." };
  }

  return createStripeCheckout({
    type: "MOCO_TOPUP",
    amount: pack.krw,
    orderName: `MoCoMo ${pack.label} 충전`,
    metadata: {
      mocoAmount: pack.moco,
      krwPerMoco: 10,
    },
  });
}

/**
 * 모코로 후원 — 모코 차감 후 Tip(KRW 환산) + 10% 수수료 정산.
 * 임베드 플레이어와 무관, 사이트 알림만.
 */
export async function tipWithMoco(input: {
  receiverId: string;
  mocoAmount: number;
  message?: string;
  channelId?: string;
}) {
  const user = await requireAuth();
  const moco = Math.floor(input.mocoAmount);
  if (moco < 10) return { error: "최소 10모코부터 후원할 수 있습니다." };
  if (moco > 1_000_000) return { error: "1회 후원 한도를 초과했습니다." };
  if (!input.receiverId || input.receiverId === user.id) {
    return { error: "유효하지 않은 후원 대상입니다." };
  }

  const krw = mocoToKrw(moco);
  const refId = `moco-tip-${user.id}-${Date.now()}`;

  const debit = await debitPlatformWallet({
    userId: user.id,
    bucket: "MOCO_POINTS",
    amount: moco,
    reason: "MOCO_TIP",
    referenceType: "moco_tip",
    referenceId: refId,
    metadata: {
      receiverId: input.receiverId,
      channelId: input.channelId,
      krw,
    },
  });
  if (!debit.ok) return { error: debit.error };

  const { platformFee, sellerAmount } = splitPlatformFee(krw);

  const tip = await db.tip.create({
    data: {
      senderId: user.id,
      receiverId: input.receiverId,
      amount: krw,
      platformFee,
      message: input.message?.trim().slice(0, 200) || null,
      channelId: input.channelId?.trim() || null,
    },
  });

  await recordPlatformFee(platformFee, {
    referenceType: "moco_tip",
    referenceId: tip.id,
  });
  await creditSellerEarning(input.receiverId, sellerAmount, {
    referenceType: "moco_tip",
    referenceId: tip.id,
  });

  await db.user.update({
    where: { id: input.receiverId },
    data: { totalSupportReceived: { increment: krw } },
  });

  try {
    const receiver = await db.user.findUnique({
      where: { id: input.receiverId },
      select: { username: true },
    });
    await notifyTip(
      input.receiverId,
      user.id,
      krw,
      receiver?.username ?? "creator"
    );
  } catch {
    /* optional */
  }

  revalidatePath("/wallet");
  revalidatePath("/support");
  if (input.channelId) revalidatePath(`/voice/${input.channelId}`);

  const wallet = await getOrCreatePlatformWallet(user.id);
  return { ok: true as const, tipId: tip.id, krw, mocoBalance: wallet.mocoPoints };
}
