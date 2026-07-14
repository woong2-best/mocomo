import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMarketplaceOrderDetail } from "@/actions/marketplace-checkout";
import { MarketplaceOrderActions } from "@/components/market/marketplace-order-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MarketOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const order = await getMarketplaceOrderDetail(id);
  if (!order) notFound();

  const steps = [
    "AWAITING_PAYMENT",
    "PAID",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
    "CONFIRMED",
  ];
  const stepLabels: Record<string, string> = {
    AWAITING_PAYMENT: "결제대기",
    PAID: "결제완료",
    PREPARING: "상품준비",
    SHIPPED: "배송중",
    DELIVERED: "배송완료",
    CONFIRMED: "구매확정",
    CANCELLED: "취소",
    REFUND_REQUESTED: "환불요청",
    REFUNDED: "환불완료",
    DISPUTED: "분쟁",
  };

  return (
    <div className="space-y-6">
      <Link href="/market/orders" className="text-xs text-muted-foreground hover:text-foreground">
        ← 주문 목록
      </Link>
      <div>
        <h1 className="text-xl font-bold">주문 상세</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stepLabels[order.status] ?? order.status} ·{" "}
          {(order.subtotalAmount + order.shippingAmount).toLocaleString()}원
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <span
            key={s}
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              order.status === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {stepLabels[s]}
          </span>
        ))}
      </div>

      <ul className="space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="rounded-xl border border-border/60 p-3">
            <Link href={`/market/i/${item.listingId}`} className="font-medium hover:underline">
              {item.titleSnapshot}
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              {item.unitPrice.toLocaleString()}원 × {item.quantity} · {item.listingType}
            </p>
          </li>
        ))}
      </ul>

      {order.shipment && (
        <div className="rounded-xl border border-border/60 p-3 text-sm space-y-1">
          <p className="font-semibold">배송 추적</p>
          <p>
            {order.shipment.carrier ?? "-"} · {order.shipment.trackingNumber ?? "-"}
          </p>
          <p className="text-xs text-muted-foreground">{order.shipment.status}</p>
        </div>
      )}

      {(order.shipName || order.shipAddress1) && (
        <div className="rounded-xl border border-border/60 p-3 text-sm space-y-1">
          <p className="font-semibold">배송지</p>
          <p>
            {order.shipName} · {order.shipCountry} {order.shipPostal}
          </p>
          <p>
            {order.shipAddress1} {order.shipAddress2}
          </p>
          <p className="text-xs text-muted-foreground">{order.shipPhone}</p>
        </div>
      )}

      <MarketplaceOrderActions order={order} />
    </div>
  );
}
