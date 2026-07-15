import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMarketplaceOrderDetail } from "@/actions/marketplace-checkout";
import { MarketplaceOrderActions } from "@/components/market/marketplace-order-actions";
import { shipCountryLabel } from "@/lib/marketplace/shipping-config";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  PREPARING: "상품 준비 중",
  SHIPPED: "발송 완료",
  IN_CUSTOMS: "통관 중",
  IN_TRANSIT: "배송 중",
  DELIVERED: "배송 완료",
};

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
    "SETTLED",
  ];
  const stepLabels: Record<string, string> = {
    AWAITING_PAYMENT: "결제대기",
    PAID: "결제 완료",
    PREPARING: "상품 준비 중",
    SHIPPED: "발송 완료",
    DELIVERED: "배송 완료",
    CONFIRMED: "구매 확정",
    SETTLED: "정산 완료",
    CANCELLED: "취소",
    REFUND_REQUESTED: "환불요청",
    REFUNDED: "환불완료",
    DISPUTED: "분쟁",
    ADMIN_REVIEW: "관리자 검토",
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
          <p className="font-semibold">배송 정보</p>
          <p>
            배송사: {order.shipment.carrier ?? "-"}
            {order.shipment.carrierCode ? ` (${order.shipment.carrierCode})` : ""}
          </p>
          <p>송장번호: {order.shipment.trackingNumber ?? "-"}</p>
          <p className="text-xs text-muted-foreground">
            배송 상태:{" "}
            {SHIPMENT_STATUS_LABEL[order.shipment.status] ?? order.shipment.status}
          </p>
          {(order.shipment.proofUrls?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {order.shipment.proofUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="h-16 w-16 rounded object-cover border" />
                </a>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground pt-1">
            MoCoMo는 배송을 대행하지 않으며, 판매자가 입력한 정보를 표시합니다.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border/60 p-3 text-sm space-y-1">
        <p className="font-semibold">에스크로 · 정산</p>
        <p>
          {order.settlementStatus}
          {order.escrowHeld ? " · 보관 중" : " · 해제됨"}
          {order.settledAt ? ` · ${order.settledAt.toISOString().slice(0, 10)}` : ""}
        </p>
        {order.settlementHeldReason && (
          <p className="text-xs text-amber-700">{order.settlementHeldReason}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          구매 확정(또는 자동 확정) 이후에만 판매자에게 정산됩니다. 정산 완료 전 출금 불가.
        </p>
      </div>

      {(order.shipName || order.shipAddress1) && (
        <div className="rounded-xl border border-border/60 p-3 text-sm space-y-1">
          <p className="font-semibold">배송지</p>
          <p>
            {order.shipName} ·{" "}
            {order.shipCountry ? shipCountryLabel(order.shipCountry) : "-"}{" "}
            {order.shipPostal}
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
