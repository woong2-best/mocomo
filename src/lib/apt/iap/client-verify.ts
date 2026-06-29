import type { EconomySnapshot } from "@/lib/apt/economy/types";

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
export async function verifyGoogleIapOnServer(input: {
  purchaseToken: string;
  productId: string;
  packageName?: string;
  orderId?: string;
}): Promise<IapVerifyApiResponse> {
  const res = await fetch("/api/iap/google/verify", {
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
