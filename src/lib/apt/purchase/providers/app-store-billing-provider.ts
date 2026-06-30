import { NativePurchases, PURCHASE_TYPE, type Transaction } from "@capgo/native-purchases";
import type { PurchaseProvider, PurchaseProviderProduct, PurchaseResult } from "../types";

function transactionToResult(tx: Transaction): PurchaseResult {
  const purchaseToken = tx.purchaseToken ?? tx.transactionId;
  const orderId = tx.orderId ?? tx.transactionId;
  if (!purchaseToken || !orderId) {
    throw new Error("결제 응답이 올바르지 않습니다.");
  }
  return {
    provider: "app_store",
    productId: tx.productIdentifier,
    orderId,
    purchaseToken,
    receipt: tx.receipt,
  };
}

/** App Store — @capgo/native-purchases (StoreKit) */
export class AppStoreBillingProvider implements PurchaseProvider {
  readonly id = "app_store" as const;

  async isAvailable(): Promise<boolean> {
    try {
      const res = await NativePurchases.isBillingSupported();
      return !!res.isBillingSupported;
    } catch {
      return false;
    }
  }

  async getProducts(productIds: string[]): Promise<PurchaseProviderProduct[]> {
    if (productIds.length === 0) return [];
    const res = await NativePurchases.getProducts({
      productIdentifiers: productIds,
      productType: PURCHASE_TYPE.INAPP,
    });
    return (res.products ?? []).map((p) => ({
      productId: p.identifier,
      title: p.title,
      description: p.description,
      price: p.priceString,
      currencyCode: p.currencyCode,
    }));
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    const supported = await this.isAvailable();
    if (!supported) {
      throw new Error("이 기기에서 결제를 사용할 수 없습니다.");
    }

    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
    });

    return transactionToResult(tx);
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    try {
      await NativePurchases.restorePurchases();
    } catch {
      /* no-op */
    }
    return [];
  }
}
