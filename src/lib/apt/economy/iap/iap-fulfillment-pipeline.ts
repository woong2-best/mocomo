import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { newCorrelationId } from "../audit/correlation-id";
import { assertIapEnabled } from "../economy-emergency";
import { writeEconomyLog } from "../economy-log-service";
import { recordHealthDomainEvent } from "../health/health-metrics";
import { notifyIapAckErrorAdmin, notifyIapPurchase } from "../notification/economy-notify";
import { findShopProductByProductId } from "../shop-product-service";
import { loadEconomySnapshot } from "../service";
import { mutateWalletInTx } from "../wallet-service";
import type { AptShopProductDto } from "../wallet-types";
import { verifyAppStorePurchase } from "./app-store-verifier";
import {
  acknowledgeGooglePlayPurchase,
  verifyGooglePlayPurchase,
} from "./google-play-verifier";
import { checkIapFraudBeforeFulfill } from "./iap-fraud-guard";
import { enqueueIapRetry } from "./iap-retry-service";
import type { GooglePurchaseDetails, IapFulfillInput, IapFulfillResult, IapRetryStep } from "./iap-types";

function grantAmounts(product: AptShopProductDto): { gems: number; gold: number } {
  if (product.type === "gems") {
    return { gems: product.amount + product.bonusAmount, gold: 0 };
  }
  if (product.type === "gold") {
    return { gems: 0, gold: product.amount + product.bonusAmount };
  }
  if (product.type === "bundle") {
    return { gems: product.amount, gold: product.bonusAmount };
  }
  return { gems: 0, gold: 0 };
}

export async function fulfillIapPurchase(
  userId: string,
  input: IapFulfillInput
): Promise<IapFulfillResult> {
  const ownerId = await resolveAptHomeOwnerId(userId);

  try {
    await assertIapEnabled();
  } catch (e) {
    void recordHealthDomainEvent("iap", "verifyFail", 1);
    return { error: e instanceof Error ? e.message : "결제를 처리할 수 없습니다." };
  }

  const fraudCheck = await checkIapFraudBeforeFulfill(ownerId, input.purchaseToken);
  if ("error" in fraudCheck) {
    void recordHealthDomainEvent("iap", "verifyFail", 1);
    return fraudCheck;
  }

  const existingToken = await db.aptIapPurchase.findUnique({
    where: { purchaseToken: input.purchaseToken },
  });
  if (existingToken) {
    if (existingToken.status === "ACKED" || existingToken.status === "FULFILLED") {
      return {
        ok: true,
        alreadyFulfilled: true,
        orderId: existingToken.orderId,
        correlationId: existingToken.correlationId ?? undefined,
      };
    }
    if (existingToken.status === "VERIFIED" || existingToken.status === "PENDING") {
      return continueFulfillment(existingToken.id, input);
    }
  }

  const product = await findShopProductByProductId(input.productId);
  if (!product) {
    void recordHealthDomainEvent("iap", "verifyFail", 1);
    return { error: "등록되지 않은 상품입니다." };
  }

  const isGoogle = input.provider === "google_play";
  const verified = isGoogle
    ? await verifyGooglePlayPurchase({
        productId: input.productId,
        purchaseToken: input.purchaseToken,
        packageName: input.packageName,
      })
    : await verifyAppStorePurchase({
        productId: input.productId,
        purchaseToken: input.purchaseToken,
        orderId: input.orderId,
        receipt: input.receipt,
      });
  if (!verified.ok) {
    void recordHealthDomainEvent("iap", "verifyFail", 1);
    return { error: verified.error };
  }

  const orderId = verified.details.orderId;
  const dupOrder = await db.aptIapPurchase.findUnique({ where: { orderId } });
  if (dupOrder) {
    return {
      ok: true,
      alreadyFulfilled: true,
      orderId,
      correlationId: dupOrder.correlationId ?? undefined,
    };
  }

  const corrId = newCorrelationId();
  const googleDetails = isGoogle
    ? (verified.details as GooglePurchaseDetails)
    : null;
  const ackState = isGoogle
    ? googleDetails!.acknowledgementState === 1
      ? "ACKED"
      : "PENDING"
    : "ACKED";
  const purchase = await db.aptIapPurchase.create({
    data: {
      userId: ownerId,
      shopProductId: product.slug,
      platform: isGoogle ? "android" : "ios",
      provider: input.provider,
      orderId,
      purchaseToken: input.purchaseToken,
      productId: input.productId,
      purchaseState: verified.details.purchaseState,
      ackState,
      priceMicros: googleDetails?.priceMicros ?? null,
      currency: googleDetails?.currency ?? null,
      regionCode: googleDetails?.regionCode ?? null,
      payload: verified.details.raw as Prisma.InputJsonValue,
      status: "VERIFIED",
      verifiedAt: new Date(),
      correlationId: corrId,
    },
  });

  return continueFulfillment(purchase.id, input, product, corrId);
}

