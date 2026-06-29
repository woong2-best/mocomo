export type IapPurchaseStatus =
  | "PENDING"
  | "VERIFIED"
  | "FULFILLED"
  | "ACKED"
  | "REFUNDED"
  | "VOIDED"
  | "FAILED";

export type IapAckState = "PENDING" | "ACKED" | "FAILED";

export type IapRetryStep = "verify" | "fulfill" | "ack";

export type GooglePurchaseDetails = {
  orderId: string;
  purchaseState: number;
  acknowledgementState: number;
  consumptionState?: number;
  priceMicros?: number;
  currency?: string;
  regionCode?: string;
  purchaseTimeMillis?: string;
  raw: Record<string, unknown>;
};

export type IapVerifyRequest = {
  purchaseToken: string;
  productId: string;
  packageName?: string;
};

export type IapFulfillInput = {
  provider: "google_play" | "app_store";
  productId: string;
  purchaseToken: string;
  orderId?: string;
  packageName?: string;
};

export type IapFulfillResult =
  | {
      ok: true;
      purchaseId: string;
      gemsGranted: number;
      goldGranted: number;
      orderId: string;
      correlationId: string;
    }
  | { ok: true; alreadyFulfilled: true; orderId: string; correlationId?: string }
  | { error: string };
