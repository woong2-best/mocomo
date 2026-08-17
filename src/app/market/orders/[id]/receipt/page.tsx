import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMarketplaceOrderDetail } from "@/actions/marketplace-checkout";
import { PrintReceiptButton } from "@/components/market/print-receipt-button";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

/** 영수증 — 브라우저 인쇄로 PDF 저장. Stripe Tax는 후속 연동. */
export default async function MarketReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { id } = await params;
  const order = await getMarketplaceOrderDetail(id);
  if (!order) notFound();

  const total = order.subtotalAmount + order.shippingAmount;
  const issuedAt = new Date().toLocaleString("ko-KR");

  return (
    <div className="mx-auto max-w-xl space-y-4 p-8 print:p-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{MARKET_BRAND_FULL} 영수증</h1>
          <p className="text-sm text-muted-foreground">발행일시 {issuedAt}</p>
        </div>
        <PrintReceiptButton />
      </div>
      <hr />
      <p className="text-sm">
        주문번호 <strong>{order.id}</strong>
      </p>
      <p className="text-sm">
        구매자 @{order.buyer.username}
        {order.buyer.email ? ` · ${order.buyer.email}` : ""}
      </p>
      <p className="text-sm">판매자 @{order.seller.username}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2">항목</th>
            <th className="py-2 text-right">금액</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2">
                {item.titleSnapshot} × {item.quantity}
              </td>
              <td className="py-2 text-right">
                {formatUsd(item.unitPrice * item.quantity)}
              </td>
            </tr>
          ))}
          <tr className="border-b border-border/50">
            <td className="py-2">배송비</td>
            <td className="py-2 text-right">{formatUsd(order.shippingAmount)}</td>
          </tr>
          <tr>
            <td className="py-2 font-bold">합계</td>
            <td className="py-2 text-right font-bold">{formatUsd(total)}</td>
          </tr>
          <tr>
            <td className="py-2 text-xs text-muted-foreground">플랫폼 수수료(참고)</td>
            <td className="py-2 text-right text-xs text-muted-foreground">
              {formatUsd(order.platformFeeAmount)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">
        세금(VAT/GST/Sales Tax)은 Stripe Tax 연동 시 자동 계산됩니다.
      </p>
    </div>
  );
}
