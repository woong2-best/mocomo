import type { PurchaseProvider, PurchaseProviderId } from "./types";
import { GooglePlayBillingProvider } from "./providers/google-play-billing-provider";
import { AppStoreBillingProvider } from "./providers/app-store-billing-provider";
import { WebPurchaseProvider } from "./providers/web-purchase-provider";

export class PurchaseService {
  constructor(private readonly provider: PurchaseProvider) {}

  get providerId(): PurchaseProviderId {
    return this.provider.id;
  }

  isAvailable() {
    return this.provider.isAvailable();
  }

  getProducts(productIds: string[]) {
    return this.provider.getProducts(productIds);
  }

  purchase(productId: string) {
    return this.provider.purchase(productId);
  }

  restorePurchases() {
    return this.provider.restorePurchases();
  }
}

export function resolvePurchaseProvider(platform: "web" | "app", os?: string): PurchaseProvider {
  if (platform === "app") {
    if (os === "ios") return new AppStoreBillingProvider();
    return new GooglePlayBillingProvider();
  }
  return new WebPurchaseProvider();
}

export function createPurchaseService(platform: "web" | "app", os?: string): PurchaseService {
  return new PurchaseService(resolvePurchaseProvider(platform, os));
}

export async function detectPurchaseOs(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const cap = (window as Window & {
    Capacitor?: { getPlatform?: () => string };
  }).Capacitor;
  return cap?.getPlatform?.();
}

export async function createPurchaseServiceForClient(
  isNativeApp: boolean
): Promise<PurchaseService> {
  const os = await detectPurchaseOs();
  return createPurchaseService(isNativeApp ? "app" : "web", os);
}
