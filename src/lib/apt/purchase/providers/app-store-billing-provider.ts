import type { PurchaseProvider, PurchaseProviderProduct, PurchaseResult } from "../types";

/** App Store — Phase 2 스텁 (추후 StoreKit 연동) */
export class AppStoreBillingProvider implements PurchaseProvider {
  readonly id = "app_store" as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getProducts(_productIds: string[]): Promise<PurchaseProviderProduct[]> {
    return [];
  }

  async purchase(_productId: string): Promise<PurchaseResult> {
    throw new Error("App Store 결제는 준비 중입니다.");
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    return [];
  }
}
