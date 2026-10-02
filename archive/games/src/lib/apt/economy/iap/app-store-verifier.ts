import { iapDevVerifyEnabled } from "./iap-dev-verify";

export type AppStorePurchaseDetails = {
  orderId: string;
  productId: string;
  purchaseState: number;
  acknowledgementState: number;
  raw: Record<string, unknown>;
};

export type AppStoreVerifyInput = {
  productId: string;
  purchaseToken: string;
  orderId?: string;
  receipt?: string;
};

export type AppStoreVerifyResult =
  | { ok: true; details: AppStorePurchaseDetails }
  | { ok: false; error: string };

type AppleVerifyReceiptResponse = {
  status: number;
  receipt?: {
    in_app?: {
      product_id?: string;
      transaction_id?: string;
      original_transaction_id?: string;
    }[];
  };
  latest_receipt_info?: {
    product_id?: string;
    transaction_id?: string;
    original_transaction_id?: string;
  }[];
};

async function verifyWithAppleApi(input: AppStoreVerifyInput): Promise<AppStoreVerifyResult> {
  const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET;
  const receipt = input.receipt?.trim();
  if (!sharedSecret || !receipt) {
    return {
      ok: false,
      error: "App Store 서버 검증이 설정되지 않았습니다. (APPLE_IAP_SHARED_SECRET)",
    };
  }

  const body = JSON.stringify({
    "receipt-data": receipt,
    password: sharedSecret,
    "exclude-old-transactions": true,
  });

  const endpoints = [
    "https://buy.itunes.apple.com/verifyReceipt",
    "https://sandbox.itunes.apple.com/verifyReceipt",
  ];

  let lastStatus = -1;
  for (const url of endpoints) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) continue;
    const data = (await res.json()) as AppleVerifyReceiptResponse;
    lastStatus = data.status;
    if (data.status === 21007) continue;
    if (data.status !== 0) {
      return { ok: false, error: `App Store 영수증 검증 실패 (${data.status})` };
    }

    const items = [
      ...(data.latest_receipt_info ?? []),
      ...(data.receipt?.in_app ?? []),
    ];
    const match = items.find(
      (item) =>
        item.product_id === input.productId &&
        (item.transaction_id === input.purchaseToken ||
          item.original_transaction_id === input.purchaseToken)
    );
    if (!match && items.length > 0) {
      return { ok: false, error: "영수증에서 해당 구매를 찾을 수 없습니다." };
    }

    const orderId =
      match?.transaction_id ??
      input.orderId ??
      input.purchaseToken;

    return {
      ok: true,
      details: {
        orderId,
        productId: input.productId,
        purchaseState: 0,
        acknowledgementState: 1,
        raw: data as unknown as Record<string, unknown>,
      },
    };
  }

  return {
    ok: false,
    error: `App Store 영수증 검증 실패 (${lastStatus})`,
  };
}

/** App Store 인앱 상품 서버 검증 */
export async function verifyAppStorePurchase(
  input: AppStoreVerifyInput
): Promise<AppStoreVerifyResult> {
  if (iapDevVerifyEnabled() && input.purchaseToken.startsWith("dev:")) {
    return {
      ok: true,
      details: {
        orderId: input.orderId ?? (input.purchaseToken.slice(4) || `dev-ios-${Date.now()}`),
        productId: input.productId,
        purchaseState: 0,
        acknowledgementState: 1,
        raw: { dev: true, platform: "ios" },
      },
    };
  }

  if (input.receipt) {
    return verifyWithAppleApi(input);
  }

  if (process.env.APPLE_IAP_TRUST_TRANSACTION_ID === "true") {
    const orderId = input.orderId ?? input.purchaseToken;
    return {
      ok: true,
      details: {
        orderId,
        productId: input.productId,
        purchaseState: 0,
        acknowledgementState: 1,
        raw: { trustedTransactionId: true },
      },
    };
  }

  return {
    ok: false,
    error: "App Store 영수증이 필요합니다. 앱을 최신 버전으로 업데이트해 주세요.",
  };
}
