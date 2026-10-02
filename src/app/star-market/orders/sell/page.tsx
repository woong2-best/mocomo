import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMySellOrders } from "@/actions/goods-shop";
import { SellerOrderActions } from "@/components/market/seller-order-actions";
import { formatUsd } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Paid · preparing shipment",
  PREPARING: "Getting ready",
  SHIPPED: "In transit",
  DELIVERED: "Done.",
};

export default async function SellOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/market/orders/sell");

  const orders = await getMySellOrders().catch(() => []);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-2 text-sm">
        <Link href="/market/orders" className="text-muted-foreground hover:text-primary">
          ← 구매 내역
        </Link>
        <span className="font-semibold text-primary">Sales & shipping</span>
      </div>
      <p className="text-xs text-muted-foreground">You receive 90% of the sale (10% platform fee).</p>
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border/60 p-4 space-y-3">
              <div className="flex justify-between">
                <p className="font-semibold text-sm">{o.items[0]?.product.title}</p>
                <span className="text-xs">{STATUS_LABEL[o.status] ?? o.status}</span>
              </div>
              <p className="text-sm">
                @{o.buyer.username} · {formatUsd(o.total)} (정산 {formatUsd(o.sellerAmount)})
              </p>
              <p className="text-xs text-muted-foreground">
                {o.recipientName} / {o.phone} / {o.zipCode} {o.address} {o.detailAddress}
              </p>
              {o.status === "PAID" || o.status === "PREPARING" || o.status === "SHIPPED" ? (
                <SellerOrderActions orderId={o.id} status={o.status} trackingNo={o.trackingNo} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
