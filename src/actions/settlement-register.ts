"use server";

import { requireAuth } from "@/lib/auth";
import { getCreatorSettlementStatusForUser } from "@/lib/settlement-register-service";

/** @deprecated Custom Connect 제거 — POST /api/settlements/connect-account 사용 */
export async function registerCreatorSettlement(_raw: unknown) {
  void _raw;
  return {
    error:
      "앱 내 계좌 직접 등록(Custom Connect)은 더 이상 지원하지 않습니다. Stripe Express 온보딩을 이용해 주세요.",
    code: "CUSTOM_CONNECT_DEPRECATED" as const,
  };
}

export async function getCreatorSettlementStatus() {
  const user = await requireAuth();
  return getCreatorSettlementStatusForUser(user.id);
}