async function continueFulfillment(
  purchaseId: string,
  input: IapFulfillInput,
  product?: AptShopProductDto | null,
  correlationId?: string
): Promise<IapFulfillResult> {
  const purchase = await db.aptIapPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return { error: "구매 기록을 찾을 수 없습니다." };

  if (purchase.status === "ACKED") {
    return {
      ok: true,
      alreadyFulfilled: true,
      orderId: purchase.orderId,
      correlationId: purchase.correlationId ?? undefined,
    };
  }

  const prod =
    product ?? (await findShopProductByProductId(purchase.productId));
  if (!prod) return { error: "등록되지 않은 상품입니다." };

  const corrId = correlationId ?? purchase.correlationId ?? newCorrelationId();
  const { gems, gold } = grantAmounts(prod);

  if (purchase.status === "VERIFIED" || purchase.status === "PENDING") {
    try {
      await db.$transaction(async (tx) => {
        if (gems > 0) {
          await mutateWalletInTx(tx, {
            userId: purchase.userId,
            currency: "gems",
            amount: gems,
            type: "purchase",
            referenceId: purchase.orderId,
            referenceType: "AptIapPurchase",
            correlationId: corrId,
            memo: prod.title,
          });
        }
        if (gold > 0) {
          await mutateWalletInTx(tx, {
            userId: purchase.userId,
            currency: "gold",
            amount: gold,
            type: "purchase",
            referenceId: purchase.orderId,
            referenceType: "AptIapPurchase",
            correlationId: corrId,
            memo: prod.title,
          });
        }

        await writeEconomyLog(tx, {
          userId: purchase.userId,
          action: "wallet_credit_purchase",
          deltaGems: gems,
          deltaGold: gold,
          reason: prod.title,
          referenceId: purchase.id,
          referenceType: "AptIapPurchase",
          correlationId: corrId,
        });

        await tx.aptIapPurchase.update({
          where: { id: purchase.id },
          data: {
            status: "FULFILLED",
            gemsGranted: gems,
            goldGranted: gold,
            fulfilledAt: new Date(),
            correlationId: corrId,
          },
        });
      });
    } catch (e) {
      void recordHealthDomainEvent("iap", "fulfillFail", 1);
      await enqueueIapRetry(purchase.id, "fulfill", e instanceof Error ? e.message : "fulfill failed");
      return { error: "지급 처리에 실패했습니다. 잠시 후 자동 재시도됩니다." };
    }
  }

  if (purchase.provider === "google_play" && purchase.ackState !== "ACKED") {
    const ack = await acknowledgeGooglePlayPurchase({
      productId: purchase.productId,
      purchaseToken: purchase.purchaseToken,
      packageName: input.packageName,
    });
    if (!ack.ok) {
      void recordHealthDomainEvent("iap", "ackFail", 1);
      await enqueueIapRetry(purchase.id, "ack", ack.error);
      notifyIapAckErrorAdmin({
        orderId: purchase.orderId,
        error: ack.error,
        correlationId: corrId,
      });
    } else {
      await db.aptIapPurchase.update({
        where: { id: purchase.id },
        data: { status: "ACKED", ackState: "ACKED" },
      });
    }
  } else if (purchase.status !== "ACKED") {
    await db.aptIapPurchase.update({
      where: { id: purchase.id },
      data: { status: "ACKED", ackState: "ACKED" },
    });
  }

  notifyIapPurchase({
    userId: purchase.userId,
    productTitle: prod.title,
    gemsGranted: gems || purchase.gemsGranted,
    goldGranted: gold || purchase.goldGranted,
    correlationId: corrId,
  });

  void loadEconomySnapshot(purchase.userId);

  return {
    ok: true,
    purchaseId: purchase.id,
    gemsGranted: gems || purchase.gemsGranted,
    goldGranted: gold || purchase.goldGranted,
    orderId: purchase.orderId,
    correlationId: corrId,
  };
}

export async function retryIapStep(purchaseId: string, step: IapRetryStep): Promise<boolean> {
  const purchase = await db.aptIapPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return false;

  if (step === "ack") {
    const ack = await acknowledgeGooglePlayPurchase({
      productId: purchase.productId,
      purchaseToken: purchase.purchaseToken,
    });
    if (!ack.ok) return false;
    await db.aptIapPurchase.update({
      where: { id: purchaseId },
      data: { status: "ACKED", ackState: "ACKED" },
    });
    return true;
  }

  if (step === "fulfill") {
    const res = await continueFulfillment(purchaseId, {
      provider: purchase.provider as "google_play" | "app_store",
      productId: purchase.productId,
      purchaseToken: purchase.purchaseToken,
    });
    return !("error" in res);
  }

  return false;
}
