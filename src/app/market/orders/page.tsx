import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyBuyOrders } from "@/actions/goods-shop";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "결제 대기",
  PAID: "결제 완료",
  PREPARING: "준비 중",
  SHIPPED: "배송 중",
  DELIVERED: "배송 완료",
  CANCELLED: "취소",
};

export default async function BuyOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/market/orders");

  const orders = await getMyBuyOrders().catch(() => []);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-2 text-sm">
        <span className="font-semibold text-primary">구매 내역</span>
        <Link href="/market/orders/sell" className="text-muted-foreground hover:text-primary">
          판매 관리 →
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">구매 내역이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border/60 p-4">
              <div className="flex justify-between gap-2">
                <p className="font-semibold text-sm">{o.items[0]?.product.title ?? "굿즈"}</p>
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[o.status] ?? o.status}</span>
              </div>
              <p className="text-neon-cyan font-bold mt-1">{o.total.toLocaleString()}원</p>
              <p className="text-xs text-muted-foreground mt-2">
                {o.recipientName} · {o.address}
              </p>
              {o.trackingNo && (
                <p className="text-xs mt-1">운송장: {o.trackingNo}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
