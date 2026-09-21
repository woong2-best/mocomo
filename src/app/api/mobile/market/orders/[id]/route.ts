import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getMarketplaceOrderDetailForUser } from "@/actions/marketplace-checkout";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-market-order-detail", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "notification" });
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const order = await getMarketplaceOrderDetailForUser(id, auth.user.id);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      status: order.status,
      checkoutMode: order.checkoutMode,
      subtotalAmount: order.subtotalAmount,
      shippingAmount: order.shippingAmount,
      platformFeeAmount: order.platformFeeAmount,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      shipName: order.shipName,
      shipCountry: order.shipCountry,
      shipPostal: order.shipPostal,
      shipAddress1: order.shipAddress1,
      shipAddress2: order.shipAddress2,
      shipPhone: order.shipPhone,
      buyerNote: order.buyerNote,
      isBuyer: order.isBuyer,
      isSeller: order.isSeller,
      buyer: order.buyer,
      seller: order.seller,
      items: order.items.map((i) => ({
        id: i.id,
        listingId: i.listingId,
        titleSnapshot: i.titleSnapshot,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        listingType: i.listingType,
      })),
      shipment: order.shipment
        ? {
            status: order.shipment.status,
            carrier: order.shipment.carrier,
            trackingNumber: order.shipment.trackingNumber,
            updatedAt: order.shipment.updatedAt.toISOString(),
          }
        : null,
      downloads: order.downloads.map((d) => ({
        id: d.id,
        fileUrl: d.fileUrl,
        downloadToken: d.downloadToken,
      })),
    },
  });
}
