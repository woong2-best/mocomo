import { NextResponse } from "next/server";
import { getCachedCurrentUser } from "@/lib/auth";
import { fulfillIapPurchase } from "@/lib/apt/economy/iap/iap-fulfillment-pipeline";
import { seedShopProducts } from "@/lib/apt/economy/shop-product-service";
import { loadEconomySnapshot } from "@/lib/apt/economy/service";
import { mirrorEconomyToGameState } from "@/actions/apt-economy";

export const runtime = "nodejs";

type VerifyBody = {
  purchaseToken?: string;
  productId?: string;
  orderId?: string;
  receipt?: string;
};

/** App Store IAP 서버 검증 */
export async function POST(req: Request) {
  const user = await getCachedCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { purchaseToken, productId, orderId, receipt } = body;
  if (!purchaseToken || !productId) {
    return NextResponse.json(
      { error: "purchaseToken과 productId가 필요합니다." },
      { status: 400 }
    );
  }

  await seedShopProducts();
  const res = await fulfillIapPurchase(user.id, {
    provider: "app_store",
    productId,
    purchaseToken,
    orderId,
    receipt,
  });

  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 422 });
  }

  if ("alreadyFulfilled" in res && res.alreadyFulfilled) {
    const economy = await loadEconomySnapshot(user.id);
    return NextResponse.json({
      ok: true,
      alreadyFulfilled: true,
      orderId: res.orderId,
      correlationId: res.correlationId,
      economy,
    });
  }

  if (!("gemsGranted" in res)) {
    return NextResponse.json({ error: "결제 처리 실패" }, { status: 500 });
  }

  await mirrorEconomyToGameState(user.id);
  const economy = await loadEconomySnapshot(user.id);

  return NextResponse.json({
    ok: true,
    orderId: res.orderId,
    purchaseId: res.purchaseId,
    gemsGranted: res.gemsGranted,
    goldGranted: res.goldGranted,
    correlationId: res.correlationId,
    economy,
  });
}
