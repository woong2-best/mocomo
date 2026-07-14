import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { autoConfirmMarketplaceOrdersBatch } from "@/lib/marketplace/fulfillment";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 배송완료 후 7일 자동 구매확정 */
export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await autoConfirmMarketplaceOrdersBatch();
  return NextResponse.json({ ok: true, ...result });
}
