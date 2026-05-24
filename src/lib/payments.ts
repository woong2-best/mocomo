/** Toss Payments — TOSS_SECRET_KEY + NEXT_PUBLIC_TOSS_CLIENT_KEY 필요 */

export function isPaymentsConfigured(): boolean {
  return !!(
    process.env.TOSS_SECRET_KEY &&
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
  );
}

export function getTossClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null;
}

export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return { ok: false, message: "결제가 설정되지 않았습니다." };

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: err.message ?? "결제 승인에 실패했습니다." };
  }

  return { ok: true };
}

export const PREMIUM_PRICE = 4900;
