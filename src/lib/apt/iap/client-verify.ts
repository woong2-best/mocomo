import type { EconomySnapshot } from "@/lib/apt/economy/types";
import type { PurchaseProviderId } from "@/lib/apt/purchase/types";

export type IapVerifyApiResponse =
  | {
      ok: true;
      orderId: string;
      purchaseId?: string;
      gemsGranted: number;
      goldGranted: number;
      correlationId: string;
      economy: EconomySnapshot;
      alreadyFulfilled?: boolean;
    }
  | { error: string };

/** Client → Server verify (Wallet 지급은 서버만) */
export async function verifyIapOnServer(input: {
  provider: PurchaseProviderId;
  purchaseToken: string;
  productId: string;
  packageName?: string;
  orderId?: string;
  receipt?: string;
}): Promise<IapVerifyApiResponse> {
  if (input.provider === "web") {
    return { error: "웹에서는 인앱 결제를 검증할 수 없습니다." };
  }
  const path =
    input.provider === "app_store"
      ? "/api/iap/apple/verify"
      : "/api/iap/google/verify";
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  const data = (await res.json()) as IapVerifyApiResponse & { error?: string };
  if (!res.ok) {
    return { error: data.error ?? "결제 검증에 실패했습니다." };
  }
  return data;
}

/** @deprecated use verifyIapOnServer */
export async function verifyGoogleIapOnServer(input: {
  purchaseToken: string;
  productId: string;
  packageName?: string;
  orderId?: string;
}): Promise<IapVerifyApiResponse> {
  return verifyIapOnServer({ ...input, provider: "google_play" });
}
