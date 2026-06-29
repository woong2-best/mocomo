import type { PurchaseProvider, PurchaseProviderProduct, PurchaseResult } from "../types";

/** 웹 — IAP 미지원 (결제는 앱 전용) */
export class WebPurchaseProvider implements PurchaseProvider {
  readonly id = "web" as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getProducts(_productIds: string[]): Promise<PurchaseProviderProduct[]> {
    return [];
  }

  async purchase(_productId: string): Promise<PurchaseResult> {
    throw new Error("인앱 결제는 Android/iOS 앱에서만 이용할 수 있습니다.");
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    return [];
  }
}
