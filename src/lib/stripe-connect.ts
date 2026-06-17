/** Stripe Connect 정산 — 키·온보딩 연동 전 스텁 */

export function isStripeConnectConfigured(): boolean {
  return !!process.env.STRIPE_CONNECT_CLIENT_ID?.trim();
}

export function stripeConnectStatus(accountId: string | null | undefined) {
  if (!accountId) {
    return {
      ready: false,
      message: "Stripe Connect 연동 후 크리에이터 정산이 가능합니다.",
    };
  }
  return {
    ready: true,
    message: "Connect 계정이 연결되어 있습니다. (출금은 Stripe 대시보드에서)",
  };
}
