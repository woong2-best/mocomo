export type PurchaseProviderId = "google_play" | "app_store" | "web";

export type PurchaseResult = {
  provider: PurchaseProviderId;
  productId: string;
  orderId: string;
  purchaseToken: string;
  /** iOS 영수증 — 추후 App Store 검증용 */
  receipt?: string;
};

export type PurchaseProviderProduct = {
  productId: string;
  title: string;
  description: string;
  price: string;
  currencyCode?: string;
};

export interface PurchaseProvider {
  readonly id: PurchaseProviderId;
  isAvailable(): Promise<boolean>;
  getProducts(productIds: string[]): Promise<PurchaseProviderProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult[]>;
}
