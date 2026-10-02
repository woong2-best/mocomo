export type AptWalletCurrency = "gold" | "gems";

export type AptWalletTransactionType =
  | "purchase"
  | "mission"
  | "live"
  | "market"
  | "flea"
  | "admin"
  | "exchange"
  | "shop"
  | "refund"
  | "event";

export type AptShopProductType = "gems" | "gold" | "bundle";

export type AptIapProvider = "google_play" | "app_store";

export type AptShopProductDto = {
  id: string;
  slug: string;
  productId: string;
  type: AptShopProductType;
  amount: number;
  bonusAmount: number;
  priceTier: number;
  title: string;
  description: string | null;
};

export type AptEconomyConfigDto = import("./economy-config-types").AptEconomyConfigDto;
