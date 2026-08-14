import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { listMyMarketplaceOrdersForUser } from "@/actions/marketplace-checkout";
import { listRecentBuyerOrdersForUser } from "@/lib/marketplace/mobile-market-hub";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-orders", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "notification" });
  if ("error" in auth) return auth.error;

  const role = req.nextUrl.searchParams.get("role") === "seller" ? "seller" : "buyer";
  const summary = req.nextUrl.searchParams.get("summary") === "1";

  if (summary && role === "buyer") {
    const recent = await listRecentBuyerOrdersForUser(auth.user.id, 8);
    return NextResponse.json({ orders: recent });
  }

  const orders = await listMyMarketplaceOrdersForUser(auth.user.id, role);

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      subtotalAmount: o.subtotalAmount,
      shippingAmount: o.shippingAmount,
      createdAt: o.createdAt.toISOString(),
      buyer: o.buyer,
      seller: o.seller,
      title: o.items[0]?.titleSnapshot ?? "주문",
      items: o.items.map((i) => ({
        title: i.titleSnapshot,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        listingId: i.listingId,
      })),
    })),
  });
}
